import { useState, useEffect, useCallback } from 'react';
import {
  MdStore, MdPayment, MdSupportAgent, MdBarChart,
  MdCheckCircle, MdCancel, MdBlock, MdLockOpen,
  MdRefresh, MdWarning, MdSearch, MdOpenInNew,
  MdStar, MdReply, MdClose,
} from 'react-icons/md';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import toast from 'react-hot-toast';
import API from '../utils/api';

/* ── helpers ── */
const PKR     = (n) => `₨ ${Number(n || 0).toLocaleString('en-PK')}`;
const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—';
const fmtDateTime = (d) => d
  ? new Date(d).toLocaleString('en-PK', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  : '—';

const PLAN_COLORS  = { trial: '#6366f1', free: '#94a3b8', basic: '#0ea5e9', pro: '#8b5cf6' };
const STATUS_BADGE = {
  Open:        'badge-danger',
  'In Progress':'badge-warning',
  Resolved:    'badge-success',
  Closed:      'badge-default',
};
const PRIORITY_BADGE = {
  Urgent: 'badge-danger',
  High:   'badge-warning',
  Medium: 'badge-accent',
  Low:    'badge-default',
};
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/* ═══════════════════════════════════════════
   TICKET DETAIL MODAL
═══════════════════════════════════════════ */
function TicketModal({ ticketId, onClose, onUpdated }) {
  const [ticket, setTicket]   = useState(null);
  const [reply, setReply]     = useState('');
  const [sending, setSending] = useState(false);

  const fetchTicket = useCallback(async () => {
    try {
      const { data } = await API.get(`/super-admin/tickets/${ticketId}`);
      setTicket(data.ticket);
    } catch { toast.error('Failed to load ticket'); }
  }, [ticketId]);

  useEffect(() => { fetchTicket(); }, [fetchTicket]);

  const handleReply = async () => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      await API.post(`/super-admin/tickets/${ticketId}/reply`, { message: reply });
      setReply('');
      fetchTicket();
      onUpdated();
      toast.success('Reply sent!');
    } catch { toast.error('Failed to send'); }
    finally { setSending(false); }
  };

  const handleStatus = async (status) => {
    try {
      await API.patch(`/super-admin/tickets/${ticketId}/status`, { status });
      fetchTicket(); onUpdated();
      toast.success(`Ticket marked as ${status}`);
    } catch { toast.error('Failed'); }
  };

  if (!ticket) return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 500 }}>
        <div className="flex-center" style={{ height: 120 }}>
          <div className="text-muted">Loading ticket...</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <div>
            <div className="modal-title">{ticket.subject}</div>
            <div className="text-muted text-sm">
              {ticket.storeName} · {ticket.storeEmail} · {fmtDateTime(ticket.createdAt)}
            </div>
          </div>
          <div className="flex gap-2">
            <span className={`badge ${STATUS_BADGE[ticket.status]}`}>{ticket.status}</span>
            <span className={`badge ${PRIORITY_BADGE[ticket.priority]}`}>{ticket.priority}</span>
            <button className="btn btn-ghost btn-icon" onClick={onClose}><MdClose /></button>
          </div>
        </div>

        {/* Original message */}
        <div style={{ background: 'var(--bg-tertiary)', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
          <div className="text-muted text-sm" style={{ marginBottom: 6 }}>
            {ticket.category} · {fmtDateTime(ticket.createdAt)}
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.7 }}>{ticket.message}</div>
        </div>

        {/* Conversation */}
        {ticket.replies?.map((r, i) => (
          <div key={i} style={{
            display:        'flex',
            flexDirection:  r.sentBy === 'admin' ? 'row-reverse' : 'row',
            gap:            10,
            marginBottom:   12,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
              background: r.sentBy === 'admin' ? 'var(--accent)' : 'var(--bg-tertiary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 700,
              color: r.sentBy === 'admin' ? '#fff' : 'var(--text-secondary)',
            }}>
              {r.sentBy === 'admin' ? '👑' : '🏪'}
            </div>
            <div style={{
              maxWidth:     '75%',
              padding:      '10px 14px',
              borderRadius: r.sentBy === 'admin' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
              background:   r.sentBy === 'admin' ? 'var(--accent)' : 'var(--card-bg)',
              color:        r.sentBy === 'admin' ? '#fff' : 'var(--text-primary)',
              border:       r.sentBy === 'admin' ? 'none' : '1px solid var(--border)',
              fontSize:     14,
            }}>
              <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 4, opacity: 0.75 }}>
                {r.senderName} · {fmtDateTime(r.createdAt)}
              </div>
              {r.message}
            </div>
          </div>
        ))}

        {/* Reply box */}
        {ticket.status !== 'Closed' && (
          <div style={{ marginTop: 16 }}>
            <textarea className="form-control" rows={3}
              value={reply} onChange={e => setReply(e.target.value)}
              placeholder="Type your reply..." />
            <div className="flex gap-2" style={{ marginTop: 10, justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <div className="flex gap-2">
                {ticket.status !== 'Resolved' && (
                  <button className="btn btn-success btn-sm"
                    onClick={() => handleStatus('Resolved')}>
                    <MdCheckCircle /> Resolve
                  </button>
                )}
                <button className="btn btn-danger btn-sm"
                  onClick={() => handleStatus('Closed')}>
                  Close
                </button>
              </div>
              <button className="btn btn-primary btn-sm"
                onClick={handleReply} disabled={!reply.trim() || sending}>
                <MdReply /> {sending ? 'Sending...' : 'Send Reply'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   STORE DETAIL MODAL
═══════════════════════════════════════════ */
function StoreModal({ store, onClose, onUpdated }) {
  const [extForm, setExtForm]   = useState({ plan: 'basic', months: 1 });
  const [saving, setSaving]     = useState(false);
  const [toggling, setToggling] = useState(false);
  const [reason, setReason]     = useState('');

  const handleExtend = async () => {
    setSaving(true);
    try {
      await API.post('/super-admin/stores/extend', {
        storeId: store._id, ...extForm,
      });
      toast.success('Subscription extended!');
      onUpdated(); onClose();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleToggle = async () => {
    const newStatus = !store.isActive;
    if (!newStatus && !reason.trim()) { toast.error('Reason required to deactivate'); return; }
    setToggling(true);
    try {
      await API.patch('/super-admin/stores/toggle', {
        storeId:  store._id,
        isActive: newStatus,
        reason,
      });
      toast.success(newStatus ? 'Store reactivated!' : 'Store deactivated!');
      onUpdated(); onClose();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setToggling(false); }
  };

  const sub  = store.subscription;
  const plan = sub?.plan || 'none';

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <div>
            <div className="modal-title">{store.storeName || store.name}</div>
            <div className="text-muted text-sm">{store.email} · Joined {fmtDate(store.createdAt)}</div>
          </div>
          <div className="flex gap-2">
            <span className={`badge ${store.isActive ? 'badge-success' : 'badge-danger'}`}>
              {store.isActive ? 'Active' : 'Deactivated'}
            </span>
            <span className="badge" style={{ background: PLAN_COLORS[plan] + '20', color: PLAN_COLORS[plan] }}>
              {plan.toUpperCase()}
            </span>
            <button className="btn btn-ghost btn-icon" onClick={onClose}><MdClose /></button>
          </div>
        </div>

        {/* Store stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Medicines', value: store.medicineCount || 0 },
            { label: 'Patients',  value: store.patientCount  || 0 },
            { label: 'Open Tickets', value: store.openTickets || 0 },
          ].map((s, i) => (
            <div key={i} style={{ background: 'var(--bg-tertiary)', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
              <div style={{ fontWeight: 800, fontSize: 20 }}>{s.value}</div>
              <div className="text-muted text-sm">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Subscription info */}
        {sub && (
          <div style={{ background: 'var(--bg-tertiary)', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>SUBSCRIPTION</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
              <div><span className="text-muted">Plan: </span><strong style={{ textTransform: 'capitalize' }}>{sub.plan}</strong></div>
              <div><span className="text-muted">Status: </span><strong>{sub.status}</strong></div>
              {sub.plan === 'trial' && <div><span className="text-muted">Trial ends: </span><strong>{fmtDate(sub.trialEndsAt)}</strong></div>}
              {sub.currentPeriodEnd && <div><span className="text-muted">Expires: </span><strong>{fmtDate(sub.currentPeriodEnd)}</strong></div>}
            </div>
          </div>
        )}

        {/* Extend / activate subscription */}
        <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
            EXTEND / CHANGE SUBSCRIPTION
          </div>
          <div className="form-row">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Plan</label>
              <select className="form-control" value={extForm.plan}
                onChange={e => setExtForm(p => ({ ...p, plan: e.target.value }))}>
                <option value="free">Free</option>
                <option value="basic">Basic</option>
                <option value="pro">Pro</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Duration</label>
              <select className="form-control" value={extForm.months}
                onChange={e => setExtForm(p => ({ ...p, months: Number(e.target.value) }))}>
                {[1,2,3,6,12].map(m => <option key={m} value={m}>{m} month{m>1?'s':''}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0, display: 'flex', alignItems: 'flex-end' }}>
              <button className="btn btn-primary btn-sm w-full" onClick={handleExtend} disabled={saving}>
                {saving ? 'Applying...' : 'Apply'}
              </button>
            </div>
          </div>
        </div>

        {/* Activate / deactivate */}
        <div style={{ border: `1px solid ${store.isActive ? 'var(--danger)' : 'var(--success)'}20`, borderRadius: 12, padding: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
            {store.isActive ? 'DEACTIVATE STORE' : 'REACTIVATE STORE'}
          </div>
          {store.isActive && (
            <div className="form-group">
              <label className="form-label required">Reason for deactivation</label>
              <input className="form-control" value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Payment overdue, violation, etc." />
            </div>
          )}
          <button
            className={`btn btn-sm ${store.isActive ? 'btn-danger' : 'btn-success'}`}
            onClick={handleToggle} disabled={toggling}
          >
            {toggling ? 'Processing...' :
              store.isActive ? <><MdBlock /> Deactivate Store</> : <><MdLockOpen /> Reactivate Store</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN SUPER ADMIN DASHBOARD
═══════════════════════════════════════════ */
export default function SuperAdminDashboard() {
  const [tab, setTab]               = useState('analytics');
  const [analytics, setAnalytics]   = useState(null);
  const [stores, setStores]         = useState([]);
  const [storesTotal, setStoresTotal] = useState(0);
  const [storePage, setStorePage]   = useState(1);
  const [storeSearch, setStoreSearch] = useState('');
  const [storePlan, setStorePlan]   = useState('');
  const [payments, setPayments]     = useState([]);
  const [payStatus, setPayStatus]   = useState('pending');
  const [tickets, setTickets]       = useState([]);
  const [ticketStatus, setTicketStatus] = useState('');
  const [loading, setLoading]       = useState(true);
  const [viewStore, setViewStore]   = useState(null);
  const [viewTicket, setViewTicket] = useState(null);

  /* ── Fetch analytics ── */
  const fetchAnalytics = async () => {
    try {
      const { data } = await API.get('/super-admin/analytics');
      setAnalytics(data.analytics);
    } catch { toast.error('Failed to load analytics — check SUPER_ADMIN_EMAIL in .env'); }
    finally { setLoading(false); }
  };

  /* ── Fetch stores ── */
  const fetchStores = useCallback(async () => {
    try {
      const params = { page: storePage, limit: 15, search: storeSearch };
      if (storePlan) params.plan = storePlan;
      const { data } = await API.get('/super-admin/stores', { params });
      setStores(data.stores);
      setStoresTotal(data.total);
    } catch { toast.error('Failed to load stores'); }
  }, [storePage, storeSearch, storePlan]);

  /* ── Fetch payments ── */
  const fetchPayments = async () => {
    try {
      const { data } = await API.get('/super-admin/payments', { params: { status: payStatus, limit: 30 } });
      setPayments(data.requests);
    } catch {}
  };

  /* ── Fetch tickets ── */
  const fetchTickets = async () => {
    try {
      const params = { limit: 30 };
      if (ticketStatus) params.status = ticketStatus;
      const { data } = await API.get('/super-admin/tickets', { params });
      setTickets(data.tickets);
    } catch {}
  };

  useEffect(() => { fetchAnalytics(); }, []);
  useEffect(() => { if (tab === 'stores')   fetchStores();   }, [tab, fetchStores]);
  useEffect(() => { if (tab === 'payments') fetchPayments(); }, [tab, payStatus]);
  useEffect(() => { if (tab === 'tickets')  fetchTickets();  }, [tab, ticketStatus]);

  const handleApprove = async (id) => {
    try {
      await API.patch(`/super-admin/payments/${id}/approve`);
      toast.success('Payment approved and subscription activated!');
      fetchPayments(); fetchAnalytics();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleReject = async (id, reason) => {
    try {
      await API.patch(`/super-admin/payments/${id}/reject`, { reason });
      toast.success('Payment rejected');
      fetchPayments();
    } catch { toast.error('Failed'); }
  };

  const a = analytics;

  const tabs = [
    { id: 'analytics', label: '📊 Analytics'              },
    { id: 'stores',    label: `🏪 Stores (${storesTotal || '...'})`         },
    { id: 'payments',  label: `💳 Payments ${a?.platform?.pendingRequests ? `(${a.platform.pendingRequests} pending)` : ''}` },
    { id: 'tickets',   label: `🎫 Support ${a?.platform?.openTickets ? `(${a.platform.openTickets} open)` : ''}`      },
  ];

  if (loading) return (
    <div className="flex-center" style={{ height: 300 }}>
      <div className="text-muted">Loading super admin panel...</div>
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Super Admin Dashboard</h1>
          <p>Platform-wide management for MediStore SaaS</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => { fetchAnalytics(); fetchStores(); }}>
          <MdRefresh /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2" style={{ marginBottom: 20, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.id} className={`pill${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {/* ══════════════ ANALYTICS TAB ══════════════ */}
      {tab === 'analytics' && a && (
        <div>
          {/* KPI cards */}
          <div className="stat-grid" style={{ marginBottom: 20 }}>
            {[
              { label: 'Total Stores',      value: a.platform.totalStores,                  cls: 'blue'   },
              { label: 'Total Medicines',   value: a.platform.totalMedicines.toLocaleString(),cls: 'green' },
              { label: 'Total Patients',    value: a.platform.totalPatients.toLocaleString(), cls: 'purple'},
              { label: 'Total Bills',       value: a.platform.totalBills.toLocaleString(),   cls: 'yellow' },
              { label: 'This Month Revenue',value: PKR(a.billing.thisMonthRevenue),          cls: 'green'  },
              { label: 'Revenue Growth',    value: a.billing.revenueGrowth != null ? `${a.billing.revenueGrowth > 0 ? '+' : ''}${a.billing.revenueGrowth}%` : 'N/A', cls: a.billing.revenueGrowth > 0 ? 'green' : 'red' },
              { label: 'Pending Payments',  value: a.platform.pendingRequests,               cls: 'yellow' },
              { label: 'Open Tickets',      value: a.platform.openTickets,                  cls: 'red'    },
            ].map((s, i) => (
              <div key={i} className="stat-card">
                <div className={`stat-icon ${s.cls}`}><MdBarChart /></div>
                <div>
                  <div className="stat-value" style={{ fontSize: 20 }}>{s.value}</div>
                  <div className="stat-label">{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="charts-grid" style={{ marginBottom: 20 }}>
            {/* Revenue chart */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">Subscription Revenue</div>
                <div className="text-muted text-sm">Last 6 months</div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={a.monthlyRevenue.map(m => ({
                  name:    MONTHS[m._id.month - 1],
                  revenue: m.revenue,
                  subs:    m.count,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `₨${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={v => PKR(v)} contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }} />
                  <Line type="monotone" dataKey="revenue" name="Revenue" stroke="var(--accent)" strokeWidth={2.5} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Plan distribution */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">Plan Distribution</div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={Object.entries(a.subscriptions)
                      .filter(([k]) => ['trial','free','basic','pro'].includes(k))
                      .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }))}
                    cx="50%" cy="50%" outerRadius={75} dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`} labelLine={false} fontSize={11}
                  >
                    {['trial','free','basic','pro'].map((plan, i) => (
                      <Cell key={i} fill={PLAN_COLORS[plan]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Expiring stores alert */}
          {a.subscriptions.expiringIn7Days > 0 && (
            <div className="alert alert-warning" style={{ marginBottom: 20 }}>
              <MdWarning size={20} />
              <div className="alert-text">
                <strong>{a.subscriptions.expiringIn7Days} paid subscription{a.subscriptions.expiringIn7Days > 1 ? 's' : ''} expiring within 7 days!</strong>
                {' '}{a.subscriptions.expiringIn30Days} total expiring in 30 days. Consider sending renewal reminders.
              </div>
            </div>
          )}

          {/* Expiring stores table */}
          {a.expiringStores?.length > 0 && (
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-header">
                <div className="card-title">⚠️ Expiring Soon (7 days)</div>
              </div>
              <div className="table-container">
                <table>
                  <thead><tr><th>Store</th><th>Email</th><th>Phone</th><th>Plan</th><th>Expires</th></tr></thead>
                  <tbody>
                    {a.expiringStores.map((s, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{s.name}</td>
                        <td className="text-sm">{s.email}</td>
                        <td className="text-sm">{s.phone || '—'}</td>
                        <td><span className="badge badge-accent">{s.plan}</span></td>
                        <td className="text-danger fw-bold">{fmtDate(s.expiresAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Recent stores */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Recently Registered Stores</div>
            </div>
            <div className="table-container">
              <table>
                <thead><tr><th>Name</th><th>Email</th><th>Joined</th></tr></thead>
                <tbody>
                  {a.recentStores.map(s => (
                    <tr key={s._id}>
                      <td style={{ fontWeight: 600 }}>{s.name}</td>
                      <td className="text-sm">{s.email}</td>
                      <td className="text-sm">{fmtDate(s.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ STORES TAB ══════════════ */}
      {tab === 'stores' && (
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="toolbar" style={{ marginBottom: 0 }}>
              <div className="search-box">
                <MdSearch className="search-icon" />
                <input placeholder="Search store name or email..."
                  value={storeSearch} onChange={e => setStoreSearch(e.target.value)} />
              </div>
              <select className="form-control" style={{ width: 160 }}
                value={storePlan} onChange={e => setStorePlan(e.target.value)}>
                <option value="">All Plans</option>
                <option value="trial">Trial</option>
                <option value="free">Free</option>
                <option value="basic">Basic</option>
                <option value="pro">Pro</option>
              </select>
            </div>
          </div>

          <div className="card">
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Store</th><th>Plan</th><th>Status</th>
                    <th>Medicines</th><th>Patients</th>
                    <th>Expires</th><th>Tickets</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {stores.map(s => {
                    const sub  = s.subscription;
                    const plan = sub?.plan || 'none';
                    const expDate = sub?.plan === 'trial' ? sub?.trialEndsAt : sub?.currentPeriodEnd;
                    const isExpiringSoon = expDate && new Date(expDate) < new Date(Date.now() + 7 * 86400000);

                    return (
                      <tr key={s._id}>
                        <td>
                          <div style={{ fontWeight: 700 }}>{s.storeName || s.name}</div>
                          <div className="text-muted text-sm">{s.email}</div>
                        </td>
                        <td>
                          <span style={{ background: PLAN_COLORS[plan] + '20', color: PLAN_COLORS[plan], padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 700 }}>
                            {plan.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${s.isActive ? 'badge-success' : 'badge-danger'}`}>
                            {s.isActive ? 'Active' : 'Deactivated'}
                          </span>
                        </td>
                        <td>{s.medicineCount}</td>
                        <td>{s.patientCount}</td>
                        <td className={isExpiringSoon ? 'text-danger fw-bold text-sm' : 'text-sm'}>
                          {fmtDate(expDate)}
                          {isExpiringSoon && ' ⚠️'}
                        </td>
                        <td>
                          {s.openTickets > 0
                            ? <span className="badge badge-warning">{s.openTickets} open</span>
                            : <span className="text-muted text-sm">—</span>}
                        </td>
                        <td>
                          <button className="btn btn-secondary btn-sm btn-icon"
                            onClick={() => setViewStore(s)} title="Manage Store">
                            <MdOpenInNew />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ PAYMENTS TAB ══════════════ */}
      {tab === 'payments' && (
        <div>
          <div className="flex gap-2" style={{ marginBottom: 16 }}>
            {['pending','approved','rejected'].map(s => (
              <button key={s} className={`pill${payStatus === s ? ' active' : ''}`}
                style={{ textTransform: 'capitalize' }}
                onClick={() => setPayStatus(s)}>{s}</button>
            ))}
          </div>

          <div className="card">
            {payments.length === 0 ? (
              <div className="empty-state"><MdPayment size={48} style={{ opacity: 0.3 }} /><h3>No {payStatus} payments</h3></div>
            ) : (
              <div className="table-container">
                <table>
                  <thead><tr><th>Store</th><th>Plan</th><th>Amount</th><th>Method</th><th>TXN ID</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {payments.map(r => (
                      <tr key={r._id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{r.adminName}</div>
                          <div className="text-muted text-sm">{r.adminEmail}</div>
                        </td>
                        <td><span className="badge badge-accent">{r.plan}</span></td>
                        <td className="fw-bold">{PKR(r.amount)}</td>
                        <td className="text-sm">{r.paymentMethod}</td>
                        <td><code style={{ fontSize: 12 }}>{r.transactionId}</code></td>
                        <td className="text-sm">{fmtDate(r.createdAt)}</td>
                        <td>
                          <span className={`badge ${r.status === 'approved' ? 'badge-success' : r.status === 'rejected' ? 'badge-danger' : 'badge-warning'}`}>
                            {r.status}
                          </span>
                          {r.rejectionReason && <div className="text-muted text-sm" style={{ marginTop: 2 }}>{r.rejectionReason}</div>}
                        </td>
                        <td>
                          {r.status === 'pending' && (
                            <div className="table-actions">
                              <button className="btn btn-success btn-sm" onClick={() => handleApprove(r._id)}>
                                <MdCheckCircle /> Approve
                              </button>
                              <button className="btn btn-danger btn-sm"
                                onClick={() => { const reason = prompt('Rejection reason:'); if (reason !== null) handleReject(r._id, reason); }}>
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
        </div>
      )}

      {/* ══════════════ TICKETS TAB ══════════════ */}
      {tab === 'tickets' && (
        <div>
          <div className="flex gap-2" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
            {['', 'Open', 'In Progress', 'Resolved', 'Closed'].map(s => (
              <button key={s} className={`pill${ticketStatus === s ? ' active' : ''}`}
                onClick={() => setTicketStatus(s)}>{s || 'All'}</button>
            ))}
          </div>

          <div className="card">
            {tickets.length === 0 ? (
              <div className="empty-state"><MdSupportAgent size={48} style={{ opacity: 0.3 }} /><h3>No tickets found</h3></div>
            ) : (
              <div className="table-container">
                <table>
                  <thead><tr><th>Subject</th><th>Store</th><th>Category</th><th>Priority</th><th>Replies</th><th>Updated</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {tickets.map(t => (
                      <tr key={t._id}>
                        <td style={{ fontWeight: 600, maxWidth: 200 }}>{t.subject}</td>
                        <td>
                          <div className="text-sm">{t.storeName}</div>
                          <div className="text-muted text-sm">{t.storeEmail}</div>
                        </td>
                        <td><span className="badge badge-default text-sm">{t.category}</span></td>
                        <td><span className={`badge ${PRIORITY_BADGE[t.priority]}`}>{t.priority}</span></td>
                        <td>{t.replyCount}</td>
                        <td className="text-sm">{fmtDate(t.updatedAt)}</td>
                        <td><span className={`badge ${STATUS_BADGE[t.status]}`}>{t.status}</span></td>
                        <td>
                          <button className="btn btn-primary btn-sm" onClick={() => setViewTicket(t._id)}>
                            <MdReply /> Reply
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      {viewStore && (
        <StoreModal
          store={viewStore}
          onClose={() => setViewStore(null)}
          onUpdated={() => { fetchStores(); fetchAnalytics(); }}
        />
      )}

      {viewTicket && (
        <TicketModal
          ticketId={viewTicket}
          onClose={() => setViewTicket(null)}
          onUpdated={() => fetchTickets()}
        />
      )}
    </div>
  );
}