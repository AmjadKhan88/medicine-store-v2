import { useState, useEffect } from 'react';
import { MdAccountBalance, MdSearch, MdPayment } from 'react-icons/md';
import toast from 'react-hot-toast';
import API from '../utils/api';

export default function PatientBalance() {
  const [patients, setPatients] = useState([]);
  const [totalOutstanding, setTotalOutstanding] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [payModal, setPayModal] = useState(null);
  const [bills, setBills] = useState([]);
  const [payAmt, setPayAmt] = useState('');
  const [payMethod, setPayMethod] = useState('Cash');

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
    } catch {}
  };

  const handlePay = async (billId) => {
    if (!payAmt || Number(payAmt) <= 0) return toast.error('Enter valid amount');
    try {
      await API.patch(`/billing/${billId}/payment`, { additionalPayment: payAmt, paymentMethod: payMethod });
      toast.success('Payment recorded!'); setPayModal(null); fetch();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const filtered = patients.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.patientId.includes(search));
  const fmtPKR = (n) => `₨ ${Number(n||0).toLocaleString('en-PK')}`;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Patient Balances</h1>
          <p>Track outstanding payments and dues</p>
        </div>
      </div>

      <div className="stat-grid" style={{ gridTemplateColumns:'repeat(3,1fr)', marginBottom:20 }}>
        <div className="stat-card">
          <div className="stat-icon red"><MdAccountBalance /></div>
          <div><div className="stat-value text-sm" style={{ fontSize:18 }}>{fmtPKR(totalOutstanding)}</div><div className="stat-label">Total Outstanding</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon yellow"><MdPayment /></div>
          <div><div className="stat-value" style={{ fontSize:22 }}>{patients.length}</div><div className="stat-label">Patients with Dues</div></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue"><MdAccountBalance /></div>
          <div><div className="stat-value text-sm" style={{ fontSize:18 }}>{patients.length > 0 ? fmtPKR(totalOutstanding / patients.length) : '₨ 0'}</div><div className="stat-label">Avg Outstanding</div></div>
        </div>
      </div>

      <div className="card" style={{ marginBottom:16 }}>
        <div className="toolbar" style={{ marginBottom:0 }}>
          <div className="search-box"><MdSearch className="search-icon" /><input placeholder="Search patient..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        </div>
      </div>

      <div className="card">
        {loading ? <div className="flex-center" style={{ height:200 }}><div className="text-muted">Loading...</div></div>
        : filtered.length === 0 ? <div className="empty-state"><MdAccountBalance size={52} style={{ opacity:0.3 }} /><h3>No outstanding balances</h3><p>All patients are fully paid up!</p></div>
        : (
          <div className="table-container">
            <table>
              <thead><tr><th>Patient</th><th>Phone</th><th>Total Billed</th><th>Total Paid</th><th>Outstanding</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p._id}>
                    <td><div style={{ fontWeight:600 }}>{p.name}</div><div className="text-muted text-sm">{p.patientId}</div></td>
                    <td className="text-sm">{p.phone||'—'}</td>
                    <td className="fw-semibold">{fmtPKR(p.totalBilled)}</td>
                    <td className="text-success fw-semibold">{fmtPKR(p.totalPaid)}</td>
                    <td><span className="badge badge-danger" style={{ fontSize:13 }}>₨ {p.remainingBalance?.toLocaleString()}</span></td>
                    <td><button className="btn btn-success btn-sm" onClick={() => openPay(p)}><MdPayment /> Pay Now</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {payModal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setPayModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <div><div className="modal-title">Record Payment</div><div className="text-muted text-sm">{payModal.name} · {payModal.patientId}</div></div>
              <button className="btn btn-ghost btn-icon" onClick={() => setPayModal(null)}>✕</button>
            </div>
            <div style={{ background:'var(--danger-bg)', border:'1px solid var(--danger)', borderRadius:10, padding:14, marginBottom:16 }}>
              <div style={{ color:'var(--danger)', fontWeight:700, fontSize:18 }}>Outstanding: ₨ {payModal.remainingBalance?.toLocaleString()}</div>
            </div>
            <div className="form-group"><label className="form-label">Select Invoice to Pay</label></div>
            {bills.map(b => (
              <div key={b._id} style={{ border:'1px solid var(--border)', borderRadius:10, padding:14, marginBottom:10 }}>
                <div className="flex-between">
                  <div><div style={{ fontWeight:700 }}>{b.billNumber}</div><div className="text-muted text-sm">Balance: ₨ {(b.totalAmount - b.amountPaid).toLocaleString()}</div></div>
                  <span className="badge badge-warning">{b.paymentStatus}</span>
                </div>
                <div className="flex gap-2" style={{ marginTop:10 }}>
                  <input className="form-control" type="number" value={payAmt} onChange={e => setPayAmt(e.target.value)} placeholder="Amount" min={1} max={b.totalAmount - b.amountPaid} style={{ flex:1 }} />
                  <select className="form-control" value={payMethod} onChange={e => setPayMethod(e.target.value)} style={{ width:120 }}><option>Cash</option><option>Card</option><option>Online</option></select>
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
