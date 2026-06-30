// import { useState, useEffect } from 'react';
import { useState, useEffect } from 'react';
import {
  MdWarning, MdError, MdCheckCircle, MdPictureAsPdf, MdDownload, MdSwapHoriz
} from 'react-icons/md';
import toast from 'react-hot-toast';
import API from '../utils/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import SubstitutesPanel from '../Components/SubstitutesPanel';

/* ─────────────────────────────────────────
   PDF helpers
───────────────────────────────────────── */
const PKR = (n) => `Rs. ${Number(n || 0).toLocaleString('en-PK')}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const daysUntil = (d) => Math.ceil((new Date(d) - new Date()) / 86400000);

function buildPDF({ title, subtitle, badgeLabel, badgeColor, medicines, reportType }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const now = new Date();

  /* ── Header band ── */
  doc.setFillColor(...badgeColor);
  doc.rect(0, 0, pw, 36, 'F');

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('MediStore', 14, 14);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Professional Medicine Store Management System', 14, 20);

  // Badge top-right
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(pw - 54, 8, 42, 10, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...badgeColor);
  doc.text(badgeLabel.toUpperCase(), pw - 33, 14.5, { align: 'center' });

  // Generated timestamp
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 255, 255);
  doc.text(
    `Generated: ${fmtDate(now)} ${now.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}`,
    pw - 14, 28, { align: 'right' }
  );

  /* ── Report title ── */
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, 48);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(subtitle, 14, 55);

  /* ── Summary stats box ── */
  const totalStock = medicines.reduce((s, m) => s + (m.stock || 0), 0);
  const totalValue = medicines.reduce((s, m) => s + (m.salePrice || 0) * (m.stock || 0), 0);

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 60, pw - 28, 20, 2, 2, 'FD');

  const statsX = [14, 65, 116];
  const statsLabel = ['Total Medicines', 'Total Units in Stock', 'Estimated Value at Risk'];
  const statsVal = [String(medicines.length), String(totalStock) + ' units', PKR(totalValue)];

  statsX.forEach((x, i) => {
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(statsLabel[i], x + 2, 67);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...badgeColor);
    doc.text(statsVal[i], x + 2, 75);
  });

  /* ── Table ── */
  const columns = [
    { header: '#', dataKey: 'no' },
    { header: 'Medicine Name', dataKey: 'name' },
    { header: 'Generic', dataKey: 'generic' },
    { header: 'Form / Strength', dataKey: 'form' },
    { header: 'Batch', dataKey: 'batch' },
    { header: 'Stock', dataKey: 'stock' },
    { header: 'Sale Price', dataKey: 'price' },
    { header: 'Expiry Date', dataKey: 'expiry' },
    { header: reportType === 'expired' ? 'Expired' : 'Days Left', dataKey: 'status' },
  ];

  const rows = medicines.map((m, i) => {
    const days = daysUntil(m.expiryDate);
    return {
      no: String(i + 1),
      name: m.name || '—',
      generic: m.genericName || '—',
      form: `${m.dosageForm || ''}${m.strength ? ' ' + m.strength : ''}`,
      batch: m.batchNumber || '—',
      stock: `${m.stock} ${m.unit || ''}`,
      price: PKR(m.salePrice),
      expiry: fmtDate(m.expiryDate),
      status: reportType === 'expired'
        ? `${Math.abs(days)}d ago`
        : `${days} days`,
    };
  });

  autoTable(doc, {
    startY: 85,
    head: [columns.map(c => c.header)],
    body: rows.map(r => columns.map(c => r[c.dataKey])),
    styles: {
      fontSize: 8,
      cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
      font: 'helvetica',
      textColor: [40, 40, 40],
    },
    headStyles: {
      fillColor: badgeColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 38 },
      2: { cellWidth: 28 },
      3: { cellWidth: 24 },
      4: { cellWidth: 18 },
      5: { cellWidth: 16, halign: 'center' },
      6: { cellWidth: 20, halign: 'right' },
      7: { cellWidth: 22, halign: 'center' },
      8: { cellWidth: 18, halign: 'center' },
    },
    didParseCell(data) {
      if (data.column.index === 8 && data.section === 'body') {
        if (reportType === 'expired') {
          data.cell.styles.textColor = [220, 38, 38];
          data.cell.styles.fontStyle = 'bold';
        } else {
          const d = parseInt(data.cell.raw);
          data.cell.styles.textColor = d <= 15 ? [220, 38, 38] : [180, 83, 9];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
    margin: { left: 14, right: 14 },
  });

  /* ── Footer every page ── */
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(14, ph - 12, pw - 14, ph - 12);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text('MediStore — Confidential Medical Document', 14, ph - 7);
    doc.text(`Page ${i} of ${totalPages}`, pw - 14, ph - 7, { align: 'right' });
  }

  /* ── Recommendation box ── */
  const finalY = doc.lastAutoTable.finalY + 8;
  if (finalY < ph - 40) {
    doc.setFillColor(
      reportType === 'expired' ? 254 : 255,
      reportType === 'expired' ? 226 : 243,
      reportType === 'expired' ? 226 : 199
    );
    doc.setDrawColor(...badgeColor);
    doc.roundedRect(14, finalY, pw - 28, 22, 2, 2, 'FD');
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...badgeColor);
    doc.text(
      reportType === 'expired' ? '⚠  Action Required' : '⚠  Warning — Immediate Attention Needed',
      18, finalY + 7
    );
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    const msg = reportType === 'expired'
      ? 'These medicines have passed their expiry date. Remove from dispensary immediately, quarantine for disposal, and update inventory records. Do NOT dispense to patients.'
      : 'These medicines will expire within 30 days. Review stock levels, reduce purchasing, and notify the pharmacist team immediately.';
    doc.text(doc.splitTextToSize(msg, pw - 36), 18, finalY + 14);
  }

  return doc;
}

/* ─────────────────────────────────────────
   Main Component
───────────────────────────────────────── */
export default function ExpiryAlerts() {
  const [data, setData] = useState({ expired: [], expiringSoon: [], expiringIn60: [] });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('expired');
  const [generatingPDF, setGeneratingPDF] = useState('');

  const [subsFor, setSubsFor] = useState(null); // medicine ID to show substitutes for

  useEffect(() => {
    API.get('/medicines/expiry-alerts')
      .then(({ data }) => { setData(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleDownloadPDF = (type) => {
    const configs = {
      expired: {
        medicines: data.expired,
        title: 'Expired Medicines Report',
        subtitle: `Medicines that have passed their expiry date — ${new Date().toLocaleDateString('en-PK', { dateStyle: 'full' })}`,
        badgeLabel: 'EXPIRED REPORT',
        badgeColor: [220, 38, 38],
        reportType: 'expired',
        filename: `MediStore_Expired_Medicines_${new Date().toISOString().slice(0, 10)}.pdf`,
        emptyMsg: 'No expired medicines',
      },
      warning: {
        medicines: data.expiringSoon,
        title: 'Expiry Warning Report — Next 30 Days',
        subtitle: `Medicines expiring within 30 days — ${new Date().toLocaleDateString('en-PK', { dateStyle: 'full' })}`,
        badgeLabel: 'WARNING REPORT',
        badgeColor: [180, 83, 9],
        reportType: 'warning',
        filename: `MediStore_Expiry_Warning_${new Date().toISOString().slice(0, 10)}.pdf`,
        emptyMsg: 'No medicines expiring soon',
      },
      notice: {
        medicines: data.expiringIn60,
        title: 'Expiry Notice Report — Next 60 Days',
        subtitle: `Medicines expiring within 31–60 days — ${new Date().toLocaleDateString('en-PK', { dateStyle: 'full' })}`,
        badgeLabel: 'NOTICE REPORT',
        badgeColor: [2, 132, 199],
        reportType: 'notice',
        filename: `MediStore_Expiry_Notice_${new Date().toISOString().slice(0, 10)}.pdf`,
        emptyMsg: 'No medicines in this range',
      },
    };

    const cfg = configs[type];
    if (!cfg) return;
    if (cfg.medicines.length === 0) { toast(cfg.emptyMsg, { icon: 'ℹ️' }); return; }

    setGeneratingPDF(type);
    try {
      const doc = buildPDF(cfg);
      doc.save(cfg.filename);
      toast.success(`PDF downloaded — ${cfg.medicines.length} medicines`);
    } catch (err) {
      toast.error('PDF generation failed');
      console.error(err);
    } finally {
      setGeneratingPDF('');
    }
  };

  const tabs = [
    { id: 'expired', label: 'Expired', count: data.expired.length, cls: 'badge-danger', icon: <MdError />, pdfType: 'expired' },
    { id: 'expiringSoon', label: 'Expiring in 30 Days', count: data.expiringSoon.length, cls: 'badge-warning', icon: <MdWarning />, pdfType: 'warning' },
    { id: 'expiringIn60', label: 'Expiring in 60 Days', count: data.expiringIn60.length, cls: 'badge-info', icon: <MdCheckCircle />, pdfType: 'notice' },
  ];

  const current = data[tab] || [];
  const activeTab = tabs.find(t => t.id === tab);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Expiry Alerts</h1>
          <p>Monitor medicine expiry dates and generate official reports</p>
        </div>
      </div>

      {data.expired.length > 0 && (
        <div className="alert alert-danger">
          <MdError size={20} />
          <div className="alert-text">
            <strong>Urgent: {data.expired.length} medicines have expired!</strong>
            Remove them from inventory immediately to prevent patient harm.
          </div>
        </div>
      )}

      {/* Tabs + PDF buttons */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div className="flex gap-3" style={{ flexWrap: 'wrap' }}>
          {tabs.map(t => (
            <button key={t.id} className={`pill${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
              {t.icon}
              <span>{t.label}</span>
              <span className={`badge ${t.cls}`} style={{ marginLeft: 6 }}>{t.count}</span>
            </button>
          ))}
        </div>

        <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
          <button
            className="btn btn-danger btn-sm"
            onClick={() => handleDownloadPDF('expired')}
            disabled={generatingPDF === 'expired' || data.expired.length === 0}
          >
            <MdPictureAsPdf size={16} />
            {generatingPDF === 'expired' ? 'Generating...' : `Expired PDF (${data.expired.length})`}
          </button>

          <button
            className="btn btn-sm"
            style={{ background: 'var(--warning)', color: '#fff' }}
            onClick={() => handleDownloadPDF('warning')}
            disabled={generatingPDF === 'warning' || data.expiringSoon.length === 0}
          >
            <MdPictureAsPdf size={16} />
            {generatingPDF === 'warning' ? 'Generating...' : `Warning PDF (${data.expiringSoon.length})`}
          </button>

          <button
            className="btn btn-secondary btn-sm"
            onClick={() => handleDownloadPDF('notice')}
            disabled={generatingPDF === 'notice' || data.expiringIn60.length === 0}
          >
            <MdDownload size={16} />
            {generatingPDF === 'notice' ? 'Generating...' : `Notice PDF (${data.expiringIn60.length})`}
          </button>
        </div>
      </div>

      {/* CTA banner for active tab */}
      {!loading && current.length > 0 && (
        <div style={{
          background: 'var(--bg-secondary)', border: '1px dashed var(--border)',
          borderRadius: 12, padding: '14px 18px', marginBottom: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 12, flexWrap: 'wrap',
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
              📄 Download Official PDF Report for this section
            </div>
            <div className="text-muted text-sm" style={{ marginTop: 3 }}>
              Includes {current.length} medicines · Summary stats · Action recommendations · Printable A4 format
            </div>
          </div>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => handleDownloadPDF(activeTab?.pdfType)}
            disabled={!!generatingPDF}
          >
            <MdPictureAsPdf size={16} />
            {generatingPDF === activeTab?.pdfType ? 'Generating PDF...' : `Download ${activeTab?.label} Report`}
          </button>
        </div>
      )}

      {/* Table */}
      <div className="card">
        {loading ? (
          <div className="flex-center" style={{ height: 200 }}>
            <div className="text-muted">Loading...</div>
          </div>
        ) : current.length === 0 ? (
          <div className="empty-state">
            <MdCheckCircle size={52} style={{ opacity: 0.3, marginBottom: 16 }} />
            <h3>No medicines in this category</h3>
            <p>All medicines are within safe date ranges</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Medicine</th>
                  <th>Category</th>
                  <th>Batch</th>
                  <th>Stock</th>
                  <th>Sale Price</th>
                  <th>Value at Risk</th>
                  <th>Expiry Date</th>
                  <th>Status</th>
                  <th>Alternatives</th>
                </tr>
              </thead>
              <tbody>
                {current.map((m, idx) => {
                  const days = daysUntil(m.expiryDate);
                  const valueAtRisk = (m.salePrice || 0) * (m.stock || 0);
                  return (
                    <tr key={m._id}>
                      <td style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{idx + 1}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{m.name}</div>
                        <div className="text-muted text-sm">{m.genericName} · {m.dosageForm} {m.strength}</div>
                        {m.manufacturer && <div className="text-muted text-sm">{m.manufacturer}</div>}
                      </td>
                      <td><span className="badge badge-default">{m.category}</span></td>
                      <td className="text-sm" style={{ fontFamily: 'monospace' }}>{m.batchNumber || '—'}</td>
                      <td>
                        <span style={{ fontWeight: 700 }}>{m.stock}</span>
                        <span className="text-muted text-sm"> {m.unit}</span>
                      </td>
                      <td>₨ {m.salePrice?.toLocaleString()}</td>
                      <td>
                        <span style={{ color: 'var(--danger)', fontWeight: 700 }}>
                          ₨ {valueAtRisk.toLocaleString()}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600, color: days < 0 ? 'var(--danger)' : days <= 30 ? 'var(--warning)' : 'var(--text-primary)' }}>
                        {fmtDate(m.expiryDate)}
                      </td>
                      <td>
                        {days < 0
                          ? <span className="badge badge-danger">Expired {Math.abs(days)}d ago</span>
                          : <span className="badge badge-warning">In {days} days</span>}
                      </td>
                      <td>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setSubsFor(subsFor === m._id ? null : m._id)}
                        >
                          <MdSwapHoriz size={14} /> {subsFor === m._id ? 'Hide' : 'View'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {subsFor && (
              <div style={{ marginTop: 16 }}>
                <SubstitutesPanel medicineId={subsFor} compact />
              </div>
            )}
          </div>
        )}

        {current.length > 0 && (
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div className="text-sm"><span className="text-muted">Total medicines: </span><strong>{current.length}</strong></div>
            <div className="text-sm"><span className="text-muted">Total units: </span><strong>{current.reduce((s, m) => s + (m.stock || 0), 0)}</strong></div>
            <div className="text-sm"><span className="text-muted">Value at risk: </span>
              <strong style={{ color: 'var(--danger)' }}>
                ₨ {current.reduce((s, m) => s + (m.salePrice || 0) * (m.stock || 0), 0).toLocaleString()}
              </strong>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


// import { MdWarning, MdError, MdCheckCircle } from 'react-icons/md';
// import API from '../utils/api';

// export default function ExpiryAlerts() {
//   const [data, setData] = useState({ expired: [], expiringSoon: [], expiringIn60: [] });
//   const [loading, setLoading] = useState(true);
//   const [tab, setTab] = useState('expired');

//   useEffect(() => {
//     API.get('/medicines/expiry-alerts').then(({ data }) => { setData(data); setLoading(false); }).catch(() => setLoading(false));
//   }, []);

//   const tabs = [
//     { id: 'expired', label: 'Expired', count: data.expired.length, icon: <MdError />, cls: 'badge-danger' },
//     { id: 'expiringSoon', label: 'Expiring in 30 Days', count: data.expiringSoon.length, icon: <MdWarning />, cls: 'badge-warning' },
//     { id: 'expiringIn60', label: 'Expiring in 60 Days', count: data.expiringIn60.length, icon: <MdCheckCircle />, cls: 'badge-info' },
//   ];

//   const current = data[tab] || [];
//   const daysUntil = (d) => Math.ceil((new Date(d) - new Date()) / 86400000);

//   return (
//     <div>
//       <div className="page-header">
//         <div className="page-header-left">
//           <h1>Expiry Alerts</h1>
//           <p>Monitor medicine expiry dates and take action</p>
//         </div>
//       </div>

//       {data.expired.length > 0 && (
//         <div className="alert alert-danger">
//           <MdError size={20} />
//           <div className="alert-text"><strong>Urgent: {data.expired.length} medicines have expired!</strong>Remove them from inventory immediately to prevent patient harm.</div>
//         </div>
//       )}

//       <div className="flex gap-3" style={{ marginBottom:20 }}>
//         {tabs.map(t => (
//           <button key={t.id} className={`pill${tab===t.id?' active':''}`} onClick={() => setTab(t.id)}>
//             {t.icon}<span>{t.label}</span><span className={`badge ${t.cls}`} style={{ marginLeft:6 }}>{t.count}</span>
//           </button>
//         ))}
//       </div>

//       <div className="card">
//         {loading ? <div className="flex-center" style={{ height:200 }}><div className="text-muted">Loading...</div></div>
//         : current.length === 0 ? <div className="empty-state"><MdCheckCircle size={52} style={{ opacity:0.3 }} /><h3>No medicines in this category</h3><p>All medicines are within safe date ranges</p></div>
//         : (
//           <div className="table-container">
//             <table>
//               <thead><tr><th>Medicine</th><th>Category</th><th>Batch</th><th>Stock</th><th>Sale Price</th><th>Expiry Date</th><th>Status</th></tr></thead>
//               <tbody>
//                 {current.map(m => {
//                   const days = daysUntil(m.expiryDate);
//                   return (
//                     <tr key={m._id}>
//                       <td>
//                         <div style={{ fontWeight:600 }}>{m.name}</div>
//                         <div className="text-muted text-sm">{m.genericName} · {m.dosageForm} {m.strength}</div>
//                       </td>
//                       <td><span className="badge badge-default">{m.category}</span></td>
//                       <td className="text-sm">{m.batchNumber||'—'}</td>
//                       <td><span className="fw-semibold">{m.stock} {m.unit}</span></td>
//                       <td>₨ {m.salePrice?.toLocaleString()}</td>
//                       <td className="fw-semibold" style={{ color: days < 0 ? 'var(--danger)' : days <= 30 ? 'var(--warning)' : 'var(--text-primary)' }}>
//                         {new Date(m.expiryDate).toLocaleDateString('en-PK')}
//                       </td>
//                       <td>
//                         {days < 0
//                           ? <span className="badge badge-danger" >Expired {Math.abs(days)}d ago</span>
//                           : <span className="badge badge-warning">In {days} days</span>}
//                       </td>
//                     </tr>
//                   );
//                 })}
//               </tbody>
//             </table>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }
