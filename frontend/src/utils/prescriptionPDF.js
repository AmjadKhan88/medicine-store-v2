import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getStoreProfile } from './invoicePDF';

const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—';

export function printPrescriptionPDF(prescription) {
  const store      = getStoreProfile();
  const storeName  = store.name     || 'MediStore Pharmacy';
  const storeAddr  = store.address  || '';
  const storePhone = store.phone    || '';
  const doctorName = prescription.doctorName || store.doctor || 'Doctor';
  const license    = store.license  || '';

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
  const pw  = doc.internal.pageSize.getWidth();   // A5 = 148mm
  const ph  = doc.internal.pageSize.getHeight();  // A5 = 210mm

  const DARK   = [15, 23, 42];
  const BLUE   = [14, 165, 233];
  const GRAY   = [100, 116, 139];
  const LIGHT  = [248, 250, 252];
  const BORDER = [226, 232, 240];

  /* ── Header ── */
  doc.setFillColor(...DARK);
  doc.rect(0, 0, pw, 38, 'F');

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(storeName, 12, 13);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BLUE);
  const subLine = [storeAddr, storePhone].filter(Boolean).join('  ·  ');
  if (subLine) doc.text(subLine, 12, 19);

  if (license) {
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(7.5);
    doc.text(`License: ${license}`, 12, 25);
  }

  // Rx badge top-right
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(pw - 38, 8, 28, 22, 3, 3, 'F');
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text('Rx', pw - 24, 23, { align: 'center' });

  /* ── Doctor + Rx Info row ── */
  let y = 46;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text(`Dr. ${doctorName}`, 12, y);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY);
  doc.text(`Prescription No: `, pw - 12, y, { align: 'right' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BLUE);
  // Print Rx number right-aligned
  const rxText = prescription.rxNumber || '—';
  doc.text(rxText, pw - 12, y + 5, { align: 'right' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY);
  doc.text(`Date: ${fmtDate(prescription.createdAt || Date.now())}`, pw - 12, y + 10, { align: 'right' });
  doc.text(`Valid Until: ${fmtDate(prescription.validUntil)}`, pw - 12, y + 15, { align: 'right' });

  /* ── Divider ── */
  y += 20;
  doc.setDrawColor(...BORDER);
  doc.line(12, y, pw - 12, y);
  y += 6;

  /* ── Patient box ── */
  doc.setFillColor(...LIGHT);
  doc.setDrawColor(...BORDER);
  doc.roundedRect(12, y, pw - 24, 22, 2, 2, 'FD');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...GRAY);
  doc.text('PATIENT', 16, y + 6);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text(prescription.patientName || '—', 16, y + 13);

  // Patient details on right side
  const p = prescription.patient || {};
  const patDetails = [
    p.age     ? `Age: ${p.age}`            : null,
    p.gender  ? p.gender                   : null,
    p.patientId                            ? `ID: ${p.patientId}` : null,
  ].filter(Boolean).join('  ·  ');

  if (patDetails) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    doc.text(patDetails, pw - 16, y + 13, { align: 'right' });
  }

  if (prescription.diagnosis) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...GRAY);
    doc.text(`Diagnosis: ${prescription.diagnosis}`, 16, y + 19);
  }

  y += 28;

  /* ── Medicines table ── */
  const columns = ['#', 'Medicine', 'Dosage', 'Frequency', 'Duration', 'Qty', 'Instructions'];

  const rows = (prescription.items || []).map((item, i) => [
    String(i + 1),
    item.medicineName || '—',
    item.dosage       || '—',
    item.frequency    || '—',
    item.duration     || '—',
    String(item.quantity),
    item.instructions || '',
  ]);

  autoTable(doc, {
    startY:   y,
    head:     [columns],
    body:     rows,
    styles: {
      fontSize:    7.5,
      cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
      font:        'helvetica',
      textColor:   [...DARK],
    },
    headStyles: {
      fillColor: [...DARK],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize:  7,
    },
    alternateRowStyles: { fillColor: [...LIGHT] },
    columnStyles: {
      0: { cellWidth: 7,  halign: 'center' },
      1: { cellWidth: 32 },
      2: { cellWidth: 18 },
      3: { cellWidth: 22 },
      4: { cellWidth: 18 },
      5: { cellWidth: 10, halign: 'center' },
      6: { cellWidth: 28 },
    },
    margin: { left: 12, right: 12 },
  });

  /* ── Notes ── */
  const finalY = doc.lastAutoTable.finalY + 6;

  if (prescription.notes) {
    doc.setFillColor(254, 243, 199);
    doc.setDrawColor(245, 158, 11);
    doc.roundedRect(12, finalY, pw - 24, 16, 2, 2, 'FD');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(146, 64, 14);
    doc.text('Doctor\'s Notes:', 16, finalY + 6);
    doc.setFont('helvetica', 'normal');
    const noteLines = doc.splitTextToSize(prescription.notes, pw - 40);
    doc.text(noteLines, 16, finalY + 11);
  }

  /* ── Signature line ── */
  const sigY = ph - 30;
  doc.setDrawColor(...BORDER);
  doc.line(pw - 62, sigY, pw - 12, sigY);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY);
  doc.text(`Dr. ${doctorName}`, pw - 37, sigY + 5, { align: 'center' });
  doc.text('Signature & Stamp', pw - 37, sigY + 10, { align: 'center' });

  /* ── Footer ── */
  doc.setDrawColor(...BORDER);
  doc.line(12, ph - 14, pw - 12, ph - 14);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 180, 180);
  doc.text(`${storeName}${storePhone ? '  ·  ' + storePhone : ''}`, pw / 2, ph - 9, { align: 'center' });
  doc.text(`Generated by MediStore  ·  ${rxText}`, pw / 2, ph - 5, { align: 'center' });

  doc.save(`Prescription_${rxText}_${prescription.patientName?.replace(/\s+/g,'_')}.pdf`);
}