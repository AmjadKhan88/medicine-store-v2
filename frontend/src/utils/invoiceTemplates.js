import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/* ═══════════════════════════════════════════════
   SHARED HELPERS
═══════════════════════════════════════════════ */
const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—';

const PKR = (n) => `Rs. ${Number(n || 0).toLocaleString('en-PK')}`;

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function getStoreProfile() {
  try { return JSON.parse(localStorage.getItem('medistore_profile')) || {}; } catch { return {}; }
}

function getInvoiceSettings() {
  try { return JSON.parse(localStorage.getItem('medistore_invoice_settings')) || {}; } catch { return {}; }
}

/* ── Load image as base64 for jsPDF ── */
async function loadImageBase64(url) {
  try {
    const resp = await fetch(url);
    const blob = await resp.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
}

/* ═══════════════════════════════════════════════
   TEMPLATE 1 — DETAILED (A4)
   Full letterhead, colour header, logo, table
═══════════════════════════════════════════════ */
export async function printDetailedInvoice(bill) {
  const store    = getStoreProfile();
  const cfg      = getInvoiceSettings();
  const ACCENT   = hexToRgb(cfg.accentColor || '#0ea5e9');
  const DARK     = hexToRgb(cfg.darkColor    || '#0f172a');
  const GRAY     = [100, 116, 139];
  const LIGHT    = [248, 250, 252];
  const BORDER   = [226, 232, 240];

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pw  = doc.internal.pageSize.getWidth();

  /* ── Coloured header band ── */
  doc.setFillColor(...DARK);
  doc.rect(0, 0, pw, 42, 'F');

  /* ── Logo ── */
  let logoLoaded = false;
  if (cfg.showLogo && cfg.logo?.url) {
    try {
      const b64 = await loadImageBase64(cfg.logo.url);
      if (b64) {
        doc.addImage(b64, 'PNG', 14, 6, 28, 28);
        logoLoaded = true;
      }
    } catch {}
  }

  const textX = logoLoaded ? 48 : 14;

  /* ── Store name ── */
  if (cfg.showStoreName !== false) {
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(store.name || 'MediStore Pharmacy', textX, 16);
  }

  /* ── Sub-info ── */
  let subParts = [];
  if (cfg.showDoctorName !== false && store.doctor) subParts.push(store.doctor);
  if (cfg.showPhone      !== false && store.phone)  subParts.push(store.phone);
  if (cfg.showEmail      && store.email)             subParts.push(store.email);

  if (subParts.length) {
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...ACCENT);
    doc.text(subParts.join('  ·  '), textX, 23);
  }

  let subParts2 = [];
  if (cfg.showAddress       !== false && store.address) subParts2.push(store.address);
  if (cfg.showLicenseNumber !== false && store.license) subParts2.push(`Lic: ${store.license}`);

  if (subParts2.length) {
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(subParts2.join('  ·  '), textX, 29);
  }

  /* ── INVOICE badge ── */
  doc.setFillColor(...ACCENT);
  doc.roundedRect(pw - 46, 8, 32, 26, 3, 3, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('INVOICE', pw - 30, 18, { align: 'center' });
  doc.setFontSize(8);
  doc.text(bill.billNumber || '—', pw - 30, 25, { align: 'center' });

  let y = 50;

  /* ── Bill info row ── */
  const infoItems = [
    { label: 'Date',    value: fmtDate(bill.createdAt || Date.now()) },
    { label: 'Patient', value: bill.patientName || '—' },
    { label: 'Status',  value: bill.paymentStatus || '—' },
  ];
  if (cfg.showPatientId && bill.patient?.patientId) {
    infoItems.splice(2, 0, { label: 'Patient ID', value: bill.patient.patientId });
  }

  const colW = (pw - 28) / infoItems.length;
  infoItems.forEach((item, i) => {
    const x = 14 + i * colW;
    doc.setFillColor(...LIGHT);
    doc.roundedRect(x, y, colW - 4, 18, 2, 2, 'F');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    doc.text(item.label.toUpperCase(), x + 4, y + 6);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    doc.text(String(item.value), x + 4, y + 14);
  });

  y += 24;

  /* ── Items table ── */
  const rows = (bill.items || []).map((item, idx) => {
    const row = [
      String(idx + 1),
      item.medicineName || '—',
      String(item.quantity),
      PKR(item.unitPrice),
      PKR(item.totalPrice),
    ];
    if (cfg.showGenericName && item.genericName) row[1] += `\n(${item.genericName})`;
    return row;
  });

  autoTable(doc, {
    startY:  y,
    head:    [['#', 'Medicine', 'Qty', 'Unit Price', 'Total']],
    body:    rows,
    theme:   'plain',
    styles: {
      fontSize:    9,
      cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
      textColor:   [...DARK],
    },
    headStyles: {
      fillColor:   [...DARK],
      textColor:   [255, 255, 255],
      fontStyle:   'bold',
      fontSize:    8.5,
    },
    alternateRowStyles: { fillColor: [...LIGHT] },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 16, halign: 'center' },
      3: { cellWidth: 28, halign: 'right' },
      4: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: 14, right: 14 },
    didDrawPage: () => {},
  });

  y = doc.lastAutoTable.finalY + 6;

  /* ── Totals block ── */
  const totalsX = pw - 80;
  const totalsW = 66;

  doc.setDrawColor(...BORDER);
  doc.setFillColor(...LIGHT);
  doc.roundedRect(totalsX, y, totalsW, 52, 3, 3, 'FD');

  const totalLines = [];
  if (bill.subtotal && bill.subtotal !== bill.totalAmount) {
    totalLines.push({ label: 'Subtotal', value: PKR(bill.subtotal), bold: false });
  }
  if (cfg.showDiscount && bill.discount > 0) {
    totalLines.push({ label: `Discount`, value: `- ${PKR(bill.discount)}`, color: [22, 163, 74], bold: false });
  }
  if (cfg.showTax && bill.tax > 0) {
    totalLines.push({ label: 'Tax', value: PKR(bill.tax), bold: false });
  }
  totalLines.push({ label: 'Total', value: PKR(bill.totalAmount), bold: true, accent: true });
  totalLines.push({ label: 'Amount Paid', value: PKR(bill.amountPaid), color: [22, 163, 74], bold: false });

  const balance = (bill.totalAmount || 0) - (bill.amountPaid || 0);
  if (balance > 0) {
    totalLines.push({ label: 'Balance Due', value: PKR(balance), color: [220, 38, 38], bold: true });
  }

  let ty = y + 8;
  totalLines.forEach(line => {
    doc.setFontSize(line.bold ? 10.5 : 9);
    doc.setFont('helvetica', line.bold ? 'bold' : 'normal');
    doc.setTextColor(...(line.color || DARK));
    doc.text(line.label, totalsX + 6, ty);
    doc.text(line.value, totalsX + totalsW - 4, ty, { align: 'right' });
    if (line.accent) {
      doc.setDrawColor(...ACCENT);
      doc.line(totalsX + 4, ty + 1.5, totalsX + totalsW - 4, ty + 1.5);
    }
    ty += 8;
  });

  /* ── Savings badge ── */
  if (cfg.showSavings && bill.discount > 0) {
    doc.setFillColor(220, 252, 231);
    doc.setDrawColor(134, 239, 172);
    doc.roundedRect(14, y, 70, 12, 2, 2, 'FD');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 163, 74);
    doc.text(`🎉 You saved ${PKR(bill.discount)} on this bill!`, 18, y + 8);
  }

  /* ── Footer ── */
  const footY = doc.internal.pageSize.getHeight() - 18;
  doc.setDrawColor(...BORDER);
  doc.line(14, footY - 4, pw - 14, footY - 4);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...GRAY);
  if (cfg.showFooterNote !== false) {
    doc.text(cfg.footerText || 'Thank you for your visit. Get well soon!', pw / 2, footY + 2, { align: 'center' });
  }
  if (cfg.showPoweredBy !== false) {
    doc.setFontSize(7);
    doc.setTextColor(180, 180, 180);
    doc.text(`${store.name || 'MediStore'} · ${store.phone || ''}`, pw / 2, footY + 8, { align: 'center' });
  }

  doc.save(`Invoice_${bill.billNumber}_${bill.patientName?.replace(/\s+/g, '_')}.pdf`);
}

/* ═══════════════════════════════════════════════
   TEMPLATE 2 — COMPACT (A4)
   Minimal whitespace, fits more items, clean lines
═══════════════════════════════════════════════ */
export async function printCompactInvoice(bill) {
  const store  = getStoreProfile();
  const cfg    = getInvoiceSettings();
  const ACCENT = hexToRgb(cfg.accentColor || '#0ea5e9');
  const DARK   = hexToRgb(cfg.darkColor    || '#0f172a');
  const GRAY   = [100, 116, 139];
  const LIGHT  = [248, 250, 252];

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pw  = doc.internal.pageSize.getWidth();

  /* ── Thin accent top bar ── */
  doc.setFillColor(...ACCENT);
  doc.rect(0, 0, pw, 5, 'F');

  let y = 12;

  /* ── Header: logo + store name side by side ── */
  let logoLoaded = false;
  if (cfg.showLogo && cfg.logo?.url) {
    try {
      const b64 = await loadImageBase64(cfg.logo.url);
      if (b64) { doc.addImage(b64, 'PNG', 14, y, 18, 18); logoLoaded = true; }
    } catch {}
  }

  const hx = logoLoaded ? 36 : 14;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text(store.name || 'MediStore Pharmacy', hx, y + 7);

  const subLine = [store.doctor, store.phone, store.address, store.license ? `Lic: ${store.license}` : null]
    .filter(Boolean).join('  ·  ');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY);
  doc.text(subLine, hx, y + 13);

  /* ── Invoice # right aligned ── */
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...ACCENT);
  doc.text(bill.billNumber || '', pw - 14, y + 5, { align: 'right' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY);
  doc.text(fmtDate(bill.createdAt || Date.now()), pw - 14, y + 11, { align: 'right' });
  doc.text(bill.patientName || '', pw - 14, y + 17, { align: 'right' });

  y += 24;
  doc.setDrawColor(...ACCENT);
  doc.setLineWidth(0.4);
  doc.line(14, y, pw - 14, y);
  y += 5;

  /* ── Items table (compact) ── */
  autoTable(doc, {
    startY: y,
    head:   [['Medicine', 'Qty', 'Price', 'Total']],
    body:   (bill.items || []).map(item => [
      item.medicineName || '—',
      String(item.quantity),
      PKR(item.unitPrice),
      PKR(item.totalPrice),
    ]),
    theme:  'plain',
    styles: { fontSize: 8.5, cellPadding: { top: 3, bottom: 3, left: 3, right: 3 }, textColor: [...DARK] },
    headStyles: {
      fillColor: [...LIGHT], textColor: [...GRAY],
      fontStyle: 'bold', fontSize: 8, lineColor: [...ACCENT], lineWidth: { bottom: 0.5 },
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 14, halign: 'center' },
      2: { cellWidth: 26, halign: 'right' },
      3: { cellWidth: 26, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: 14, right: 14 },
  });

  y = doc.lastAutoTable.finalY + 4;

  /* ── Compact totals ── */
  doc.setDrawColor(...ACCENT);
  doc.line(pw - 80, y, pw - 14, y);
  y += 5;

  [
    cfg.showDiscount && bill.discount > 0 && { l: 'Discount', v: `- ${PKR(bill.discount)}`, c: [22, 163, 74] },
    { l: 'Total',       v: PKR(bill.totalAmount), bold: true },
    { l: 'Paid',        v: PKR(bill.amountPaid),  c: [22, 163, 74] },
    (bill.totalAmount - bill.amountPaid) > 0 && { l: 'Balance', v: PKR(bill.totalAmount - bill.amountPaid), c: [220, 38, 38], bold: true },
  ].filter(Boolean).forEach(row => {
    doc.setFontSize(row.bold ? 10 : 8.5);
    doc.setFont('helvetica', row.bold ? 'bold' : 'normal');
    doc.setTextColor(...(row.c || DARK));
    doc.text(row.l, pw - 80, y);
    doc.text(row.v, pw - 14, y, { align: 'right' });
    y += 6;
  });

  /* ── Footer ── */
  doc.setFillColor(...ACCENT);
  doc.rect(0, doc.internal.pageSize.getHeight() - 8, pw, 8, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(255, 255, 255);
  doc.text(cfg.footerText || 'Thank you for your visit!', pw / 2, doc.internal.pageSize.getHeight() - 3, { align: 'center' });

  doc.save(`Invoice_${bill.billNumber}_${bill.patientName?.replace(/\s+/g, '_')}.pdf`);
}

/* ═══════════════════════════════════════════════
   TEMPLATE 3 — THERMAL 80mm
   80mm wide receipt for thermal printers
═══════════════════════════════════════════════ */
export async function printThermal80Invoice(bill) {
  const store  = getStoreProfile();
  const cfg    = getInvoiceSettings();
  const fs     = cfg.thermalFontSize  || 9;
  const ls     = cfg.thermalLineSpacing || 5;

  // 80mm = 80mm wide, auto height
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [80, 200] });
  const pw  = 80;
  let y     = 4;

  const center   = (text, yPos, size = fs, bold = false) => {
    doc.setFontSize(size);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(String(text), pw / 2, yPos, { align: 'center' });
  };
  const left    = (text, yPos, size = fs) => { doc.setFontSize(size); doc.setFont('helvetica', 'normal'); doc.setTextColor(50,50,50); doc.text(String(text), 4, yPos); };
  const right   = (text, yPos, size = fs, bold = false) => { doc.setFontSize(size); doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setTextColor(0,0,0); doc.text(String(text), pw - 4, yPos, { align: 'right' }); };
  const divider = (yPos, dashed = false) => {
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.2);
    if (dashed) {
      for (let x = 4; x < pw - 4; x += 3) doc.line(x, yPos, x + 1.5, yPos);
    } else {
      doc.line(4, yPos, pw - 4, yPos);
    }
  };

  /* ── Header ── */
  // Logo
  if (cfg.showLogo && cfg.logo?.url) {
    try {
      const b64 = await loadImageBase64(cfg.logo.url);
      if (b64) { doc.addImage(b64, 'PNG', pw/2 - 10, y, 20, 20); y += 22; }
    } catch {}
  }

  center(store.name || 'MediStore Pharmacy', y, fs + 2, true); y += ls + 1;
  if (store.doctor)  { center(store.doctor,  y, fs - 1); y += ls; }
  if (store.address) { center(store.address, y, fs - 1); y += ls; }
  if (store.phone)   { center(store.phone,   y, fs - 1); y += ls; }
  if (store.license) { center(`Lic: ${store.license}`, y, fs - 1); y += ls; }

  divider(y); y += 3;

  center('INVOICE', y, fs + 1, true); y += ls;
  center(bill.billNumber || '', y, fs - 1); y += ls;
  center(fmtDate(bill.createdAt || Date.now()), y, fs - 1); y += ls;

  divider(y, true); y += 3;

  left(`Patient: ${bill.patientName || '—'}`, y); y += ls;
  if (cfg.showPatientId && bill.patient?.patientId) {
    left(`ID: ${bill.patient.patientId}`, y); y += ls;
  }

  divider(y); y += 3;

  /* ── Items ── */
  doc.setFontSize(fs - 0.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  left('Medicine', y);
  right('Total', y);
  y += ls;
  divider(y, true); y += 2;

  (bill.items || []).forEach(item => {
    doc.setFontSize(fs - 0.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    // Medicine name (wrap if too long)
    const nameLines = doc.splitTextToSize(item.medicineName || '—', pw - 8);
    nameLines.forEach(line => { left(line, y, fs - 0.5); y += ls - 1; });

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    left(`  ${item.quantity} x Rs.${item.unitPrice?.toLocaleString()}`, y, fs - 1);
    right(PKR(item.totalPrice), y, fs - 0.5, true);
    y += ls;
  });

  divider(y); y += 3;

  /* ── Totals ── */
  if (cfg.showDiscount && bill.discount > 0) {
    left('Discount', y, fs); right(`-Rs.${bill.discount?.toLocaleString()}`, y, fs); y += ls;
  }
  doc.setFont('helvetica', 'bold');
  left('TOTAL', y, fs + 1); right(PKR(bill.totalAmount), y, fs + 1, true); y += ls + 1;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(22, 163, 74);
  left('Paid', y, fs); right(PKR(bill.amountPaid), y, fs); y += ls;

  const balance = (bill.totalAmount || 0) - (bill.amountPaid || 0);
  if (balance > 0) {
    doc.setTextColor(220, 38, 38);
    doc.setFont('helvetica', 'bold');
    left('Balance Due', y, fs); right(PKR(balance), y, fs, true); y += ls;
  }

  doc.setTextColor(0, 0, 0);
  divider(y); y += 3;

  /* ── Footer ── */
  center(cfg.footerText || 'Thank you! Get well soon.', y, fs - 1, true); y += ls;
  if (cfg.showPoweredBy !== false) {
    center('Powered by MediStore', y, fs - 2); y += ls;
  }

  // Resize page height to content
  doc.internal.pageSize.height = y + 4;

  doc.save(`Receipt_${bill.billNumber}_80mm.pdf`);
}

/* ═══════════════════════════════════════════════
   TEMPLATE 4 — THERMAL 58mm
   Narrow 58mm receipt (most common thermal printer)
═══════════════════════════════════════════════ */
export async function printThermal58Invoice(bill) {
  const store = getStoreProfile();
  const cfg   = getInvoiceSettings();
  const fs    = (cfg.thermalFontSize || 9) - 1;   // slightly smaller for 58mm
  const ls    = cfg.thermalLineSpacing || 5;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [58, 180] });
  const pw  = 58;
  let y     = 4;

  const center = (text, yPos, size = fs, bold = false) => {
    doc.setFontSize(size); doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(String(text), pw / 2, yPos, { align: 'center' });
  };
  const lr = (lText, rText, yPos, size = fs, rBold = false) => {
    doc.setFontSize(size); doc.setFont('helvetica', 'normal'); doc.setTextColor(50, 50, 50);
    doc.text(String(lText), 3, yPos);
    doc.setFont('helvetica', rBold ? 'bold' : 'normal'); doc.setTextColor(0, 0, 0);
    doc.text(String(rText), pw - 3, yPos, { align: 'right' });
  };
  const dashed = (yPos) => {
    doc.setDrawColor(160, 160, 160); doc.setLineWidth(0.15);
    for (let x = 3; x < pw - 3; x += 2.5) doc.line(x, yPos, x + 1.5, yPos);
  };

  /* ── Header ── */
  center(store.name || 'MediStore', y, fs + 2, true); y += ls + 1;
  if (store.phone) { center(store.phone, y, fs - 1); y += ls; }
  if (store.address) {
    const addrLines = doc.splitTextToSize(store.address, pw - 6);
    addrLines.forEach(l => { center(l, y, fs - 1.5); y += ls - 1; });
  }

  dashed(y); y += 2.5;
  center(bill.billNumber || '', y, fs, true); y += ls;
  center(fmtDate(bill.createdAt || Date.now()), y, fs - 1); y += ls;
  lr('Patient', bill.patientName || '—', y); y += ls;
  dashed(y); y += 2.5;

  /* ── Items ── */
  (bill.items || []).forEach(item => {
    const lines = doc.splitTextToSize(item.medicineName || '—', pw - 6);
    lines.forEach(l => { doc.setFontSize(fs); doc.setFont('helvetica', 'bold'); doc.setTextColor(0,0,0); doc.text(l, 3, y); y += ls - 1; });
    lr(`${item.quantity} x ${item.unitPrice?.toLocaleString()}`, `Rs.${item.totalPrice?.toLocaleString()}`, y, fs - 0.5, false);
    y += ls;
  });

  dashed(y); y += 2.5;

  /* ── Totals ── */
  if (cfg.showDiscount && bill.discount > 0) { lr('Disc', `-Rs.${bill.discount?.toLocaleString()}`, y, fs); y += ls; }
  lr('TOTAL', PKR(bill.totalAmount), y, fs + 0.5, true); y += ls;
  doc.setTextColor(22, 163, 74);
  lr('Paid', PKR(bill.amountPaid), y, fs); y += ls;
  const bal = (bill.totalAmount||0) - (bill.amountPaid||0);
  if (bal > 0) { doc.setTextColor(220, 38, 38); lr('Balance', PKR(bal), y, fs, true); y += ls; }
  doc.setTextColor(0, 0, 0);

  dashed(y); y += 2.5;
  center(cfg.footerText || 'Thank you!', y, fs - 1, true); y += ls;

  doc.internal.pageSize.height = y + 4;
  doc.save(`Receipt_${bill.billNumber}_58mm.pdf`);
}

/* ═══════════════════════════════════════════════
   MASTER FUNCTION — pick template from settings
═══════════════════════════════════════════════ */
export async function printInvoice(bill) {
  const cfg = getInvoiceSettings();
  switch (cfg.template || 'detailed') {
    case 'compact':   return printCompactInvoice(bill);
    case 'thermal80': return printThermal80Invoice(bill);
    case 'thermal58': return printThermal58Invoice(bill);
    default:          return printDetailedInvoice(bill);
  }
}