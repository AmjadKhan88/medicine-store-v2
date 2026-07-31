import { useState, useEffect } from 'react';
import { MdCheckCircle, MdCancel, MdStore, MdPayment, MdRefresh } from 'react-icons/md';
import toast from 'react-hot-toast';
import API from '../utils/api';
import ShortLoader from '../Components/ShortLoader';

const PKR    = (n)    => `₨ ${Number(n || 0).toLocaleString('en-PK')}`;
const fmtDate = (d)   => d ? new Date(d).toLocaleDateString('en-PK') : '—';
const STATUS_BADGE = { pending: 'badge-warning', approved: 'badge-success', rejected: 'badge-danger' };

export default function SuperAdmin() {
  const [tab, setTab]           = useState('requests');
  const [requests, setRequests] = useState([]);
  const [stores, setStores]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  // Activate form
  const [activateForm, setActivateForm] = useState({ storeId: '', plan: 'basic', months: 1 });

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [reqRes, storeRes] = await Promise.all([
        API.get('/subscription/admin/requests'),
        API.get('/subscription/admin/stores'),
      ]);
      setRequests(reqRes.data.requests || []);
      setStores(storeRes.data.stores   || []);
    } catch { toast.error('Not authorized or API error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleApprove = async (id) => {
    try {
      await API.patch(`/subscription/admin/approve/${id}`);
      toast.success('Subscription activated!');
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    try {
      await API.patch(`/subscription/admin/reject/${rejectModal}`, { reason: rejectReason });
      toast.success('Request rejected');
      setRejectModal(null); setRejectReason('');
      fetchAll();
    } catch { toast.error('Failed'); }
  };

  const handleManualActivate = async (e) => {
    e.preventDefault();
    try {
      await API.post('/subscription/admin/activate', activateForm);
      toast.success('Plan activated!');
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const pending = requests.filter(r => r.status === 'pending');

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Super Admin Panel</h1>
          <p>Platform-wide subscription management</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={fetchAll}><MdRefresh /> Refresh</button>
      </div>

      {/* Summary */}
      <div className="stat-grid" style={{ marginBottom: 20 }}>
        {[
          { label: 'Total Stores',     value: stores.length,                                   cls: 'blue'   },
          { label: 'Pending Requests', value: pending.length,                                  cls: 'yellow' },
          { label: 'Active Basic',     value: stores.filter(s => s.subscription?.plan === 'basic').length, cls: 'green'  },
          { label: 'Active Pro',       value: stores.filter(s => s.subscription?.plan === 'pro').length,   cls: 'purple' },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <div className={`stat-icon ${s.cls}`}><MdStore /></div>
            <div><div className="stat-value" style={{ fontSize: 24 }}>{s.value}</div><div className="stat-label">{s.label}</div></div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-3" style={{ marginBottom: 16 }}>
        {[{ id: 'requests', label: `Payment Requests (${pending.length} pending)` }, { id: 'stores', label: 'All Stores' }, { id: 'activate', label: 'Manual Activate' }].map(t => (
          <button key={t.id} className={`pill${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {loading ? <div className="flex-center" style={{ height: 200 }}><ShortLoader/></div> : (

        <>
          {/* Payment Requests */}
          {tab === 'requests' && (
            <div className="card">
              {requests.length === 0 ? (
                <div className="empty-state"><MdPayment size={48} style={{ opacity: 0.3 }} /><h3>No payment requests</h3></div>
              ) : (
                <div className="table-container">
                  <table>
                    <thead><tr><th>Store</th><th>Plan</th><th>Amount</th><th>Method</th><th>TXN ID</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                      {requests.map(r => (
                        <tr key={r._id}>
                          <td><div style={{ fontWeight: 600 }}>{r.adminName}</div><div className="text-muted text-sm">{r.adminEmail}</div></td>
                          <td><span className="badge badge-accent">{r.plan}</span></td>
                          <td className="fw-bold">{PKR(r.amount)}</td>
                          <td>{r.paymentMethod}</td>
                          <td><code style={{ fontSize: 12 }}>{r.transactionId}</code></td>
                          <td className="text-sm">{fmtDate(r.createdAt)}</td>
                          <td><span className={`badge ${STATUS_BADGE[r.status]}`}>{r.status}</span>
                            {r.rejectionReason && <div className="text-muted text-sm">{r.rejectionReason}</div>}
                          </td>
                          <td>
                            {r.status === 'pending' && (
                              <div className="table-actions">
                                <button className="btn btn-success btn-sm" onClick={() => handleApprove(r._id)}>
                                  <MdCheckCircle /> Approve
                                </button>
                                <button className="btn btn-danger btn-sm" onClick={() => { setRejectModal(r._id); setRejectReason(''); }}>
                                  <MdCancel /> Reject
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* All stores */}
          {tab === 'stores' && (
            <div className="card">
              <div className="table-container">
                <table>
                  <thead><tr><th>Store Owner</th><th>Email</th><th>Plan</th><th>Status</th><th>Expires</th><th>Joined</th></tr></thead>
                  <tbody>
                    {stores.map(s => {
                      const sub = s.subscription;
                      return (
                        <tr key={s._id}>
                          <td style={{ fontWeight: 600 }}>{s.name}</td>
                          <td className="text-sm">{s.email}</td>
                          <td><span className="badge badge-accent">{sub?.plan || 'none'}</span></td>
                          <td><span className={`badge ${sub?.isActive ? 'badge-success' : 'badge-danger'}`}>{sub?.isActive ? 'Active' : 'Expired'}</span></td>
                          <td className="text-sm">{sub?.plan === 'trial' ? `Trial ends ${fmtDate(sub?.trialEndsAt)}` : fmtDate(sub?.currentPeriodEnd)}</td>
                          <td className="text-sm">{fmtDate(s.createdAt)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Manual activate */}
          {tab === 'activate' && (
            <div className="card" style={{ maxWidth: 500 }}>
              <div className="card-header"><div className="card-title">Manual Plan Activation</div></div>
              <div className="alert alert-warning" style={{ marginBottom: 16 }}>
                <div className="alert-text">Use this to activate plans after cash payment or for testing.</div>
              </div>
              <form onSubmit={handleManualActivate}>
                <div className="form-group">
                  <label className="form-label required">Store ID (storeId)</label>
                  <input className="form-control" value={activateForm.storeId}
                    onChange={e => setActivateForm(p => ({ ...p, storeId: e.target.value }))}
                    placeholder="MongoDB ObjectId of the admin user" required />
                  <div className="form-hint">Find it from the All Stores tab or MongoDB</div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Plan</label>
                    <select className="form-control" value={activateForm.plan} onChange={e => setActivateForm(p => ({ ...p, plan: e.target.value }))}>
                      <option value="basic">Basic</option>
                      <option value="pro">Pro</option>
                      <option value="free">Free</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Months</label>
                    <select className="form-control" value={activateForm.months} onChange={e => setActivateForm(p => ({ ...p, months: e.target.value }))}>
                      <option value={1}>1 month</option>
                      <option value={3}>3 months</option>
                      <option value={6}>6 months</option>
                      <option value={12}>12 months</option>
                    </select>
                  </div>
                </div>
                <button type="submit" className="btn btn-primary"><MdCheckCircle /> Activate Plan</button>
              </form>
            </div>
          )}
        </>
      )}

      {/* Reject modal */}
      {rejectModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <div className="modal-title">Reject Payment Request</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setRejectModal(null)}>✕</button>
            </div>
            <div className="form-group">
              <label className="form-label">Rejection Reason</label>
              <textarea className="form-control" rows={3} value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Transaction not found, wrong amount, etc." />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setRejectModal(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleReject}><MdCancel /> Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}