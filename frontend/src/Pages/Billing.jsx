import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdAdd, MdSearch, MdReceipt, MdPayment, MdDelete, MdVisibility } from 'react-icons/md';
import toast from 'react-hot-toast';
import API from '../utils/api';

const STATUS_COLORS = { Paid:'badge-success', Partial:'badge-warning', Pending:'badge-danger' };

export default function Billing() {
  const [bills, setBills] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewBill, setViewBill] = useState(null);
  const [payModal, setPayModal] = useState(null);
  const [payAmt, setPayAmt] = useState('');
  const [payMethod, setPayMethod] = useState('Cash');
  const navigate = useNavigate();

  const fetchBills = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/billing', { params: { page, limit: 15, search, status } });
      setBills(data.bills); setTotal(data.total); setTotalPages(data.totalPages);
    } catch { toast.error('Failed to load bills'); }
    finally { setLoading(false); }
  }, [page, search, status]);

  useEffect(() => { fetchBills(); }, [fetchBills]);
  useEffect(() => { setPage(1); }, [search, status]);

  const openView = async (id) => {
    try { const { data } = await API.get(`/billing/${id}`); setViewBill(data.bill); } catch { toast.error('Load failed'); }
  };

  const handlePayment = async () => {
    if (!payAmt || Number(payAmt) <= 0) return toast.error('Enter valid amount');
    try {
      await API.patch(`/billing/${payModal._id}/payment`, { additionalPayment: payAmt, paymentMethod: payMethod });
      toast.success('Payment recorded!'); setPayModal(null); setPayAmt(''); fetchBills();
    } catch (err) { toast.error(err.response?.data?.message || 'Payment failed'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this bill? Stock will be restored.')) return;
    try { await API.delete(`/billing/${id}`); toast.success('Bill deleted'); fetchBills(); }
    catch { toast.error('Delete failed'); }
  };

  const fmtPKR = (n) => `₨ ${Number(n||0).toLocaleString('en-PK')}`;
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-PK') : '—';

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Billing & Invoices</h1>
          <p>{total} total invoices</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/billing/create')}><MdAdd /> Create Invoice</button>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="toolbar" style={{ marginBottom: 0 }}>
          <div className="search-box">
            <MdSearch className="search-icon" />
            <input placeholder="Search by bill no., patient name..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-2">
            {['','Paid','Partial','Pending'].map(s => (
              <button key={s} className={`pill${status===s?' active':''}`} onClick={() => setStatus(s)}>{s||'All'}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        {loading ? <div className="flex-center" style={{ height:200 }}><div className="text-muted">Loading...</div></div>
        : bills.length === 0 ? <div className="empty-state"><MdReceipt size={52} style={{ opacity:0.3 }} /><h3>No invoices found</h3><p>Create your first invoice</p></div>
        : (
          <div className="table-container">
            <table>
              <thead><tr><th>Invoice #</th><th>Patient</th><th>Date</th><th>Total</th><th>Paid</th><th>Balance</th><th>Method</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {bills.map(b => {
                  const balance = (b.totalAmount||0) - (b.amountPaid||0);
                  return (
                    <tr key={b._id}>
                      <td><span className="text-accent fw-bold">{b.billNumber}</span></td>
                      <td>
                        <div style={{ fontWeight:600 }}>{b.patientName}</div>
                        <div className="text-muted text-sm">{b.patient?.patientId}</div>
                      </td>
                      <td className="text-sm">{fmtDate(b.createdAt)}</td>
                      <td className="fw-bold">{fmtPKR(b.totalAmount)}</td>
                      <td className="text-success">{fmtPKR(b.amountPaid)}</td>
                      <td>{balance > 0 ? <span className="text-danger fw-bold">{fmtPKR(balance)}</span> : <span className="text-success">—</span>}</td>
                      <td><span className="badge badge-default">{b.paymentMethod}</span></td>
                      <td><span className={`badge ${STATUS_COLORS[b.paymentStatus]||'badge-default'}`}>{b.paymentStatus}</span></td>
                      <td>
                        <div className="table-actions">
                          <button className="btn btn-secondary btn-sm btn-icon" onClick={() => openView(b._id)} title="View"><MdVisibility /></button>
                          {b.paymentStatus !== 'Paid' && <button className="btn btn-success btn-sm btn-icon" onClick={() => { setPayModal(b); setPayAmt(''); }} title="Add Payment"><MdPayment /></button>}
                          <button className="btn btn-danger btn-sm btn-icon" onClick={() => handleDelete(b._id)} title="Delete"><MdDelete /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {totalPages > 1 && (
          <div className="pagination">
            <button disabled={page===1} onClick={() => setPage(p=>p-1)}>‹</button>
            {Array.from({length:totalPages},(_,i)=>i+1).map(p=><button key={p} className={page===p?'active':''} onClick={()=>setPage(p)}>{p}</button>)}
            <button disabled={page===totalPages} onClick={() => setPage(p=>p+1)}>›</button>
          </div>
        )}
      </div>

      {/* View Bill Modal */}
      {viewBill && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setViewBill(null)}>
          <div className="modal modal-lg" id="printable-bill">
            <div className="modal-header">
              <div>
                <div className="modal-title">Invoice — {viewBill.billNumber}</div>
                <div className="text-muted text-sm">{new Date(viewBill.createdAt).toLocaleDateString('en-PK', { dateStyle:'full' })}</div>
              </div>
              <div className="flex gap-2">
                <button className="btn btn-secondary btn-sm" onClick={() => window.print()}>🖨️ Print</button>
                <button className="btn btn-ghost btn-icon" onClick={() => setViewBill(null)}>✕</button>
              </div>
            </div>
            <div style={{ padding:'0 0 16px' }}>
              <div className="flex-between" style={{ background:'var(--bg-tertiary)', borderRadius:10, padding:'14px 16px', marginBottom:16 }}>
                <div><div style={{ fontWeight:700 }}>{viewBill.patientName}</div><div className="text-muted text-sm">{viewBill.patient?.patientId} · {viewBill.patient?.phone}</div></div>
                <span className={`badge ${STATUS_COLORS[viewBill.paymentStatus]}`}>{viewBill.paymentStatus}</span>
              </div>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:14 }}>
                <thead><tr style={{ background:'var(--bg-tertiary)' }}><th style={{ padding:'10px 12px', textAlign:'left', fontWeight:700 }}>Medicine</th><th style={{ padding:'10px 12px', textAlign:'right' }}>Qty</th><th style={{ padding:'10px 12px', textAlign:'right' }}>Unit Price</th><th style={{ padding:'10px 12px', textAlign:'right' }}>Total</th></tr></thead>
                <tbody>
                  {viewBill.items?.map((item, i) => (
                    <tr key={i} style={{ borderBottom:'1px solid var(--border-light)' }}>
                      <td style={{ padding:'10px 12px' }}>{item.medicineName}</td>
                      <td style={{ padding:'10px 12px', textAlign:'right' }}>{item.quantity}</td>
                      <td style={{ padding:'10px 12px', textAlign:'right' }}>₨ {item.unitPrice?.toLocaleString()}</td>
                      <td style={{ padding:'10px 12px', textAlign:'right', fontWeight:600 }}>₨ {item.totalPrice?.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop:16, padding:'16px', background:'var(--bg-tertiary)', borderRadius:10 }}>
                {[['Subtotal', viewBill.subtotal], ['Discount', -viewBill.discount], ['Tax', viewBill.tax]].map(([l, v]) => v ? (
                  <div key={l} className="flex-between" style={{ marginBottom:6, fontSize:14 }}>
                    <span className="text-muted">{l}</span>
                    <span>{l==='Discount'?`— ₨ ${Math.abs(v).toLocaleString()}`:`₨ ${v?.toLocaleString()}`}</span>
                  </div>
                ) : null)}
                <div className="divider" />
                <div className="flex-between" style={{ fontWeight:800, fontSize:16 }}><span>Total</span><span>₨ {viewBill.totalAmount?.toLocaleString()}</span></div>
                <div className="flex-between" style={{ color:'var(--success)', marginTop:6, fontSize:14 }}><span>Amount Paid</span><span>₨ {viewBill.amountPaid?.toLocaleString()}</span></div>
                {(viewBill.totalAmount - viewBill.amountPaid) > 0 && (
                  <div className="flex-between" style={{ color:'var(--danger)', fontWeight:700, marginTop:4, fontSize:14 }}><span>Remaining Balance</span><span>₨ {(viewBill.totalAmount - viewBill.amountPaid).toLocaleString()}</span></div>
                )}
              </div>
              {viewBill.notes && <div className="text-muted text-sm" style={{ marginTop:12 }}>Notes: {viewBill.notes}</div>}
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {payModal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setPayModal(null)}>
          <div className="modal" style={{ maxWidth:400 }}>
            <div className="modal-header">
              <div className="modal-title">Record Payment</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setPayModal(null)}>✕</button>
            </div>
            <div style={{ marginBottom:16, padding:14, background:'var(--bg-tertiary)', borderRadius:10 }}>
              <div style={{ fontWeight:600 }}>{payModal.patientName}</div>
              <div className="text-muted text-sm">Bill: {payModal.billNumber}</div>
              <div className="flex-between" style={{ marginTop:8 }}>
                <span className="text-sm text-muted">Total: <strong>₨ {payModal.totalAmount?.toLocaleString()}</strong></span>
                <span className="text-sm text-danger">Remaining: <strong>₨ {(payModal.totalAmount - payModal.amountPaid).toLocaleString()}</strong></span>
              </div>
            </div>
            <div className="form-group"><label className="form-label required">Payment Amount (₨)</label><input className="form-control" type="number" value={payAmt} onChange={e => setPayAmt(e.target.value)} max={payModal.totalAmount - payModal.amountPaid} min={1} placeholder="Enter amount..." /></div>
            <div className="form-group"><label className="form-label">Payment Method</label><select className="form-control" value={payMethod} onChange={e => setPayMethod(e.target.value)}><option>Cash</option><option>Card</option><option>Online</option></select></div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setPayModal(null)}>Cancel</button>
              <button className="btn btn-success" onClick={handlePayment}><MdPayment /> Record Payment</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
