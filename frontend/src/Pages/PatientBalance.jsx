import { useState, useEffect } from 'react';
import { MdAccountBalance, MdSearch, MdPayment, MdWhatsapp } from 'react-icons/md';
import toast from 'react-hot-toast';
import API from '../utils/api';
import ShortLoader from '../Components/ShortLoader';


function buildWhatsAppURL(phone, message) {
  let cleaned = phone.replace(/[\s\-()]/g, '');
  if (cleaned.startsWith('0')) cleaned = '92' + cleaned.slice(1);
  if (cleaned.startsWith('+')) cleaned = cleaned.slice(1);
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
}

function buildMessage(patient) {
  const store = (() => {
    try { return JSON.parse(localStorage.getItem('medistore_profile')) || {}; }
    catch { return {}; }
  })();
  const storeName = store.name || 'MediStore Pharmacy';
  const date = new Date().toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });

  return `Assalam o Alaikum ${patient.name},

This is a payment reminder from *${storeName}*.

📋 *Account Summary (${date})*
- Patient ID: ${patient.patientId}
- Total Billed: ₨ ${Number(patient.totalBilled || 0).toLocaleString()}
- Amount Paid: ₨ ${Number(patient.totalPaid || 0).toLocaleString()}
- *Outstanding Balance: ₨ ${Number(patient.remainingBalance || 0).toLocaleString()}*

Kindly visit us to clear your balance at your earliest convenience.

JazakAllah Khair 🙏
${storeName}`;
}

function WhatsAppModal({ patient, onClose }) {
  const [phone, setPhone] = useState(patient.phone || '');
  const [message, setMessage] = useState(() => buildMessage(patient));

  const [sent, setSent] = useState(false);

  const handleSend = () => {
    if (!phone.trim()) { toast.error('Enter phone number'); return; }
    const url = buildWhatsAppURL(phone, message);
    window.open(url, '_blank', 'noopener,noreferrer');
    setSent(true);
    toast.success('WhatsApp opened!');
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 500 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MdWhatsapp size={22} style={{ color: '#16a34a' }} />
            </div>
            <div>
              <div className="modal-title">Send WhatsApp Reminder</div>
              <div className="text-muted text-sm">to {patient.name}</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>

        {/* Balance summary */}
        <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 700 }}>{patient.name}</div>
            <div className="text-muted text-sm">{patient.patientId}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'var(--danger)', fontWeight: 600 }}>OUTSTANDING</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--danger)' }}>
              ₨ {Number(patient.remainingBalance || 0).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Phone input */}
        <div className="form-group">
          <label className="form-label required">WhatsApp Number</label>
          <div className="input-group">
            <MdWhatsapp className="input-icon" style={{ color: '#16a34a' }} />
            <input className="form-control" value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="0300-1234567" />
          </div>
          <div className="form-hint">Pakistani format 03xx-xxxxxxx auto-converts to international</div>
        </div>

        {/* Message editor */}
        <div className="form-group">
          <div className="flex-between" style={{ marginBottom: 6 }}>
            <label className="form-label" style={{ marginBottom: 0 }}>Message</label>
            <button className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}
              onClick={() => setMessage(buildMessage(patient))}>
              Reset
            </button>
          </div>
          <textarea className="form-control" rows={10} value={message}
            onChange={e => setMessage(e.target.value)}
            style={{ fontSize: 13, lineHeight: 1.6 }} />
          <div className="form-hint">{message.length} characters — you can edit before sending</div>
        </div>

        {/* Info box */}
        <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#16a34a', display: 'flex', gap: 8 }}>
          <MdWhatsapp size={15} style={{ marginTop: 1, flexShrink: 0 }} />
          Opens WhatsApp Web with message pre-filled. You just press Send — nothing is sent automatically.
        </div>

        {sent && (
          <div className="alert alert-success" style={{ marginBottom: 12 }}>
            <div className="alert-text"><strong>WhatsApp opened!</strong> Complete sending in the WhatsApp window.</div>
          </div>
        )}

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
          <button
            onClick={handleSend}
            disabled={!phone.trim()}
            style={{
              background: phone.trim() ? '#16a34a' : '#86efac',
              color: '#fff', border: 'none', borderRadius: 10,
              padding: '9px 20px', fontSize: 14, fontWeight: 600,
              cursor: phone.trim() ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', gap: 8,
              fontFamily: 'var(--font-main)',
            }}
          >
            <MdWhatsapp size={18} />
            {sent ? 'Send Again' : 'Open WhatsApp'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PatientBalance() {
  const [patients, setPatients] = useState([]);
  const [totalOutstanding, setTotalOutstanding] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [payModal, setPayModal] = useState(null);
  const [bills, setBills] = useState([]);
  const [payAmt, setPayAmt] = useState('');
  const [payMethod, setPayMethod] = useState('Cash');
  const [whatsappModal, setWhatsappModal] = useState(null);


  const fetch = async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/patients/balances');
      setPatients(data.patients); setTotalOutstanding(data.totalOutstanding);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const openPay = async (p) => {
    setPayModal(p); setPayAmt('');
    try {
      const { data } = await API.get(`/patients/${p._id}/balance`);
      setBills(data.pendingBills || []);
    } catch { }
  };

  const handlePay = async (billId) => {
    if (!payAmt || Number(payAmt) <= 0) return toast.error('Enter valid amount');
    try {
      await API.patch(`/billing/${billId}/payment`, { additionalPayment: payAmt, paymentMethod: payMethod });
      toast.success('Payment recorded!'); setPayModal(null); fetch();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const filtered = patients.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.patientId.includes(search));
  const fmtPKR = (n) => `₨ ${Number(n || 0).toLocaleString('en-PK')}`;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Patient Balances</h1>
          <p>Track outstanding payments and dues</p>
        </div>
      </div>

      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-icon red"><MdAccountBalance /></div>
          <div><div className="stat-value text-sm" style={{ fontSize: 18 }}>{fmtPKR(totalOutstanding)}</div><div className="stat-label">Total Outstanding</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon yellow"><MdPayment /></div>
          <div><div className="stat-value" style={{ fontSize: 22 }}>{patients.length}</div><div className="stat-label">Patients with Dues</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue"><MdAccountBalance /></div>
          <div><div className="stat-value text-sm" style={{ fontSize: 18 }}>{patients.length > 0 ? fmtPKR(totalOutstanding / patients.length) : '₨ 0'}</div><div className="stat-label">Avg Outstanding</div></div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="toolbar" style={{ marginBottom: 0 }}>
          <div className="search-box"><MdSearch className="search-icon" /><input placeholder="Search patient..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        </div>
      </div>

      <div className="card">
        {loading ? <div className="flex-center" style={{ height: 200 }}><ShortLoader/></div>
          : filtered.length === 0 ? <div className="empty-state"><MdAccountBalance size={52} style={{ opacity: 0.3 }} /><h3>No outstanding balances</h3><p>All patients are fully paid up!</p></div>
            : (
              <div className="table-container">
                <table>
                  <thead><tr><th>Patient</th><th>Phone</th><th>Total Billed</th><th>Total Paid</th><th>Outstanding</th><th>Actions</th></tr></thead>
                  <tbody>
                    {filtered.map(p => (
                      <tr key={p._id}>
                        <td><div style={{ fontWeight: 600 }} className="single-line">{p.name}</div><div className="text-muted text-sm">{p.patientId}</div></td>
                        <td className="text-sm single-line">{p.phone || '—'}</td>
                        <td className="fw-semibold single-line">{fmtPKR(p.totalBilled)}</td>
                        <td className="text-success fw-semibold single-line">{fmtPKR(p.totalPaid)}</td>
                        <td><span className="badge badge-danger" style={{ fontSize: 13 }}>₨ {p.remainingBalance?.toLocaleString()}</span></td>
                        <td className="flex gap-2">
                          <button className="btn btn-success btn-sm" onClick={() => openPay(p)}><MdPayment /> Pay Now</button>
                           <button onClick={() => setWhatsappModal(p)} disabled={!p.phone} title={p.phone ? 'Send WhatsApp Reminder' : 'No phone number'}
                            style={{ background: p.phone ? '#16a34a' : 'var(--bg-tertiary)', color: p.phone ? '#fff' : 'var(--text-muted)', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 13, fontWeight: 600, cursor: p.phone ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-main)', opacity: p.phone ? 1 : 0.5, }}
                          >
                          <MdWhatsapp size={15} /> Remind
                        </button>
                        </td>
                       
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
      </div>

      {whatsappModal && (
        <WhatsAppModal
          patient={whatsappModal}
          onClose={() => setWhatsappModal(null)}
        />
      )}

      {payModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setPayModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <div><div className="modal-title">Record Payment</div><div className="text-muted text-sm">{payModal.name} · {payModal.patientId}</div></div>
              <button className="btn btn-ghost btn-icon" onClick={() => setPayModal(null)}>✕</button>
            </div>
            <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger)', borderRadius: 10, padding: 14, marginBottom: 16 }}>
              <div style={{ color: 'var(--danger)', fontWeight: 700, fontSize: 18 }}>Outstanding: ₨ {payModal.remainingBalance?.toLocaleString()}</div>
            </div>
            <div className="form-group"><label className="form-label">Select Invoice to Pay</label></div>
            {bills.map(b => (
              <div key={b._id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 14, marginBottom: 10 }}>
                <div className="flex-between">
                  <div><div style={{ fontWeight: 700 }}>{b.billNumber}</div><div className="text-muted text-sm">Balance: ₨ {(b.totalAmount - b.amountPaid).toLocaleString()}</div></div>
                  <span className="badge badge-warning">{b.paymentStatus}</span>
                </div>
                <div className="flex gap-2" style={{ marginTop: 10 }}>
                  <input className="form-control" type="number" value={payAmt} onChange={e => setPayAmt(e.target.value)} placeholder="Amount" min={1} max={b.totalAmount - b.amountPaid} style={{ flex: 1 }} />
                  <select className="form-control" value={payMethod} onChange={e => setPayMethod(e.target.value)} style={{ width: 120 }}><option>Cash</option><option>Card</option><option>Online</option></select>
                  <button className="btn btn-success" onClick={() => handlePay(b._id)}>Pay</button>
                </div>
              </div>
            ))}
            {bills.length === 0 && <div className="text-muted text-sm">No pending invoices found</div>}
          </div>
        </div>
      )}
    </div>
  );
}
