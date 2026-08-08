import { useState, useEffect, useCallback } from 'react';
import {
  MdAdd, MdClose, MdSearch, MdSkipNext, MdCheck,
  MdRefresh, MdPeople,
  MdPersonOff, MdMonitor,
  MdPause, MdPlayArrow, MdDelete,
} from 'react-icons/md';
import toast from 'react-hot-toast';
import API from '../utils/api';
import { useSocketEvent } from '../hooks/useSocketEvent';
import ShortLoader from '../Components/ShortLoader';

/* ── helpers ── */
const todayStr  = () => new Date().toISOString().slice(0, 10);
const fmtTime   = d  => d ? new Date(d).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' }) : '—';
const fmtMin    = m  => m != null ? (m < 60 ? `${m}m` : `${Math.floor(m/60)}h ${m%60}m`) : '—';

const STATUS_CFG = {
  Waiting:        { bg: '#e0f2fe', color: '#0ea5e9', dot: '#0ea5e9' },
  Called:         { bg: '#fef3c7', color: '#f59e0b', dot: '#f59e0b' },
  'In-Consultation':{ bg: '#d1fae5', color: '#10b981', dot: '#10b981' },
  Done:           { bg: '#f0fdf4', color: '#16a34a', dot: '#16a34a' },
  Skipped:        { bg: '#f3f4f6', color: '#6b7280', dot: '#6b7280' },
  'No-Show':      { bg: '#fee2e2', color: '#ef4444', dot: '#ef4444' },
};

const PRIORITY_CFG = {
  Normal: { color: '#64748b', bg: '#f1f5f9' },
  Urgent: { color: '#ef4444', bg: '#fee2e2' },
  VIP:    { color: '#8b5cf6', bg: '#ede9fe' },
};

/* ════════════════════════════════
   REGISTER TOKEN MODAL
════════════════════════════════ */
function RegisterModal({ onClose, onRegistered }) {
  const [patients, setPatients]   = useState([]);
  const [pSearch,  setPSearch]    = useState('');
  const [selected, setSelected]   = useState(null);
  const [form, setForm] = useState({
    patientName: '', phone: '', doctorName: '',
    department: 'General OPD', priority: 'Normal', notes: '',
  });
  const [saving, setSaving] = useState(false);
  const fld = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  useEffect(() => {
    if (pSearch.length < 2) { setPatients([]); return; }
    API.get('/patients', { params: { search: pSearch, limit: 6 } })
      .then(({ data }) => setPatients(data.patients || []))
      .catch(() => {});
  }, [pSearch]);

  const selectPatient = (p) => {
    setSelected(p);
    setPSearch('');
    setPatients([]);
    setForm(prev => ({
      ...prev,
      patientName: p.name,
      phone:       p.phone || '',
    }));
  };

  const handleRegister = async () => {
    if (!form.patientName.trim()) { toast.error('Patient name required'); return; }
    setSaving(true);
    try {
      const { data } = await API.post('/opd/register', {
        ...form,
        patientId: selected?._id || null,
      });
      toast.success(`Token ${data.token.displayToken} registered!`);
      onRegistered(data.token);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally { setSaving(false); }
  };

  const depts = ['General OPD', 'Cardiology', 'Dermatology', 'ENT',
    'Gynecology', 'Neurology', 'Orthopedics', 'Pediatrics', 'Urology', 'Other'];

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <div className="modal-title">Register Patient Token</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><MdClose /></button>
        </div>

        {/* Patient search */}
        <div className="form-group">
          <label className="form-label">Search Existing Patient (optional)</label>
          {selected ? (
            <div style={{ background: 'var(--bg-tertiary)', borderRadius: 10, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700 }}>{selected.name}</div>
                <div className="text-muted text-sm">{selected.patientId} · {selected.phone}</div>
              </div>
              <button className="btn btn-secondary btn-sm"
                onClick={() => { setSelected(null); setForm(p => ({ ...p, patientName: '', phone: '' })); }}>
                Clear
              </button>
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <div className="input-group">
                <MdSearch className="input-icon" />
                <input className="form-control" placeholder="Search registered patient..."
                  value={pSearch} onChange={e => setPSearch(e.target.value)} />
              </div>
              {patients.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 10, zIndex: 100, boxShadow: 'var(--shadow-lg)', marginTop: 4 }}>
                  {patients.map(p => (
                    <div key={p._id} style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border-light)' }}
                      onMouseDown={() => selectPatient(p)}>
                      <div style={{ fontWeight: 600 }}>{p.name}</div>
                      <div className="text-muted text-sm">{p.patientId} · {p.phone}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label required">Patient Name</label>
            <input className="form-control" value={form.patientName}
              onChange={fld('patientName')} placeholder="Walk-in patient name" />
          </div>
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input className="form-control" value={form.phone}
              onChange={fld('phone')} placeholder="03XX-XXXXXXX" />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Doctor</label>
            <input className="form-control" value={form.doctorName}
              onChange={fld('doctorName')} placeholder="Dr. Ahmed" />
          </div>
          <div className="form-group">
            <label className="form-label">Department</label>
            <select className="form-control" value={form.department} onChange={fld('department')}>
              {depts.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Priority</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {['Normal', 'Urgent', 'VIP'].map(p => {
              const cfg = PRIORITY_CFG[p];
              return (
                <button key={p}
                  onClick={() => setForm(f => ({ ...f, priority: p }))}
                  style={{
                    flex: 1, padding: '10px 0', borderRadius: 10,
                    background: form.priority === p ? cfg.color : 'var(--bg-tertiary)',
                    color: form.priority === p ? '#fff' : cfg.color,
                    border: `2px solid ${cfg.color}`,
                    fontWeight: 700, cursor: 'pointer', fontSize: 13,
                  }}>
                  {p === 'Urgent' ? '🚨 ' : p === 'VIP' ? '⭐ ' : ''}{p}
                </button>
              );
            })}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Notes</label>
          <input className="form-control" value={form.notes} onChange={fld('notes')}
            placeholder="Chief complaint or special notes..." />
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleRegister} disabled={saving || !form.patientName.trim()}>
            {saving ? 'Registering...' : 'Issue Token'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════
   TOKEN CARD
════════════════════════════════ */
function TokenCard({ token, onAction, compact = false }) {
  const [actionLoading, setActionLoading] = useState('');
  const cfg  = STATUS_CFG[token.status] || STATUS_CFG.Waiting;
  const pcfg = PRIORITY_CFG[token.priority] || PRIORITY_CFG.Normal;

  const doAction = async (action, params = {}) => {
    setActionLoading(action);
    await onAction(token._id, action, params);
    setActionLoading('');
  };

  return (
    <div style={{
      border:     `1px solid var(--border)`,
      borderLeft: `4px solid ${cfg.dot}`,
      borderRadius: 12,
      padding:    compact ? '10px 14px' : '14px 16px',
      background: 'var(--card-bg)',
      display:    'flex', alignItems: 'center', gap: 12,
    }}>
      {/* Token number badge */}
      <div style={{
        minWidth: 56, height: 56,
        background: cfg.bg, color: cfg.color,
        borderRadius: 12,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.7 }}>TOKEN</div>
        <div style={{ fontSize: 15, fontWeight: 900, lineHeight: 1 }}>{token.displayToken}</div>
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>{token.patientName}</span>
          <span style={{
            background: pcfg.bg, color: pcfg.color,
            fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 99,
          }}>
            {token.priority}
          </span>
          <span style={{
            background: cfg.bg, color: cfg.color,
            fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 99,
          }}>
            {token.status}
          </span>
        </div>
        <div className="text-muted" style={{ fontSize: 12, marginTop: 3 }}>
          {token.department}{token.doctorName ? ` · Dr. ${token.doctorName}` : ''}
        </div>
        <div className="text-muted" style={{ fontSize: 11, marginTop: 2 }}>
          Registered: {fmtTime(token.registeredAt)}
          {token.waitMinutes != null && ` · Wait: ${fmtMin(token.waitMinutes)}`}
          {token.consultMinutes != null && ` · Consult: ${fmtMin(token.consultMinutes)}`}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        {token.status === 'Waiting' && (
          <button className="btn btn-secondary btn-sm" style={{ fontSize: 11 }}
            onClick={() => doAction('call')} disabled={!!actionLoading}>
            📢 Call
          </button>
        )}
        {token.status === 'Called' && (
          <button className="btn btn-primary btn-sm" style={{ fontSize: 11 }}
            onClick={() => doAction('In-Consultation')} disabled={!!actionLoading}>
            🩺 Start
          </button>
        )}
        {token.status === 'In-Consultation' && (
          <button className="btn btn-success btn-sm" style={{ fontSize: 11 }}
            onClick={() => doAction('Done')} disabled={!!actionLoading}>
            <MdCheck size={13} /> Done
          </button>
        )}
        {['Waiting', 'Called'].includes(token.status) && (
          <>
            <button className="btn btn-secondary btn-sm" style={{ fontSize: 11 }}
              onClick={() => doAction('Skipped')} disabled={!!actionLoading}>
              Skip
            </button>
            <button className="btn btn-danger btn-sm" style={{ fontSize: 11 }}
              onClick={() => doAction('No-Show')} disabled={!!actionLoading}>
              <MdPersonOff size={13} />
            </button>
          </>
        )}
        {['Skipped', 'No-Show'].includes(token.status) && (
          <button className="btn btn-secondary btn-sm" style={{ fontSize: 11 }}
            onClick={() => doAction('Waiting')} disabled={!!actionLoading}>
            Re-Queue
          </button>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════
   MAIN PAGE
════════════════════════════════ */
export default function OPDQueue() {
  const [queue,      setQueue]      = useState(null);
  const [stats,      setStats]      = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [activeTab,  setActiveTab]  = useState('queue');
  const [filterStatus, setFilter]   = useState('');
  const [showRegister, setShowRegister] = useState(false);

  // Sound ref for "called" beep
  // const beepRef = useRef(null);

  // const socket = useSocket?.() || null;

  const fetchQueue = useCallback(async () => {
    try {
      const { data } = await API.get('/opd');
      setQueue(data.queue);
    } catch { toast.error('Failed to load queue'); }
    finally { setLoading(false); }
  }, []);

  const fetchStats = useCallback(async () => {
    API.get('/opd/stats')
      .then(({ data }) => setStats(data))
      .catch(() => {});
  }, []);

  useEffect(() => { fetchQueue(); fetchStats(); }, [fetchQueue, fetchStats]);


// Real-time socket updates using the safe hook
useSocketEvent('opd:update', (data) => {
  setQueue(prev => prev ? { ...prev, ...data } : data);
});

useSocketEvent('opd:called', (data) => {
  toast(`📢 Calling ${data.displayToken} — ${data.patientName}`, { duration: 4000 });
  // Play beep (copy the AudioContext code from the original)
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [600, 800].forEach((freq, i) => {
      const o = ctx.createOscillator();
      o.connect(ctx.destination);
      o.frequency.value = freq;
      o.start(ctx.currentTime + i * 0.15);
      o.stop(ctx.currentTime + i * 0.15 + 0.1);
    });
  } catch {}
});


  const handleCallNext = async () => {
    try {
      const { data } = await API.post('/opd/call-next');
      toast.success(data.message);
      fetchQueue();
    } catch (err) {
      toast.error(err.response?.data?.message || 'No patients waiting');
    }
  };

  const handleTokenAction = async (tokenId, action, params = {}) => {
    try {
      if (action === 'call') {
        await API.post(`/opd/${tokenId}/call`);
      } else {
        await API.patch(`/opd/${tokenId}/status`, { status: action, ...params });
      }
      fetchQueue();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    }
  };

  const handleToggleQueue = async () => {
    try {
      const { data } = await API.patch('/opd/queue/toggle');
      toast.success(data.message);
      fetchQueue();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const handleReset = async () => {
    if (!confirm('Reset today\'s queue? All tokens will be cleared.')) return;
    try {
      await API.delete('/opd/queue/reset');
      toast.success('Queue reset');
      fetchQueue();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const openDisplayScreen = () => {
    const storeId = localStorage.getItem('medistore_user')
      ? JSON.parse(localStorage.getItem('medistore_user'))?.storeId
      : null;
    if (storeId) {
      window.open(`/opd-display/${storeId}`, '_blank', 'width=1024,height=768');
    }
  };

  if (loading) return <div className="flex-center" style={{ height: 300 }}><ShortLoader text="Loading queue..."/></div>;

  const q = queue;
  const qStats = q?.stats || {};
  const tokens = q?.tokens || [];

  const filteredTokens = filterStatus
    ? tokens.filter(t => t.status === filterStatus)
    : tokens;

  // Sort: priority (Urgent > VIP > Normal), then by registration time
  const sortedTokens = [...filteredTokens].sort((a, b) => {
    const pri = { Urgent: 0, VIP: 1, Normal: 2 };
    const statusOrder = { Waiting: 0, Called: 1, 'In-Consultation': 2, Done: 3, Skipped: 4, 'No-Show': 5 };
    if (!filterStatus) {
      const so = (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0);
      if (so !== 0) return so;
    }
    const po = (pri[a.priority] || 2) - (pri[b.priority] || 2);
    if (po !== 0) return po;
    return new Date(a.registeredAt) - new Date(b.registeredAt);
  });

  const TABS = [
    { id: 'queue', label: 'Queue' },
    { id: 'stats', label: 'Statistics' },
  ];

  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>OPD Queue</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              background: q?.isOpen ? '#d1fae5' : '#fee2e2',
              color:      q?.isOpen ? '#10b981' : '#ef4444',
              padding: '3px 12px', borderRadius: 99, fontSize: 12, fontWeight: 700,
            }}>
              {q?.isOpen ? '🟢 Queue Open' : '🔴 Queue Closed'}
            </span>
            <span className="text-muted text-sm">
              {qStats.waiting || 0} waiting · {qStats.done || 0} done today
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={openDisplayScreen} title="Open display screen in new tab">
            <MdMonitor /> Display Screen
          </button>
          <button className="btn btn-secondary" onClick={fetchQueue}>
            <MdRefresh />
          </button>
          <button
            className={`btn ${q?.isOpen ? 'btn-secondary' : 'btn-primary'}`}
            onClick={handleToggleQueue}
          >
            {q?.isOpen ? <><MdPause /> Close Queue</> : <><MdPlayArrow /> Open Queue</>}
          </button>
          <button className="btn btn-primary" onClick={() => setShowRegister(true)}
            disabled={!q?.isOpen}>
            <MdAdd /> Register Token
          </button>
        </div>
      </div>

      {/* Currently serving banner */}
      {q?.currentlyServing && (
        <div style={{
          background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
          borderRadius: 16, padding: '20px 28px', marginBottom: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          color: '#fff',
        }}>
          <div>
            <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 4 }}>NOW SERVING</div>
            <div style={{ fontSize: 48, fontWeight: 900, letterSpacing: 2, lineHeight: 1 }}>
              {q.currentlyServing}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 13, opacity: 0.8 }}>Next in queue</div>
            <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>
              {tokens.find(t => t.status === 'Waiting' && (t.priority === 'Urgent' || t.priority === 'VIP') || t.status === 'Waiting')?.displayToken || '—'}
            </div>
            <button
              className="btn btn-sm"
              style={{ marginTop: 10, background: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.4)', fontSize: 13 }}
              onClick={handleCallNext}
            >
              <MdSkipNext /> Call Next
            </button>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(6, 1fr)',
        gap: 10, marginBottom: 20,
      }}>
        {[
          { label: 'Total',          value: qStats.total || 0,          color: '#64748b' },
          { label: 'Waiting',        value: qStats.waiting || 0,        color: '#0ea5e9' },
          { label: 'In Consultation',value: qStats.inConsultation || 0, color: '#10b981' },
          { label: 'Done',           value: qStats.done || 0,           color: '#16a34a' },
          { label: 'Avg Wait',       value: fmtMin(qStats.avgWaitMinutes), color: '#f59e0b' },
          { label: 'Avg Consult',    value: fmtMin(qStats.avgConsultMinutes), color: '#8b5cf6' },
        ].map(s => (
          <div key={s.label} style={{
            background: 'var(--card-bg)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '12px 14px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{
              padding: '10px 16px', background: 'none', border: 'none',
              borderBottom: activeTab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
              color: activeTab === t.id ? 'var(--accent)' : 'var(--text-muted)',
              fontWeight: activeTab === t.id ? 700 : 500, cursor: 'pointer',
              fontSize: 14, fontFamily: 'var(--font-main)',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── QUEUE TAB ── */}
      {activeTab === 'queue' && (
        <div>
          {/* Filters + Call Next */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 6, flex: 1, flexWrap: 'wrap' }}>
              <button className={`pill${filterStatus === '' ? ' active' : ''}`} onClick={() => setFilter('')}>
                All ({tokens.length})
              </button>
              {Object.keys(STATUS_CFG).map(s => {
                const count = tokens.filter(t => t.status === s).length;
                if (!count && s !== 'Waiting') return null;
                return (
                  <button key={s} className={`pill${filterStatus === s ? ' active' : ''}`}
                    onClick={() => setFilter(filterStatus === s ? '' : s)}>
                    {s} ({count})
                  </button>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" onClick={handleCallNext}
                disabled={!q?.isOpen || !qStats.waiting}>
                <MdSkipNext /> Call Next
              </button>
              <button className="btn btn-danger btn-sm" onClick={handleReset} title="Reset queue">
                <MdDelete />
              </button>
            </div>
          </div>

          {/* Token list */}
          {sortedTokens.length === 0 ? (
            <div className="empty-state">
              <MdPeople size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
              <h3>{filterStatus ? `No ${filterStatus} patients` : 'Queue is empty'}</h3>
              {!filterStatus && q?.isOpen && (
                <button className="btn btn-primary" style={{ marginTop: 12 }}
                  onClick={() => setShowRegister(true)}>
                  <MdAdd /> Register First Patient
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sortedTokens.map(token => (
                <TokenCard key={token._id} token={token} onAction={handleTokenAction} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── STATS TAB ── */}
      {activeTab === 'stats' && stats && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* 7-day trend */}
          <div className="card">
            <div style={{ fontWeight: 700, marginBottom: 16 }}>7-Day Patient Trend</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {stats.trend?.map(day => (
                <div key={day.date}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                    <span className="text-muted">{new Date(day.date).toLocaleDateString('en-PK', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                    <span style={{ fontWeight: 700 }}>{day.done}/{day.total}</span>
                  </div>
                  <div style={{ height: 8, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: day.total > 0 ? `${(day.done / Math.max(...stats.trend.map(d => d.total), 1)) * 100}%` : '0%',
                      background: 'var(--accent)', borderRadius: 99,
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Peak hours */}
          <div className="card">
            <div style={{ fontWeight: 700, marginBottom: 16 }}>Today — Peak Hours</div>
            {!stats.peakHours?.length ? (
              <div className="text-muted text-sm">No data yet for today</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {stats.peakHours.map(h => (
                  <div key={h.hour}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
                      <span className="text-muted">{String(h.hour).padStart(2, '0')}:00</span>
                      <span style={{ fontWeight: 700 }}>{h.count} patients</span>
                    </div>
                    <div style={{ height: 8, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${(h.count / Math.max(...stats.peakHours.map(x => x.count))) * 100}%`,
                        background: '#f59e0b', borderRadius: 99,
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Today summary */}
          <div className="card">
            <div style={{ fontWeight: 700, marginBottom: 16 }}>Today's Summary</div>
            {[
              { label: 'Total Registered',    value: qStats.total || 0 },
              { label: 'Seen (Done)',          value: qStats.done || 0 },
              { label: 'Still Waiting',        value: qStats.waiting || 0 },
              { label: 'Skipped / No-Show',    value: (qStats.skipped || 0) + (qStats.noShow || 0) },
              { label: 'Avg. Wait Time',       value: fmtMin(qStats.avgWaitMinutes) },
              { label: 'Avg. Consultation',    value: fmtMin(qStats.avgConsultMinutes) },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-light)', fontSize: 13 }}>
                <span className="text-muted">{label}</span>
                <span style={{ fontWeight: 700 }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Priority breakdown */}
          <div className="card">
            <div style={{ fontWeight: 700, marginBottom: 16 }}>Priority Breakdown</div>
            {['Urgent', 'VIP', 'Normal'].map(p => {
              const count = tokens.filter(t => t.priority === p).length;
              const done  = tokens.filter(t => t.priority === p && t.status === 'Done').length;
              const cfg   = PRIORITY_CFG[p];
              return (
                <div key={p} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, color: cfg.color }}>{p}</span>
                    <span className="text-muted">{done} done / {count} total</span>
                  </div>
                  <div style={{ height: 10, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: count > 0 ? `${(done / count) * 100}%` : '0%',
                      background: cfg.color, borderRadius: 99,
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Register modal */}
      {showRegister && (
        <RegisterModal
          onClose={() => setShowRegister(false)}
          onRegistered={() => { setShowRegister(false); fetchQueue(); }}
        />
      )}
    </div>
  );
}