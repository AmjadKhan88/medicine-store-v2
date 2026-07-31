import { useState, useEffect, useCallback } from 'react';
import {
  MdHistory, MdSearch, MdFilterList, MdDelete,
  MdMedicalServices, MdReceipt, MdPeople, MdInventory,
  MdShoppingCart, MdSecurity, MdExpandMore, MdExpandLess,
  MdCalendarToday,
} from 'react-icons/md';
import toast from 'react-hot-toast';
import API from '../utils/api';
import ShortLoader from '../Components/ShortLoader';

/* ── Config ── */
const CATEGORY_CONFIG = {
  Medicine: { color: 'var(--accent)',   bg: 'var(--accent-light)', icon: <MdMedicalServices />, label: 'Medicine'  },
  Billing:  { color: 'var(--success)',  bg: 'var(--success-bg)',   icon: <MdReceipt />,         label: 'Billing'   },
  Patient:  { color: 'var(--info)',     bg: 'var(--info-bg)',      icon: <MdPeople />,          label: 'Patient'   },
  Stock:    { color: 'var(--warning)',  bg: 'var(--warning-bg)',   icon: <MdInventory />,       label: 'Stock'     },
  Purchase: { color: '#8b5cf6',        bg: '#ede9fe',             icon: <MdShoppingCart />,    label: 'Purchase'  },
  Auth:     { color: 'var(--text-muted)', bg: 'var(--bg-tertiary)', icon: <MdSecurity />,      label: 'Auth'      },
};

const ACTION_LABELS = {
  MEDICINE_ADDED:            'Medicine Added',
  MEDICINE_UPDATED:          'Medicine Updated',
  MEDICINE_DELETED:          'Medicine Deleted',
  STOCK_UPDATED:             'Stock Updated',
  STOCK_RECEIVED:            'Stock Received',
  BILL_CREATED:              'Invoice Created',
  BILL_DELETED:              'Invoice Deleted',
  PAYMENT_RECORDED:          'Payment Recorded',
  PATIENT_REGISTERED:        'Patient Registered',
  PATIENT_UPDATED:           'Patient Updated',
  PATIENT_DELETED:           'Patient Deleted',
  PURCHASE_ORDER_CREATED:    'Purchase Order Created',
  PURCHASE_ORDER_CANCELLED:  'Purchase Order Cancelled',
  USER_LOGIN:                'User Login',
  USER_REGISTERED:           'User Registered',
};

/* ── Relative time ── */
function relTime(date) {
  const d    = new Date(date);
  const diff = (new Date() - d) / 1000;
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800)return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fullDate(date) {
  return new Date(date).toLocaleString('en-PK', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

/* ── Meta renderer ── */
function MetaDetail({ meta }) {
  if (!meta || Object.keys(meta).length === 0) return null;
  const skip = ['__v'];
  return (
    <div style={{
      marginTop: 8,
      padding: '10px 12px',
      background: 'var(--bg-primary)',
      borderRadius: 8,
      border: '1px solid var(--border-light)',
    }}>
      {Object.entries(meta).filter(([k]) => !skip.includes(k)).map(([key, value]) => {
        if (value === null || value === undefined) return null;
        const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());

        // changes object (old → new)
        if (key === 'changes' && typeof value === 'object') {
          return (
            <div key={key} style={{ marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>CHANGES</span>
              {Object.entries(value).map(([field, change]) => (
                <div key={field} style={{ fontSize: 12, display: 'flex', gap: 6, alignItems: 'center', marginTop: 3 }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{field}:</span>
                  <span style={{ color: 'var(--danger)', textDecoration: 'line-through' }}>{String(change.from)}</span>
                  <span style={{ color: 'var(--text-muted)' }}>→</span>
                  <span style={{ color: 'var(--success)', fontWeight: 600 }}>{String(change.to)}</span>
                </div>
              ))}
            </div>
          );
        }

        return (
          <div key={key} style={{
            display: 'flex', gap: 8, alignItems: 'flex-start',
            fontSize: 12, marginBottom: 3,
          }}>
            <span style={{ color: 'var(--text-muted)', minWidth: 110, fontWeight: 600, flexShrink: 0 }}>
              {label}
            </span>
            <span style={{ color: 'var(--text-primary)' }}>
              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Single log row ── */
function LogRow({ log, isLast }) {
  const [expanded, setExpanded] = useState(false);
  const cfg   = CATEGORY_CONFIG[log.category] || CATEGORY_CONFIG.Auth;
  const hasMeta = log.meta && Object.keys(log.meta).length > 0;

  return (
    <div style={{ display: 'flex', gap: 0 }}>
      {/* Timeline line + dot */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginRight: 16, flexShrink: 0 }}>
        <div style={{
          width: 36, height: 36,
          borderRadius: '50%',
          background: cfg.bg,
          border: `2px solid ${cfg.color}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: cfg.color, fontSize: 16, flexShrink: 0,
          zIndex: 1,
        }}>
          {cfg.icon}
        </div>
        {!isLast && (
          <div style={{
            width: 2, flex: 1, minHeight: 20,
            background: 'var(--border-light)',
            margin: '4px 0',
          }} />
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, paddingBottom: isLast ? 0 : 20 }}>
        <div style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '12px 14px',
          transition: 'box-shadow 0.2s',
        }}>
          {/* Top row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ flex: 1 }}>
              {/* Action badge + category */}
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 5, flexWrap: 'wrap' }}>
                <span style={{
                  padding: '2px 9px', borderRadius: 99,
                  fontSize: 11, fontWeight: 700,
                  background: cfg.bg, color: cfg.color,
                  letterSpacing: 0.3,
                }}>
                  {ACTION_LABELS[log.action] || log.action}
                </span>
                <span style={{
                  padding: '2px 9px', borderRadius: 99,
                  fontSize: 11, fontWeight: 600,
                  background: 'var(--bg-tertiary)', color: 'var(--text-muted)',
                }}>
                  {log.category}
                </span>
                {log.entityName && (
                  <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>
                    {log.entityName}
                  </span>
                )}
              </div>

              {/* Summary */}
              <div style={{ fontSize: 13.5, color: 'var(--text-primary)', lineHeight: 1.5, fontWeight: 500 }}>
                {log.summary}
              </div>
            </div>

            {/* Right: time + user */}
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }} title={fullDate(log.createdAt)}>
                {relTime(log.createdAt)}
              </div>
              {log.performedByName && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  by {log.performedByName}
                </div>
              )}
            </div>
          </div>

          {/* Full timestamp */}
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
            <MdCalendarToday size={11} />
            {fullDate(log.createdAt)}
            {log.ip && <span style={{ marginLeft: 8 }}>· IP: {log.ip}</span>}
          </div>

          {/* Expand meta */}
          {hasMeta && (
            <button
              onClick={() => setExpanded(p => !p)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--accent)', fontSize: 12, fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 3,
                marginTop: 8, padding: 0,
                fontFamily: 'var(--font-main)',
              }}
            >
              {expanded ? <MdExpandLess size={15} /> : <MdExpandMore size={15} />}
              {expanded ? 'Hide details' : 'Show details'}
            </button>
          )}

          {expanded && <MetaDetail meta={log.meta} />}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════
   MAIN PAGE
════════════════════════════════════════════ */
export default function AuditLog() {
  const [logs, setLogs]           = useState([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading]     = useState(true);
  const [stats, setStats]         = useState({});

  // Filters
  const [search, setSearch]       = useState('');
  const [category, setCategory]   = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate]     = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Clear modal
  const [clearModal, setClearModal] = useState(false);
  const [clearDays, setClearDays]   = useState(90);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 25 };
      if (search)    params.search    = search;
      if (category)  params.category  = category;
      if (startDate) params.startDate = startDate;
      if (endDate)   params.endDate   = endDate;

      const { data } = await API.get('/audit-logs', { params });
      setLogs(data.logs);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch { toast.error('Failed to load audit logs'); }
    finally { setLoading(false); }
  }, [page, search, category, startDate, endDate]);

  const fetchStats = async () => {
    try {
      const { data } = await API.get('/audit-logs/stats');
      setStats(data.stats || {});
    } catch {}
  };

  useEffect(() => { fetchLogs(); }, [fetchLogs]);
  useEffect(() => { fetchStats(); }, []);
  useEffect(() => { setPage(1); }, [search, category, startDate, endDate]);

  const handleClearLogs = async () => {
    try {
      const { data } = await API.delete('/audit-logs/clear', { data: { days: clearDays } });
      toast.success(data.message);
      setClearModal(false);
      fetchLogs();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to clear logs');
    }
  };

  const categoryTabs = [
    { id: '', label: 'All' },
    ...Object.entries(CATEGORY_CONFIG).map(([id, cfg]) => ({ id, label: cfg.label })),
  ];

  return (
    <div>
      {/* ── Page header ── */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>Audit Log</h1>
          <p>Full history of every action performed in the system</p>
        </div>
        <div className="flex gap-2">
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowFilters(p => !p)}
          >
            <MdFilterList /> Filters
          </button>
          <button
            className="btn btn-danger btn-sm"
            onClick={() => setClearModal(true)}
          >
            <MdDelete /> Clear Old Logs
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="stat-grid" style={{ marginBottom: 20 }}>
        {[
          { label: 'Total Log Entries', value: stats.totalLogs || 0,   cls: 'blue'   },
          { label: "Today's Activity",  value: stats.todayLogs || 0,   cls: 'green'  },
          { label: 'Medicine Events',   value: (stats.byCategory || []).find(c => c._id === 'Medicine')?.count || 0, cls: 'blue'   },
          { label: 'Billing Events',    value: (stats.byCategory || []).find(c => c._id === 'Billing')?.count  || 0, cls: 'green'  },
          { label: 'Stock Events',      value: (stats.byCategory || []).find(c => c._id === 'Stock')?.count    || 0, cls: 'yellow' },
          { label: 'Patient Events',    value: (stats.byCategory || []).find(c => c._id === 'Patient')?.count  || 0, cls: 'purple' },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <div className={`stat-icon ${s.cls}`}><MdHistory /></div>
            <div>
              <div className="stat-value" style={{ fontSize: 22 }}>{s.value.toLocaleString()}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Search + filters ── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="toolbar" style={{ marginBottom: showFilters ? 14 : 0 }}>
          <div className="search-box">
            <MdSearch className="search-icon" />
            <input
              placeholder="Search by medicine, patient, invoice, user..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Category tabs */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
          {categoryTabs.map(t => (
            <button
              key={t.id}
              className={`pill${category === t.id ? ' active' : ''}`}
              onClick={() => setCategory(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Date filters */}
        {showFilters && (
          <div className="form-row" style={{ marginTop: 14, marginBottom: 0 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">From Date</label>
              <input
                className="form-control"
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">To Date</label>
              <input
                className="form-control"
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0, display: 'flex', alignItems: 'flex-end' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => { setStartDate(''); setEndDate(''); setSearch(''); setCategory(''); }}
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Timeline ── */}
      <div className="card">
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 20,
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Activity Timeline</div>
            <div className="text-muted text-sm">{total.toLocaleString()} total events</div>
          </div>
          <span className="badge badge-accent">{logs.length} shown</span>
        </div>

        {loading ? (
          <div className="flex-center" style={{ height: 200 }}>
            <ShortLoader/>
          </div>
        ) : logs.length === 0 ? (
          <div className="empty-state">
            <MdHistory size={52} style={{ opacity: 0.3, marginBottom: 16 }} />
            <h3>No activity found</h3>
            <p>Actions you perform will appear here as a timeline</p>
          </div>
        ) : (
          <div style={{ paddingLeft: 4 }}>
            {logs.map((log, idx) => (
              <LogRow
                key={log._id}
                log={log}
                isLast={idx === logs.length - 1}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination" style={{ marginTop: 24 }}>
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p = page <= 4 ? i + 1 : page - 3 + i;
              if (p < 1 || p > totalPages) return null;
              return (
                <button key={p} className={page === p ? 'active' : ''} onClick={() => setPage(p)}>
                  {p}
                </button>
              );
            })}
            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</button>
          </div>
        )}
      </div>

      {/* ── Clear logs modal ── */}
      {clearModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setClearModal(false)}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <div className="modal-title">Clear Old Logs</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setClearModal(false)}>✕</button>
            </div>

            <div className="alert alert-warning" style={{ marginBottom: 16 }}>
              <div className="alert-text">
                <strong>Admin action — this cannot be undone.</strong>
                Logs older than the selected period will be permanently deleted.
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Delete logs older than</label>
              <select
                className="form-control"
                value={clearDays}
                onChange={e => setClearDays(e.target.value)}
              >
                <option value={30}>30 days</option>
                <option value={60}>60 days</option>
                <option value={90}>90 days</option>
                <option value={180}>180 days</option>
                <option value={365}>1 year</option>
              </select>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setClearModal(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleClearLogs}>
                <MdDelete /> Delete Old Logs
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}