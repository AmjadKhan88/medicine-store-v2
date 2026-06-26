import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const PKR = (n) => `Rs. ${Number(n || 0).toLocaleString('en-PK')}`;
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export function getStoreProfile() {
  try {
    return JSON.parse(localStorage.getItem('medistore_profile')) || {};
  } catch {
    return {};
  }
}

export function generateInvoicePDF(bill) {
  const store = getStoreProfile();
  const storeName    = store.name     || 'MediStore Pharmacy';
  const storeAddress = store.address  || 'Peshawar, KPK, Pakistan';
  const storePhone   = store.phone    || '0300-0000000';
  const storeEmail   = store.email    || '';
  const storeLicense = store.license  || '';
  const doctorName   = store.doctor   || '';

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pw  = doc.internal.pageSize.getWidth();   // 210
  const ph  = doc.internal.pageSize.getHeight();  // 297

  const BLUE   = [14, 165, 233];
  const DARK   = [15, 23, 42];
  const GRAY   = [100, 116, 139];
  const LIGHT  = [248, 250, 252];
  const BORDER = [226, 232, 240];
  const GREEN  = [16, 185, 129];
  const RED    = [239, 68, 68];
  const ORANGE = [245, 158, 11];

  /* ═══════════════════════════════════════
     HEADER BAND
  ═══════════════════════════════════════ */
  doc.setFillColor(...DARK);
  doc.rect(0, 0, pw, 42, 'F');

  // Store name
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(storeName, 14, 16);

  // Store sub-info
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BLUE);
  const subLine = [storeAddress, storePhone, storeEmail].filter(Boolean).join('  •  ');
  doc.text(subLine, 14, 23);

  if (storeLicense) {
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(7.5);
    doc.text(`License: ${storeLicense}`, 14, 29);
  }

  if (doctorName) {
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(7.5);
    doc.text(`Dr. ${doctorName}`, 14, storeLicense ? 34 : 29);
  }

  // "INVOICE" badge — top right
  doc.setFillColor(...BLUE);
  doc.roundedRect(pw - 46, 8, 34, 14, 2, 2, 'F');
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('INVOICE', pw - 29, 17.5, { align: 'center' });

  /* ═══════════════════════════════════════
     INVOICE META ROW  (invoice # + date + status)
  ═══════════════════════════════════════ */
  let y = 52;

  // Invoice number box
  doc.setFillColor(...LIGHT);
  doc.setDrawColor(...BORDER);
  doc.roundedRect(14, y, 55, 18, 2, 2, 'FD');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY);
  doc.text('INVOICE NUMBER', 17, y + 6);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text(bill.billNumber || '—', 17, y + 13);

  // Date box
  doc.setFillColor(...LIGHT);
  doc.setDrawColor(...BORDER);
  doc.roundedRect(75, y, 55, 18, 2, 2, 'FD');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY);
  doc.text('DATE ISSUED', 78, y + 6);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text(fmtDate(bill.createdAt), 78, y + 13);

  // Payment status box
  const statusColor =
    bill.paymentStatus === 'Paid'    ? GREEN  :
    bill.paymentStatus === 'Partial' ? ORANGE : RED;

  doc.setFillColor(...statusColor);
  doc.roundedRect(136, y, 62, 18, 2, 2, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 255, 255);
  doc.text('PAYMENT STATUS', 139, y + 6);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(bill.paymentStatus?.toUpperCase() || 'PENDING', 139, y + 13);

  /* ═══════════════════════════════════════
     BILL TO  (Patient info)
  ═══════════════════════════════════════ */
  y += 26;

  doc.setFillColor(240, 249, 255);
  doc.setDrawColor(...BLUE);
  doc.roundedRect(14, y, pw - 28, 22, 2, 2, 'FD');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BLUE);
  doc.text('BILLED TO', 18, y + 7);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text(bill.patientName || '—', 18, y + 14);

  // Patient ID + phone on right
  if (bill.patient?.patientId || bill.patient?.phone) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    const patInfo = [bill.patient?.patientId, bill.patient?.phone].filter(Boolean).join('  •  ');
    doc.text(patInfo, pw - 16, y + 14, { align: 'right' });
  }

  if (bill.notes) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...GRAY);
    doc.text(`Note: ${bill.notes}`, 18, y + 20);
  }

  /* ═══════════════════════════════════════
     ITEMS TABLE
  ═══════════════════════════════════════ */
  y += 30;

  const items = bill.items || [];

  autoTable(doc, {
    startY: y,
    head: [['#', 'Medicine', 'Dosage / Notes', 'Qty', 'Unit Price', 'Total']],
    body: items.map((item, i) => [
      String(i + 1),
      item.medicineName || '—',
      '',                               // blank — room for doctor notes
      String(item.quantity),
      PKR(item.unitPrice),
      PKR(item.totalPrice),
    ]),
    styles: {
      fontSize: 9,
      font: 'helvetica',
      textColor: [...DARK],
      cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
    },
    headStyles: {
      fillColor: [...DARK],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
    },
    alternateRowStyles: { fillColor: [...LIGHT] },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center'  },
      1: { cellWidth: 62                    },
      2: { cellWidth: 48                    },
      3: { cellWidth: 14, halign: 'center'  },
      4: { cellWidth: 28, halign: 'right'   },
      5: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: 14, right: 14 },
    tableLineColor: [...BORDER],
    tableLineWidth: 0.3,
  });

  /* ═══════════════════════════════════════
     TOTALS SECTION
  ═══════════════════════════════════════ */
  let ty = doc.lastAutoTable.finalY + 6;

  // Left side — payment method info
  doc.setFillColor(...LIGHT);
  doc.setDrawColor(...BORDER);
  doc.roundedRect(14, ty, 80, bill.paymentMethod ? 28 : 20, 2, 2, 'FD');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...GRAY);
  doc.text('PAYMENT METHOD', 18, ty + 7);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text(bill.paymentMethod || 'Cash', 18, ty + 14);

  if (bill.createdBy?.name) {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    doc.text(`Processed by: ${bill.createdBy.name}`, 18, ty + 22);
  }

  // Right side — amounts
  const rightX = 110;
  const colLabel = rightX;
  const colValue = pw - 14;
  let rowY = ty;

  const drawAmountRow = (label, value, color = DARK, bold = false, bgColor = null) => {
    if (bgColor) {
      doc.setFillColor(...bgColor);
      doc.rect(rightX - 2, rowY - 4, pw - rightX + 2, 9, 'F');
    }
    doc.setFontSize(9);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setTextColor(...GRAY);
    doc.text(label, colLabel, rowY);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setTextColor(...color);
    doc.text(value, colValue, rowY, { align: 'right' });
    rowY += 8;
  };

  drawAmountRow('Subtotal', PKR(bill.subtotal));
  if (bill.discount > 0) drawAmountRow('Discount', `— ${PKR(bill.discount)}`, ORANGE);
  if (bill.tax > 0)      drawAmountRow('Tax / Extra', PKR(bill.tax), GRAY);

  // Divider
  doc.setDrawColor(...BORDER);
  doc.line(rightX, rowY - 2, pw - 14, rowY - 2);
  rowY += 2;

  drawAmountRow('TOTAL AMOUNT', PKR(bill.totalAmount), DARK, true);
  drawAmountRow('Amount Paid', PKR(bill.amountPaid), GREEN, true);

  const balance = (bill.totalAmount || 0) - (bill.amountPaid || 0);
  if (balance > 0) {
    drawAmountRow('Remaining Balance', PKR(balance), RED, true, [254, 226, 226]);
  } else {
    drawAmountRow('Balance Due', 'CLEARED ✓', GREEN, true, [209, 250, 229]);
  }

  /* ═══════════════════════════════════════
     OUTSTANDING ALERT BOX  (if unpaid)
  ═══════════════════════════════════════ */
  if (balance > 0) {
    const alertY = Math.max(ty + 40, rowY + 6);
    if (alertY < ph - 45) {
      doc.setFillColor(254, 243, 199);
      doc.setDrawColor(...ORANGE);
      doc.roundedRect(14, alertY, pw - 28, 14, 2, 2, 'FD');
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(180, 83, 9);
      doc.text(
        `⚠  Outstanding Balance: ${PKR(balance)}  —  Please clear payment at earliest convenience.`,
        pw / 2, alertY + 9, { align: 'center' }
      );
    }
  }

  /* ═══════════════════════════════════════
     FOOTER
  ═══════════════════════════════════════ */
  const footerY = ph - 18;
  doc.setDrawColor(...BORDER);
  doc.line(14, footerY - 4, pw - 14, footerY - 4);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY);
  doc.text('Thank you for your trust in our pharmacy. Get well soon! 💊', pw / 2, footerY, { align: 'center' });
  doc.setFontSize(7.5);
  doc.text(`${storeName}  •  ${storePhone}`, pw / 2, footerY + 5, { align: 'center' });
  doc.text(
    `Generated: ${new Date().toLocaleString('en-PK')}  •  ${bill.billNumber}`,
    pw / 2, footerY + 10, { align: 'center' }
  );

  return doc;
}