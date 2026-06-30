import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';
import { getStoreProfile } from './invoicePDF';

const PKR = (n) => `Rs. ${Number(n || 0).toLocaleString('en-PK')}`;
const fmtDate = (d) => new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });

/* ════════════════════════════════════
   CSV EXPORT
════════════════════════════════════ */
export function exportReportCSV(bills, dateRange) {
  const rows = bills.map(b => ({
    'Invoice Number':  b.billNumber,
    'Date':            fmtDate(b.createdAt),
    'Patient Name':    b.patientName,
    'Patient ID':      b.patient?.patientId || '',
    'Phone':           b.patient?.phone || '',
    'Subtotal':        b.subtotal,
    'Discount':        b.discount,
    'Tax':             b.tax,
    'Total Amount':    b.totalAmount,
    'Amount Paid':     b.amountPaid,
    'Outstanding':     b.totalAmount - b.amountPaid,
    'Payment Method':  b.paymentMethod,
    'Payment Status':  b.paymentStatus,
    'Items Count':     b.items?.length || 0,
    'Processed By':    b.createdBy?.name || '',
  }));

  const csv = Papa.unparse(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `Sales_Report_${fmtDate(dateRange.from).replace(/\s/g, '_')}_to_${fmtDate(dateRange.to).replace(/\s/g, '_')}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ════════════════════════════════════
   PDF EXPORT
════════════════════════════════════ */
export function exportReportPDF(reportData, bills, dateRange) {
  const store = getStoreProfile();
  const storeName = store.name || 'MediStore Pharmacy';

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();

  const DARK  = [15, 23, 42];
  const BLUE  = [14, 165, 233];
  const GRAY  = [100, 116, 139];
  const LIGHT = [248, 250, 252];
  const GREEN = [16, 185, 129];
  const RED   = [239, 68, 68];

  /* Header */
  doc.setFillColor(...DARK);
  doc.rect(0, 0, pw, 34, 'F');
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(storeName, 14, 14);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BLUE);
  doc.text('Sales & Revenue Report', 14, 21);

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(pw - 56, 8, 42, 16, 2, 2, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text('REPORT PERIOD', pw - 35, 13, { align: 'center' });
  doc.setFontSize(8);
  doc.text(`${fmtDate(dateRange.from)}`, pw - 35, 17.5, { align: 'center' });
  doc.text(`to ${fmtDate(dateRange.to)}`, pw - 35, 21.5, { align: 'center' });

  /* Summary stat boxes */
  let y = 42;
  const { summary } = reportData;
  const boxes = [
    { label: 'Total Bills',        value: String(summary.totalBills),        color: DARK  },
    { label: 'Total Revenue',      value: PKR(summary.totalRevenue),         color: DARK  },
    { label: 'Amount Collected',   value: PKR(summary.totalCollected),       color: GREEN },
    { label: 'Outstanding',        value: PKR(summary.totalOutstanding),     color: RED   },
  ];
  const boxW = (pw - 28 - 18) / 4;
  boxes.forEach((b, i) => {
    const x = 14 + i * (boxW + 6);
    doc.setFillColor(...LIGHT);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, y, boxW, 22, 2, 2, 'FD');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    doc.text(b.label, x + 4, y + 7);
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...b.color);
    const lines = doc.splitTextToSize(b.value, boxW - 8);
    doc.text(lines, x + 4, y + 15);
  });

  /* Top Patients table */
  y += 32;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text('Top Patients by Spending', 14, y);

  autoTable(doc, {
    startY: y + 4,
    head: [['#', 'Patient', 'Bills', 'Total Spent', 'Paid', 'Outstanding']],
    body: (reportData.topPatients || []).slice(0, 8).map((p, i) => [
      String(i + 1), p.patientName, String(p.billCount),
      PKR(p.totalSpent), PKR(p.totalPaid), PKR(p.outstanding),
    ]),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: BLUE, textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: LIGHT },
    margin: { left: 14, right: 14 },
  });

  /* Top Medicines table */
  y = doc.lastAutoTable.finalY + 10;
  if (y > ph - 70) { doc.addPage(); y = 20; }
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text('Top Selling Medicines', 14, y);

  autoTable(doc, {
    startY: y + 4,
    head: [['#', 'Medicine', 'Qty Sold', 'Revenue']],
    body: (reportData.topMedicines || []).slice(0, 8).map((m, i) => [
      String(i + 1), m._id, String(m.totalQty), PKR(m.totalRevenue),
    ]),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: LIGHT },
    margin: { left: 14, right: 14 },
  });

  /* All transactions table (new page) */
  doc.addPage();
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text('All Transactions', 14, 16);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY);
  doc.text(`${fmtDate(dateRange.from)} — ${fmtDate(dateRange.to)} (${bills.length} invoices)`, 14, 22);

  autoTable(doc, {
    startY: 28,
    head: [['Invoice #', 'Date', 'Patient', 'Total', 'Paid', 'Balance', 'Status']],
    body: bills.map(b => [
      b.billNumber,
      fmtDate(b.createdAt),
      b.patientName,
      PKR(b.totalAmount),
      PKR(b.amountPaid),
      PKR(b.totalAmount - b.amountPaid),
      b.paymentStatus,
    ]),
    styles: { fontSize: 7.5, cellPadding: 2.5 },
    headStyles: { fillColor: DARK, textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: LIGHT },
    margin: { left: 14, right: 14 },
    didParseCell(data) {
      if (data.column.index === 6 && data.section === 'body') {
        const status = data.cell.raw;
        data.cell.styles.textColor =
          status === 'Paid' ? GREEN : status === 'Partial' ? [180, 83, 9] : RED;
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  /* Footer on every page */
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(14, ph - 12, pw - 14, ph - 12);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text(`${storeName} — Sales Report`, 14, ph - 7);
    doc.text(`Page ${i} of ${totalPages}  ·  Generated ${new Date().toLocaleString('en-PK')}`, pw - 14, ph - 7, { align: 'right' });
  }

  doc.save(`Sales_Report_${fmtDate(dateRange.from).replace(/\s/g, '_')}_to_${fmtDate(dateRange.to).replace(/\s/g, '_')}.pdf`);
}