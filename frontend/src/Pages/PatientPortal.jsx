import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  MdMedicalServices, MdReceipt, MdScience,
  MdCalendarToday, MdAccountBalance, MdPictureAsPdf,
  MdCheckCircle, MdWarning, MdPhone, MdEmail,
  MdExpandMore, MdExpandLess,
} from 'react-icons/md';
import { generateInvoicePDF } from '../utils/invoicePDF';
import API from '../utils/api';

/* ── helpers ── */
const PKR     = (n) => `₨ ${Number(n || 0).toLocaleString('en-PK')}`;
const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—';
const fmtDateTime = (d) => d
  ? new Date(d).toLocaleString('en-PK', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  : '—';

const STATUS_COLOR = {
  Paid:    { bg: '#d1fae5', color: '#065f46', label: 'Paid' },
  Partial: { bg: '#fef3c7', color: '#92400e', label: 'Partial' },
  Pending: { bg: '#fee2e2', color: '#991b1b', label: 'Pending' },
};

/* ── Collapsible section ── */
function Section({ title, icon, count, children, defaultOpen = false, accentColor = '#0ea5e9' }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 16, overflow: 'hidden', marginBottom: 16 }}>
      <button
        onClick={() => setOpen(p => !p)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', background: open ? accentColor + '08' : '#fff',
          border: 'none', cursor: 'pointer', fontFamily: 'inherit',
          borderBottom: open ? `1px solid ${accentColor}20` : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: accentColor + '15', color: accentColor,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
          }}>
            {icon}
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>{title}</div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>{count}</div>
          </div>
        </div>
        <div style={{ color: '#94a3b8' }}>
          {open ? <MdExpandLess size={22} /> : <MdExpandMore size={22} />}
        </div>
      </button>
      {open && <div style={{ padding: '16px 20px', background: '#fff' }}>{children}</div>}
    </div>
  );
}

/* ═══════════════════════════════════════════
   BILLS SECTION
═══════════════════════════════════════════ */
function BillsSection({ bills, token }) {
  const [downloading, setDownloading] = useState('');

  const handleDownload = async (bill) => {
    setDownloading(bill._id);
    try {
      const { data } = await fetch(`/api/portal/${token}/bill/${bill._id}`)
        .then(r => r.json());
      if (!data.bill) throw new Error('Not found');
      generateInvoicePDF(data.bill);
    } catch {
      // Fallback — generate from existing bill data
      generateInvoicePDF(bill);
    } finally { setDownloading(''); }
  };

  if (bills.length === 0)
    return <div style={{ color: '#94a3b8', fontSize: 14, textAlign: 'center', padding: '20px 0' }}>No invoices found</div>;

  const totalBilled      = bills.reduce((s, b) => s + b.totalAmount, 0);
  const totalPaid        = bills.reduce((s, b) => s + b.amountPaid,  0);
  const totalOutstanding = totalBilled - totalPaid;

  return (
    <div>
      {/* Summary row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Total Billed',  value: PKR(totalBilled),      color: '#0f172a' },
          { label: 'Amount Paid',   value: PKR(totalPaid),         color: '#065f46' },
          { label: 'Outstanding',   value: PKR(totalOutstanding),  color: totalOutstanding > 0 ? '#991b1b' : '#065f46' },
        ].map((s, i) => (
          <div key={i} style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Bills list */}
      {bills.map(bill => {
        const sc = STATUS_COLOR[bill.paymentStatus] || STATUS_COLOR.Pending;
        const balance = bill.totalAmount - bill.amountPaid;
        return (
          <div key={bill._id} style={{
            border: '1px solid #e2e8f0', borderRadius: 12,
            padding: '14px 16px', marginBottom: 10,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div>
                <div style={{ fontWeight: 700, color: '#0ea5e9', fontSize: 15 }}>{bill.billNumber}</div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{fmtDate(bill.createdAt)}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ background: sc.bg, color: sc.color, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99 }}>
                  {sc.label}
                </span>
                <button
                  onClick={() => handleDownload(bill)}
                  disabled={downloading === bill._id}
                  style={{
                    background: '#0ea5e9', color: '#fff',
                    border: 'none', borderRadius: 8,
                    padding: '6px 12px', fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                    fontFamily: 'inherit',
                  }}
                >
                  <MdPictureAsPdf size={14} />
                  {downloading === bill._id ? '...' : 'PDF'}
                </button>
              </div>
            </div>

            {/* Items */}
            <div style={{ marginTop: 10, borderTop: '1px solid #f1f5f9', paddingTop: 10 }}>
              {bill.items?.slice(0, 3).map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span style={{ color: '#475569' }}>{item.medicineName} × {item.quantity}</span>
                  <span style={{ fontWeight: 600 }}>{PKR(item.totalPrice)}</span>
                </div>
              ))}
              {bill.items?.length > 3 && (
                <div style={{ fontSize: 12, color: '#94a3b8' }}>+{bill.items.length - 3} more items</div>
              )}
            </div>

            {/* Totals */}
            <div style={{ marginTop: 10, borderTop: '1px solid #f1f5f9', paddingTop: 10, display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 13 }}>
                <span style={{ color: '#94a3b8' }}>Total: </span>
                <strong>{PKR(bill.totalAmount)}</strong>
              </div>
              <div style={{ fontSize: 13 }}>
                <span style={{ color: '#94a3b8' }}>Paid: </span>
                <strong style={{ color: '#065f46' }}>{PKR(bill.amountPaid)}</strong>
              </div>
              {balance > 0 && (
                <div style={{ fontSize: 13 }}>
                  <span style={{ color: '#94a3b8' }}>Due: </span>
                  <strong style={{ color: '#991b1b' }}>{PKR(balance)}</strong>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════
   PRESCRIPTIONS SECTION
═══════════════════════════════════════════ */
function PrescriptionsSection({ prescriptions }) {
  if (prescriptions.length === 0)
    return <div style={{ color: '#94a3b8', fontSize: 14, textAlign: 'center', padding: '20px 0' }}>No prescriptions found</div>;

  return (
    <div>
      {prescriptions.map(rx => (
        <div key={rx._id} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: '14px 16px', marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <div>
              <div style={{ fontWeight: 700, color: '#0ea5e9', fontSize: 14 }}>{rx.rxNumber}</div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>
                Dr. {rx.doctorName} · {fmtDate(rx.createdAt)}
              </div>
            </div>
            <span style={{
              padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700,
              background: rx.status === 'Dispensed' ? '#d1fae5' : rx.status === 'Active' ? '#dbeafe' : '#fee2e2',
              color:      rx.status === 'Dispensed' ? '#065f46' : rx.status === 'Active' ? '#1e40af' : '#991b1b',
            }}>
              {rx.status}
            </span>
          </div>

          {rx.diagnosis && (
            <div style={{ fontSize: 13, color: '#475569', marginBottom: 8 }}>
              <strong>Diagnosis:</strong> {rx.diagnosis}
            </div>
          )}

          {rx.items?.map((item, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between',
              fontSize: 13, padding: '6px 0',
              borderBottom: i < rx.items.length - 1 ? '1px solid #f8fafc' : 'none',
            }}>
              <div>
                <span style={{ fontWeight: 600 }}>{item.medicineName}</span>
                <span style={{ color: '#94a3b8', marginLeft: 8 }}>
                  {item.dosage} · {item.frequency} · {item.duration}
                </span>
              </div>
              <span style={{ color: '#475569' }}>Qty: {item.quantity}</span>
            </div>
          ))}

          {rx.notes && (
            <div style={{ marginTop: 8, fontSize: 12, color: '#64748b', fontStyle: 'italic' }}>
              Note: {rx.notes}
            </div>
          )}

          <div style={{ marginTop: 8, fontSize: 12, color: '#94a3b8' }}>
            Valid until: {fmtDate(rx.validUntil)}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════
   LAB TESTS SECTION
═══════════════════════════════════════════ */
function LabTestsSection({ labTests }) {
  if (labTests.length === 0)
    return <div style={{ color: '#94a3b8', fontSize: 14, textAlign: 'center', padding: '20px 0' }}>No lab tests found</div>;

  const INTERP_COLOR = {
    Normal:   { color: '#065f46', bg: '#d1fae5' },
    High:     { color: '#991b1b', bg: '#fee2e2' },
    Low:      { color: '#1e40af', bg: '#dbeafe' },
    Critical: { color: '#991b1b', bg: '#fee2e2' },
    Pending:  { color: '#64748b', bg: '#f1f5f9' },
  };

  return (
    <div>
      {labTests.map(test => {
        const ic = INTERP_COLOR[test.result?.interpretation || 'Pending'];
        return (
          <div key={test._id} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: '14px 16px', marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{test.testName}</div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>
                  {test.testCategory}
                  {test.orderedBy && ` · Dr. ${test.orderedBy}`}
                  {test.lab && ` · ${test.lab}`}
                  · {fmtDate(test.orderedDate)}
                </div>
              </div>
              <span style={{ background: ic.bg, color: ic.color, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99 }}>
                {test.result?.interpretation || test.status}
              </span>
            </div>

            {/* Single result */}
            {test.result?.value && (
              <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 12px', marginTop: 8 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 20, fontWeight: 800, color: ic.color }}>
                    {test.result.value} {test.result.unit}
                  </span>
                  {test.result.normalRange && (
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>Normal: {test.result.normalRange}</span>
                  )}
                </div>
                {test.result.notes && (
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 4, fontStyle: 'italic' }}>{test.result.notes}</div>
                )}
              </div>
            )}

            {/* Panel results */}
            {test.resultRows?.length > 0 && (
              <div style={{ marginTop: 8, overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: '#64748b', fontSize: 11, textTransform: 'uppercase' }}>Parameter</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#64748b', fontSize: 11, textTransform: 'uppercase' }}>Value</th>
                      <th style={{ padding: '8px 10px', fontWeight: 700, color: '#64748b', fontSize: 11, textTransform: 'uppercase' }}>Unit</th>
                      <th style={{ padding: '8px 10px', fontWeight: 700, color: '#64748b', fontSize: 11, textTransform: 'uppercase' }}>Normal Range</th>
                      <th style={{ padding: '8px 10px', fontWeight: 700, color: '#64748b', fontSize: 11, textTransform: 'uppercase' }}>Flag</th>
                    </tr>
                  </thead>
                  <tbody>
                    {test.resultRows.map((r, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '7px 10px', fontWeight: 600 }}>{r.parameter}</td>
                        <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 700, color: r.flag ? (r.flag.includes('H') ? '#991b1b' : '#1e40af') : '#0f172a' }}>{r.value || '—'}</td>
                        <td style={{ padding: '7px 10px', color: '#94a3b8' }}>{r.unit}</td>
                        <td style={{ padding: '7px 10px', color: '#94a3b8' }}>{r.normalRange}</td>
                        <td style={{ padding: '7px 10px', fontWeight: 800, color: r.flag ? (r.flag.includes('H') ? '#991b1b' : '#1e40af') : '#94a3b8' }}>{r.flag || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Cloudinary file link */}
            {test.file?.url && (
              <a href={test.file.url} target="_blank" rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  marginTop: 10, fontSize: 13, fontWeight: 600,
                  color: '#0ea5e9', textDecoration: 'none',
                }}>
                <MdPictureAsPdf size={16} /> View Result File
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════
   APPOINTMENTS SECTION
═══════════════════════════════════════════ */
function AppointmentsSection({ appointments }) {
  if (appointments.length === 0)
    return <div style={{ color: '#94a3b8', fontSize: 14, textAlign: 'center', padding: '20px 0' }}>No appointments found</div>;

  return (
    <div>
      {appointments.map(a => (
        <div key={a._id} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: '14px 16px', marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{a.type}</div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>
                Dr. {a.doctorName} · {fmtDate(a.date)} {a.timeSlot && `at ${a.timeSlot}`}
              </div>
            </div>
            <span style={{
              padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700,
              background: a.status === 'Completed' ? '#d1fae5' : a.status === 'Scheduled' ? '#dbeafe' : '#fee2e2',
              color:      a.status === 'Completed' ? '#065f46' : a.status === 'Scheduled' ? '#1e40af' : '#991b1b',
            }}>
              {a.status}
            </span>
          </div>

          {a.diagnosis && (
            <div style={{ fontSize: 13, color: '#475569', marginBottom: 6 }}>
              <strong>Diagnosis:</strong> {a.diagnosis}
            </div>
          )}

          {a.visitNotes && (
            <div style={{ fontSize: 13, color: '#475569', marginBottom: 6 }}>
              <strong>Notes:</strong> {a.visitNotes}
            </div>
          )}

          {/* Vital signs */}
          {a.vitalSigns && Object.values(a.vitalSigns).some(Boolean) && (
            <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 12px', marginTop: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>Vitals</div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {[
                  { label: 'BP',    value: a.vitalSigns.bp          },
                  { label: 'Pulse', value: a.vitalSigns.pulse ? `${a.vitalSigns.pulse} bpm` : null },
                  { label: 'Temp',  value: a.vitalSigns.temperature ? `${a.vitalSigns.temperature}°F` : null },
                  { label: 'Wt',    value: a.vitalSigns.weight ? `${a.vitalSigns.weight} kg` : null },
                  { label: 'Sugar', value: a.vitalSigns.sugar ? `${a.vitalSigns.sugar} mg/dL` : null },
                ].filter(v => v.value).map(v => (
                  <div key={v.label} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>{v.value}</div>
                    <div style={{ fontSize: 10, color: '#94a3b8' }}>{v.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {a.followUpDate && (
            <div style={{ marginTop: 8, fontSize: 12, color: '#0ea5e9', fontWeight: 600 }}>
              📅 Follow-up: {fmtDate(a.followUpDate)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN PORTAL PAGE
═══════════════════════════════════════════ */
export default function PatientPortal() {
  const { token }   = useParams();
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  useEffect(() => {
    if (!token) { setError('No portal token'); setLoading(false); return; }

    fetch(`/api/portal/${token}`)
      .then(r => r.json())
      .then(d => {
        if (!d.success) { setError(d.message || 'Invalid link'); return; }
        setData(d);
      })
      .catch(() => setError('Failed to load portal'))
      .finally(() => setLoading(false));
  }, [token]);

  /* ── Loading ── */
  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>💊</div>
        <div style={{ fontWeight: 800, fontSize: 20, color: '#0f172a' }}>Loading your records...</div>
      </div>
    </div>
  );

  /* ── Error ── */
  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: 20, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🔗</div>
        <div style={{ fontWeight: 800, fontSize: 22, color: '#0f172a', marginBottom: 8 }}>Link Not Found</div>
        <div style={{ color: '#64748b', fontSize: 14, lineHeight: 1.7 }}>
          This portal link is invalid, expired, or has been disabled.<br />
          Please contact your pharmacy for a new link.
        </div>
      </div>
    </div>
  );

  const { patient, bills, prescriptions, labTests, appointments, store } = data;
  const totalOutstanding = Math.max(0, patient.totalBilled - patient.totalPaid);

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* ── Header ── */}
      <div style={{ background: '#0f172a', padding: '0 20px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>
              Medi<span style={{ color: '#0ea5e9' }}>Store</span>
            </div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, textTransform: 'uppercase', letterSpacing: 1 }}>
              Patient Portal
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 700, color: '#fff', fontSize: 14 }}>{store.name}</div>
            {store.phone && <div style={{ fontSize: 12, color: '#64748b' }}>{store.phone}</div>}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 20px 60px' }}>

        {/* Patient card */}
        <div style={{
          background: '#fff', borderRadius: 20, padding: 24,
          border: '1px solid #e2e8f0', marginBottom: 20,
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            {/* Avatar */}
            <div style={{
              width: 60, height: 60, borderRadius: '50%',
              background: '#e0f2fe', color: '#0ea5e9',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: 22, flexShrink: 0,
            }}>
              {patient.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 20, color: '#0f172a', marginBottom: 4 }}>
                {patient.name}
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 13, color: '#64748b' }}>
                <span>{patient.patientId}</span>
                {patient.age   && <span>Age {patient.age}</span>}
                {patient.gender&& <span>{patient.gender}</span>}
                {patient.bloodGroup && patient.bloodGroup !== 'Unknown' && (
                  <span style={{ background: '#fee2e2', color: '#991b1b', padding: '1px 8px', borderRadius: 99, fontWeight: 600 }}>
                    {patient.bloodGroup}
                  </span>
                )}
              </div>
              {patient.city && (
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>{patient.city}</div>
              )}
            </div>
          </div>

          {/* Outstanding balance banner */}
          {totalOutstanding > 0 && (
            <div style={{
              marginTop: 16, padding: '12px 16px',
              background: '#fff7ed', border: '1px solid #fed7aa',
              borderRadius: 12, display: 'flex',
              alignItems: 'center', gap: 10,
            }}>
              <MdWarning size={20} style={{ color: '#d97706', flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 700, color: '#92400e', fontSize: 14 }}>
                  Outstanding Balance: {PKR(totalOutstanding)}
                </div>
                <div style={{ fontSize: 12, color: '#b45309' }}>
                  Please contact {store.name} to clear your balance.
                  {store.phone && ` Call us at ${store.phone}.`}
                </div>
              </div>
            </div>
          )}

          {totalOutstanding === 0 && patient.totalBilled > 0 && (
            <div style={{
              marginTop: 16, padding: '10px 14px',
              background: '#f0fdf4', border: '1px solid #86efac',
              borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <MdCheckCircle size={18} style={{ color: '#16a34a' }} />
              <span style={{ fontWeight: 600, color: '#15803d', fontSize: 13 }}>
                All payments cleared — Thank you!
              </span>
            </div>
          )}

          {/* Medical info */}
          {(patient.allergies?.length > 0 || patient.medicalHistory) && (
            <div style={{ marginTop: 16, borderTop: '1px solid #f1f5f9', paddingTop: 14 }}>
              {patient.allergies?.length > 0 && (
                <div style={{ marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>Allergies: </span>
                  {patient.allergies.map(a => (
                    <span key={a} style={{ background: '#fee2e2', color: '#991b1b', fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 99, marginLeft: 4 }}>{a}</span>
                  ))}
                </div>
              )}
              {patient.medicalHistory && (
                <div style={{ fontSize: 13, color: '#64748b' }}>
                  <span style={{ fontWeight: 700 }}>History:</span> {patient.medicalHistory}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Invoices',      value: bills.length,          icon: '🧾', color: '#0ea5e9' },
            { label: 'Prescriptions', value: prescriptions.length,  icon: '💊', color: '#8b5cf6' },
            { label: 'Lab Tests',     value: labTests.length,       icon: '🔬', color: '#10b981' },
            { label: 'Visits',        value: appointments.length,   icon: '📅', color: '#f59e0b' },
          ].map((s, i) => (
            <div key={i} style={{
              background: '#fff', border: '1px solid #e2e8f0',
              borderRadius: 14, padding: '14px 10px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 22, marginBottom: 4 }}>{s.icon}</div>
              <div style={{ fontWeight: 800, fontSize: 18, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#94a3b8' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Collapsible sections */}
        <Section
          title="Bills & Invoices"
          icon={<MdReceipt />}
          count={`${bills.length} invoice${bills.length !== 1 ? 's' : ''}${totalOutstanding > 0 ? ` · ${PKR(totalOutstanding)} outstanding` : ' · All cleared'}`}
          accentColor="#0ea5e9"
          defaultOpen={totalOutstanding > 0}
        >
          <BillsSection bills={bills} token={token} />
        </Section>

        <Section
          title="Prescriptions"
          icon={<MdMedicalServices />}
          count={`${prescriptions.length} prescription${prescriptions.length !== 1 ? 's' : ''}`}
          accentColor="#8b5cf6"
          defaultOpen={false}
        >
          <PrescriptionsSection prescriptions={prescriptions} />
        </Section>

        <Section
          title="Lab Tests"
          icon={<MdScience />}
          count={`${labTests.length} test${labTests.length !== 1 ? 's' : ''}`}
          accentColor="#10b981"
          defaultOpen={false}
        >
          <LabTestsSection labTests={labTests} />
        </Section>

        <Section
          title="Appointment History"
          icon={<MdCalendarToday />}
          count={`${appointments.length} visit${appointments.length !== 1 ? 's' : ''}`}
          accentColor="#f59e0b"
          defaultOpen={false}
        >
          <AppointmentsSection appointments={appointments} />
        </Section>

        {/* Footer */}
        <div style={{ marginTop: 32, textAlign: 'center', color: '#94a3b8', fontSize: 12, lineHeight: 2 }}>
          <div style={{ fontWeight: 700, color: '#64748b', marginBottom: 4 }}>{store.name}</div>
          {store.phone && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <MdPhone size={13} /> {store.phone}
            </div>
          )}
          {store.email && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <MdEmail size={13} /> {store.email}
            </div>
          )}
          <div style={{ marginTop: 12 }}>
            This is a read-only view of your medical records.<br />
            Powered by <strong style={{ color: '#0ea5e9' }}>MediStore</strong>
          </div>
        </div>
      </div>
    </div>
  );
}