import { useState, useEffect, useCallback } from 'react';
import {
  MdStar, MdStarBorder, MdFlag, MdReply,
  MdRefresh, MdSearch, MdDelete, MdLink,
  MdPerson, MdWarning, MdCheck,
} from 'react-icons/md';
import toast from 'react-hot-toast';
import API from '../utils/api';
import { useSocket } from '../context/SocketContext';

/* ── helpers ── */
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-PK', { day:'2-digit', month:'short', year:'numeric' }) : '—';
const fmtDT   = d => d ? `${fmtDate(d)} ${new Date(d).toLocaleTimeString('en-PK',{hour:'2-digit',minute:'2-digit'})}` : '—';
const round1  = n => n ? Math.round(n * 10) / 10 : 0;

const STATUS_CFG = {
  Submitted: { bg:'#dbeafe', color:'#3b82f6' },
  Flagged:   { bg:'#fee2e2', color:'#ef4444' },
  Responded: { bg:'#d1fae5', color:'#10b981' },
};

const STAR_COLOR = { 1:'#ef4444', 2:'#f97316', 3:'#f59e0b', 4:'#84cc16', 5:'#10b981' };

function Stars({ value, size = 16 }) {
  const color = STAR_COLOR[Math.round(value)] || '#f59e0b';
  return (
    <span style={{ color, fontSize: size }}>
      {[1,2,3,4,5].map(s => <span key={s}>{s <= Math.round(value) ? '★' : '☆'}</span>)}
    </span>
  );
}

/* ════════════════════════════════
   GENERATE LINK MODAL
════════════════════════════════ */
function GenerateLinkModal({ onClose }) {
  const [patients,  setPatients]  = useState([]);
  const [pSearch,   setPSearch]   = useState('');
  const [selected,  setSelected]  = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [form, setForm] = useState({ appointmentId:'', doctorName:'', expiryDays: 7 });
  const [link, setLink]   = useState('');
  const [saving, setSaving] = useState(false);
  const fld = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  useEffect(() => {
    if (pSearch.length < 2) { setPatients([]); return; }
    API.get('/patients', { params: { search: pSearch, limit: 6 } })
      .then(({ data }) => setPatients(data.patients || []))
      .catch(() => {});
  }, [pSearch]);

  useEffect(() => {
    if (!selected) return;
    API.get('/appointments', { params: { patientId: selected._id, status:'Completed', limit:5 } })
      .then(({ data }) => setAppointments(data.appointments || []))
      .catch(() => {});
  }, [selected]);

  const handleGenerate = async () => {
    if (!selected) { toast.error('Select a patient'); return; }
    setSaving(true);
    try {
      const { data } = await API.post('/feedback/generate', {
        patientId:     selected._id,
        appointmentId: form.appointmentId || undefined,
        doctorName:    form.doctorName || selected.doctor || '',
        expiryDays:    Number(form.expiryDays),
      });
      setLink(data.link);
      toast.success('Feedback link generated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  const copy = () => {
    navigator.clipboard.writeText(link);
    toast.success('Link copied!');
  };

  const whatsapp = () => {
    if (!selected?.phone) { toast.error('Patient has no phone number'); return; }
    const phone = selected.phone.replace(/[^0-9]/g, '');
    const formatted = phone.startsWith('0') ? `92${phone.slice(1)}` : `92${phone}`;
    const msg = encodeURIComponent(
      `Dear ${selected.name},\n\nWe hope you're feeling better! Please take a moment to rate your recent visit:\n\n${link}\n\nYour feedback helps us improve our services. Thank you!\n\n— ${selected.doctor || 'Your Clinic'}`
    );
    window.open(`https://wa.me/${formatted}?text=${msg}`, '_blank', 'noopener');
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <div className="modal-title">Generate Feedback Link</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><span>✕</span></button>
        </div>

        {!link ? (
          <>
            {/* Patient search */}
            <div className="form-group">
              <label className="form-label required">Patient</label>
              {selected ? (
                <div style={{ background:'var(--bg-tertiary)', borderRadius:10, padding:'10px 14px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <div style={{ fontWeight:700 }}>{selected.name}</div>
                    <div className="text-muted text-sm">{selected.patientId} · {selected.phone}</div>
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={() => { setSelected(null); setPSearch(''); setAppointments([]); setForm(p => ({ ...p, appointmentId:'' })); }}>Change</button>
                </div>
              ) : (
                <div style={{ position:'relative' }}>
                  <div className="input-group">
                    <MdSearch className="input-icon" />
                    <input className="form-control" placeholder="Search patient..." value={pSearch} onChange={e => setPSearch(e.target.value)} autoFocus />
                  </div>
                  {patients.length > 0 && (
                    <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'var(--card-bg)', border:'1px solid var(--border)', borderRadius:10, zIndex:100, boxShadow:'var(--shadow-lg)', marginTop:4 }}>
                      {patients.map(p => (
                        <div key={p._id} style={{ padding:'10px 14px', cursor:'pointer', borderBottom:'1px solid var(--border-light)' }}
                          onMouseDown={() => { setSelected(p); setPSearch(''); setPatients([]); }}>
                          <div style={{ fontWeight:600 }}>{p.name}</div>
                          <div className="text-muted text-sm">{p.patientId} · {p.phone}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Link to appointment */}
            {appointments.length > 0 && (
              <div className="form-group">
                <label className="form-label">Link to Appointment (optional)</label>
                <select className="form-control" value={form.appointmentId} onChange={fld('appointmentId')}>
                  <option value="">General feedback</option>
                  {appointments.map(a => (
                    <option key={a._id} value={a._id}>
                      {new Date(a.date).toLocaleDateString()} · Dr. {a.doctorName} · {a.type}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Doctor Name</label>
                <input className="form-control" value={form.doctorName} onChange={fld('doctorName')} placeholder="Dr. Ahmed Khan" />
              </div>
              <div className="form-group">
                <label className="form-label">Link Valid (days)</label>
                <select className="form-control" value={form.expiryDays} onChange={fld('expiryDays')}>
                  {[3, 7, 14, 30].map(d => <option key={d} value={d}>{d} days</option>)}
                </select>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary" onClick={handleGenerate} disabled={saving || !selected}>
                {saving ? 'Generating...' : <><MdLink /> Generate Link</>}
              </button>
            </div>
          </>
        ) : (
          /* Link generated view */
          <div>
            <div style={{ textAlign:'center', padding:'12px 0 16px' }}>
              <div style={{ fontSize:48, marginBottom:8 }}>🔗</div>
              <div style={{ fontWeight:700, color:'#10b981' }}>Feedback link ready!</div>
              <div className="text-muted text-sm" style={{ marginTop:4 }}>Send this to {selected?.name}</div>
            </div>

            <div style={{ display:'flex', gap:8, marginBottom:14 }}>
              <input className="form-control" value={link} readOnly style={{ flex:1, fontSize:12 }} />
              <button className="btn btn-secondary" onClick={copy}>Copy</button>
            </div>

            <div style={{ display:'flex', gap:8 }}>
              <button className="btn btn-primary" style={{ flex:1, background:'#25d366' }} onClick={whatsapp}>
                💬 Send via WhatsApp
              </button>
              <button className="btn btn-secondary" style={{ flex:1 }} onClick={() => window.open(link, '_blank', 'noopener')}>
                🔗 Preview Form
              </button>
            </div>

            <button className="btn btn-ghost btn-sm" style={{ width:'100%', marginTop:10 }} onClick={onClose}>Done</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════
   FEEDBACK CARD
════════════════════════════════ */
function FeedbackCard({ item, onRespond, onFlag, onDelete, onRefresh }) {
  const [showReply, setShowReply]   = useState(false);
  const [replyText, setReplyText]   = useState('');
  const [saving,    setSaving]      = useState(false);
  const sc = STATUS_CFG[item.status] || STATUS_CFG.Submitted;

  const handleRespond = async () => {
    if (!replyText.trim()) { toast.error('Response text required'); return; }
    setSaving(true);
    try {
      await API.post(`/feedback/${item._id}/respond`, { response: replyText });
      toast.success('Response saved');
      setShowReply(false);
      onRefresh();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const displayName = item.isAnonymous ? 'Anonymous Patient' : (item.patientName || 'Patient');
  const starColor   = STAR_COLOR[item.overallRating] || '#f59e0b';

  return (
    <div style={{
      border: `1px solid ${item.isFlagged ? '#fca5a5' : 'var(--border)'}`,
      borderLeft: `5px solid ${item.isFlagged ? '#ef4444' : starColor}`,
      borderRadius: 14, padding: '16px 18px',
      background: item.isFlagged ? '#fff9f9' : 'var(--card-bg)',
    }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
            <Stars value={item.overallRating} size={20} />
            <span style={{ fontWeight:800, fontSize:16, color:starColor }}>{item.overallRating}/5</span>
            <span style={{ background:sc.bg, color:sc.color, padding:'2px 8px', borderRadius:99, fontSize:11, fontWeight:700 }}>{item.status}</span>
            {item.isFlagged && <span style={{ background:'#fee2e2', color:'#ef4444', padding:'2px 8px', borderRadius:99, fontSize:11, fontWeight:700 }}>🚨 Flagged</span>}
          </div>
          <div style={{ marginTop:4, fontSize:13, color:'var(--text-muted)' }}>
            <span style={{ fontWeight:600 }}>{displayName}</span>
            {item.doctorName && <span> · Dr. {item.doctorName}</span>}
            <span> · {fmtDT(item.submittedAt)}</span>
          </div>
        </div>

        <div style={{ display:'flex', gap:4 }}>
          {!item.isFlagged && (
            <button className="btn btn-ghost btn-sm btn-icon" title="Flag" onClick={() => onFlag(item._id, false)}>
              <MdFlag size={15} style={{ color:'#f59e0b' }} />
            </button>
          )}
          {item.isFlagged && (
            <button className="btn btn-ghost btn-sm btn-icon" title="Unflag" onClick={() => onFlag(item._id, true)}>
              <MdCheck size={15} style={{ color:'#10b981' }} />
            </button>
          )}
          {!item.response && (
            <button className="btn btn-ghost btn-sm btn-icon" title="Reply" onClick={() => setShowReply(p => !p)}>
              <MdReply size={15} style={{ color:'var(--accent)' }} />
            </button>
          )}
          <button className="btn btn-ghost btn-sm btn-icon" title="Delete" onClick={() => onDelete(item._id)}>
            <MdDelete size={15} style={{ color:'var(--danger)' }} />
          </button>
        </div>
      </div>

      {/* Sub-ratings */}
      {(item.doctorRating || item.staffRating || item.cleanlinessRating || item.waitTimeRating) && (
        <div style={{ display:'flex', gap:16, flexWrap:'wrap', marginBottom:10 }}>
          {[
            ['👨‍⚕️ Doctor',  item.doctorRating],
            ['👩‍💼 Staff',   item.staffRating],
            ['🧹 Cleanliness',item.cleanlinessRating],
            ['⏱ Wait Time', item.waitTimeRating],
          ].filter(([,v]) => v).map(([label, val]) => (
            <div key={label} style={{ fontSize:12 }}>
              <span className="text-muted">{label}: </span>
              <span style={{ fontWeight:700, color:STAR_COLOR[val] }}>{'★'.repeat(val)}{'☆'.repeat(5-val)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Review text */}
      {item.review && (
        <div style={{ fontSize:14, color:'var(--text-primary)', lineHeight:1.7, padding:'10px 14px', background:'var(--bg-tertiary)', borderRadius:10, marginBottom:10 }}>
          "{item.review}"
        </div>
      )}

      {/* Flag reason */}
      {item.flagReason && (
        <div style={{ fontSize:12, color:'#ef4444', marginBottom:8 }}>
          🚨 Flag reason: {item.flagReason}
        </div>
      )}

      {/* Clinic response */}
      {item.response && (
        <div style={{ background:'#f0fdf4', border:'1px solid #86efac', borderRadius:10, padding:'10px 14px', marginBottom:8 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'#10b981', marginBottom:4 }}>
            ✓ Response by {item.respondedByName} · {fmtDT(item.respondedAt)}
          </div>
          <div style={{ fontSize:13, color:'#166534', lineHeight:1.6 }}>{item.response}</div>
        </div>
      )}

      {/* Reply form */}
      {showReply && !item.response && (
        <div style={{ marginTop:8 }}>
          <textarea className="form-control" rows={2} value={replyText}
            onChange={e => setReplyText(e.target.value)}
            placeholder="Write your response to this patient's feedback..." />
          <div style={{ display:'flex', gap:6, marginTop:6 }}>
            <button className="btn btn-primary btn-sm" onClick={handleRespond} disabled={saving}>
              {saving ? 'Saving...' : 'Send Response'}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowReply(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════
   MAIN PAGE
════════════════════════════════ */
export default function FeedbackManagement() {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats,     setStats]     = useState(null);
  const [feedback,  setFeedback]  = useState([]);
  const [total,     setTotal]     = useState(0);
  const [totalPages,setTotalPages]= useState(1);
  const [page,      setPage]      = useState(1);
  const [loading,   setLoading]   = useState(true);
  const [genModal,  setGenModal]  = useState(false);

  const [statusFilter, setStatusFilter] = useState('');
  const [ratingFilter, setRatingFilter] = useState('');
  const [flagged,      setFlagged]      = useState(false);
  const [search,       setSearch]       = useState('');

  const { on } = useSocket() || {};

  const fetchStats = useCallback(() => {
    API.get('/feedback/stats').then(({ data }) => setStats(data.stats)).catch(() => {});
  }, []);

  const fetchFeedback = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (statusFilter) params.status = statusFilter;
      if (ratingFilter) params.rating = ratingFilter;
      if (flagged)      params.flagged = 'true';
      if (search)       params.doctorName = search;
      const { data } = await API.get('/feedback', { params });
      setFeedback(data.feedback || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch {}
    finally { setLoading(false); }
  }, [page, statusFilter, ratingFilter, flagged, search]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchFeedback(); }, [fetchFeedback]);
  useEffect(() => { setPage(1); }, [statusFilter, ratingFilter, flagged, search]);

  /* Real-time negative feedback alert */
  useEffect(() => {
    if (!on) return;
    const unsub = on('feedback:negative', (data) => {
      toast.error(
        `🚨 Negative feedback (${data.rating}⭐) from ${data.patientName}${data.doctorName ? ` for Dr. ${data.doctorName}` : ''}!`,
        { duration: 8000 }
      );
      fetchStats();
      if (activeTab === 'reviews') fetchFeedback();
    });
    return () => unsub && unsub();
  }, [on, fetchStats, fetchFeedback, activeTab]);

  const handleFlag = async (id, unflag) => {
    try {
      await API.patch(`/feedback/${id}/flag`, { unflag });
      toast.success(unflag ? 'Flag removed' : 'Feedback flagged');
      fetchFeedback(); fetchStats();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this feedback?')) return;
    try {
      await API.delete(`/feedback/${id}`);
      toast.success('Deleted');
      fetchFeedback(); fetchStats();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const TABS = [
    { id:'overview', label:'Overview'  },
    { id:'reviews',  label:'Reviews'   },
    { id:'doctors',  label:'Doctors'   },
    { id:'trend',    label:'Trend'     },
  ];

  const flaggedCount = stats?.overall?.flagged || 0;

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>⭐ Patient Feedback & Ratings</h1>
          <p>
            {stats?.totalSubmitted || 0} total reviews ·
            {flaggedCount > 0 && <span style={{ color:'#ef4444', fontWeight:700 }}> {flaggedCount} flagged</span>}
            {' '}· Overall: {round1(stats?.overall?.avgOverall)}/5 ⭐
          </p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => { fetchStats(); fetchFeedback(); }}><MdRefresh /></button>
          <button className="btn btn-primary" onClick={() => setGenModal(true)}>
            <MdLink /> Generate Feedback Link
          </button>
        </div>
      </div>

      {/* Flagged alert */}
      {flaggedCount > 0 && (
        <div style={{ background:'#fee2e2', border:'1px solid #fca5a5', borderRadius:12, padding:'12px 16px', marginBottom:16, display:'flex', alignItems:'center', gap:12 }}>
          <MdWarning size={22} style={{ color:'#ef4444', flexShrink:0 }} />
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:700, color:'#dc2626' }}>🚨 {flaggedCount} negative review{flaggedCount > 1 ? 's' : ''} need attention</div>
            <div style={{ fontSize:12, color:'#991b1b' }}>Click "Reviews" tab and filter by Flagged to respond</div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => { setActiveTab('reviews'); setFlagged(true); }}>
            View Flagged
          </button>
        </div>
      )}

      {/* Stats cards */}
      <div className="stat-grid" style={{ marginBottom:20 }}>
        {[
          { label:'Overall Rating',   value:`${round1(stats?.overall?.avgOverall)}/5`,  color:'#f59e0b', icon:'⭐' },
          { label:'Total Reviews',    value:stats?.totalSubmitted || 0,                  color:'#0ea5e9', icon:'💬' },
          { label:'Flagged',          value:flaggedCount,                                color:'#ef4444', icon:'🚨' },
          { label:'Doctor Rating',    value:`${round1(stats?.overall?.avgDoctor)}/5`,   color:'#10b981', icon:'👨‍⚕️' },
          { label:'Staff Rating',     value:`${round1(stats?.overall?.avgStaff)}/5`,    color:'#8b5cf6', icon:'👩‍💼' },
          { label:'Wait Time Rating', value:`${round1(stats?.overall?.avgWaitTime)}/5`, color:'#6366f1', icon:'⏱' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background:s.color+'20', fontSize:20 }}>{s.icon}</div>
            <div>
              <div className="stat-value" style={{ color:s.color, fontSize: typeof s.value==='string'?18:24 }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:20, borderBottom:'1px solid var(--border)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{ padding:'10px 16px', background:'none', border:'none', borderBottom: activeTab===t.id?'2px solid var(--accent)':'2px solid transparent', color: activeTab===t.id?'var(--accent)':'var(--text-muted)', fontWeight: activeTab===t.id?700:500, cursor:'pointer', fontSize:14, fontFamily:'var(--font-main)' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === 'overview' && stats && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          {/* Rating breakdown */}
          <div className="card">
            <div style={{ fontWeight:700, marginBottom:12 }}>Rating Breakdown</div>
            {(stats.byRating || []).map(r => (
              <div key={r.stars} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                <span style={{ fontSize:14, color:STAR_COLOR[r.stars], fontWeight:700, minWidth:20 }}>{r.stars}★</span>
                <div style={{ flex:1, height:10, background:'var(--border)', borderRadius:99, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${r.percent}%`, background:STAR_COLOR[r.stars], borderRadius:99, transition:'width 0.5s' }} />
                </div>
                <span style={{ fontSize:12, color:'var(--text-muted)', minWidth:60 }}>{r.count} ({r.percent}%)</span>
              </div>
            ))}
          </div>

          {/* Category averages */}
          <div className="card">
            <div style={{ fontWeight:700, marginBottom:12 }}>Average Ratings</div>
            {[
              { label:'Overall',     value:stats.overall?.avgOverall,     icon:'⭐' },
              { label:'Doctor',      value:stats.overall?.avgDoctor,      icon:'👨‍⚕️' },
              { label:'Staff',       value:stats.overall?.avgStaff,       icon:'👩‍💼' },
              { label:'Cleanliness', value:stats.overall?.avgCleanliness, icon:'🧹' },
              { label:'Wait Time',   value:stats.overall?.avgWaitTime,    icon:'⏱' },
            ].filter(s => s.value).map(s => {
              const rounded = round1(s.value);
              const color   = rounded >= 4 ? '#10b981' : rounded >= 3 ? '#f59e0b' : '#ef4444';
              return (
                <div key={s.label} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                  <span style={{ fontSize:18, minWidth:28 }}>{s.icon}</span>
                  <span style={{ flex:1, fontSize:13, fontWeight:500 }}>{s.label}</span>
                  <div style={{ width:100, height:8, background:'var(--border)', borderRadius:99, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${(rounded/5)*100}%`, background:color, borderRadius:99 }} />
                  </div>
                  <span style={{ fontWeight:800, color, fontSize:14, minWidth:30 }}>{rounded}</span>
                </div>
              );
            })}
          </div>

          {/* Recent negative */}
          {stats.recentNegative?.length > 0 && (
            <div className="card" style={{ gridColumn:'1/-1' }}>
              <div style={{ fontWeight:700, marginBottom:10, color:'#ef4444' }}>🚨 Recent Negative Feedback</div>
              {stats.recentNegative.map(f => (
                <div key={f._id} style={{ display:'flex', gap:10, padding:'8px 0', borderBottom:'1px solid var(--border-light)', fontSize:13 }}>
                  <span style={{ color:STAR_COLOR[f.overallRating], fontWeight:700 }}>{f.overallRating}★</span>
                  <span style={{ fontWeight:600 }}>{f.isAnonymous ? 'Anonymous' : f.patientName}</span>
                  {f.doctorName && <span className="text-muted">· Dr. {f.doctorName}</span>}
                  {f.review && <span className="text-muted" style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>"{f.review}"</span>}
                  <span className="text-muted">{fmtDate(f.submittedAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── REVIEWS TAB ── */}
      {activeTab === 'reviews' && (
        <div>
          {/* Filters */}
          <div className="card" style={{ marginBottom:14 }}>
            <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
              <div className="search-box" style={{ flex:1, minWidth:180 }}>
                <MdSearch className="search-icon" />
                <input placeholder="Filter by doctor name..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <select className="form-control" style={{ width:140 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="">All Status</option>
                {['Submitted','Flagged','Responded'].map(s => <option key={s}>{s}</option>)}
              </select>
              <select className="form-control" style={{ width:120 }} value={ratingFilter} onChange={e => setRatingFilter(e.target.value)}>
                <option value="">All Ratings</option>
                {[5,4,3,2,1].map(r => <option key={r} value={r}>{r} ★</option>)}
              </select>
            </div>
            <div style={{ display:'flex', gap:8, marginTop:10 }}>
              <button className={`pill${!flagged?' active':''}`} onClick={() => setFlagged(false)}>All</button>
              <button className={`pill${flagged?' active':''}`}
                onClick={() => setFlagged(p => !p)}
                style={{ background: flagged?'#ef4444':'', color: flagged?'#fff':'' }}>
                🚨 Flagged Only
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex-center" style={{ height:200 }}><div className="text-muted">Loading...</div></div>
          ) : feedback.length === 0 ? (
            <div className="empty-state">
              <MdStar size={52} style={{ opacity:0.3, marginBottom:12 }} />
              <h3>No reviews found</h3>
              <p>Generate feedback links after patient visits to collect reviews</p>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {feedback.map(item => (
                <FeedbackCard key={item._id} item={item}
                  onFlag={handleFlag}
                  onDelete={handleDelete}
                  onRefresh={() => { fetchFeedback(); fetchStats(); }}
                />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="pagination" style={{ marginTop:14 }}>
              <button disabled={page===1} onClick={() => setPage(p=>p-1)}>‹</button>
              {Array.from({length:totalPages},(_,i)=>i+1).map(p=>(
                <button key={p} className={page===p?'active':''} onClick={() => setPage(p)}>{p}</button>
              ))}
              <button disabled={page===totalPages} onClick={() => setPage(p=>p+1)}>›</button>
            </div>
          )}
        </div>
      )}

      {/* ── DOCTORS TAB ── */}
      {activeTab === 'doctors' && (
        <div>
          {!stats?.byDoctor?.length ? (
            <div className="empty-state">
              <MdPerson size={48} style={{ opacity:0.3, marginBottom:12 }} />
              <h3>No doctor ratings yet</h3>
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px,1fr))', gap:14 }}>
              {stats.byDoctor.map((d, i) => {
                const color = d.avgRating >= 4 ? '#10b981' : d.avgRating >= 3 ? '#f59e0b' : '#ef4444';
                return (
                  <div key={d._id} style={{ border:`1px solid var(--border)`, borderTop:`4px solid ${color}`, borderRadius:14, padding:16, background:'var(--card-bg)' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                      <div>
                        <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:2 }}>#{i+1}</div>
                        <div style={{ fontWeight:800, fontSize:16 }}>Dr. {d._id}</div>
                        <div className="text-muted text-sm">{d.count} review{d.count !== 1 ? 's' : ''}</div>
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <div style={{ fontSize:32, fontWeight:900, color, lineHeight:1 }}>{round1(d.avgRating)}</div>
                        <div style={{ fontSize:11, color:'var(--text-muted)' }}>/ 5.0</div>
                      </div>
                    </div>

                    <Stars value={d.avgRating} size={18} />

                    <div style={{ marginTop:10, display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                      {[
                        { label:'Doctor Skill',  value:round1(d.doctorAvg), icon:'🩺' },
                        { label:'Negative',      value:d.negative,          icon:'⚠️', color:'#ef4444' },
                      ].map(({ label, value, icon, color: c }) => (
                        <div key={label} style={{ background:'var(--bg-tertiary)', borderRadius:8, padding:'8px 10px', textAlign:'center' }}>
                          <div style={{ fontSize:16 }}>{icon}</div>
                          <div style={{ fontWeight:800, fontSize:14, color: c || 'var(--text-primary)' }}>{value}</div>
                          <div style={{ fontSize:10, color:'var(--text-muted)' }}>{label}</div>
                        </div>
                      ))}
                    </div>

                    {d.negative > 0 && (
                      <div style={{ marginTop:10, background:'#fff5f5', borderRadius:8, padding:'6px 10px', fontSize:12, color:'#ef4444' }}>
                        {d.negative} negative review{d.negative > 1 ? 's' : ''} need attention
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TREND TAB ── */}
      {activeTab === 'trend' && (
        <div>
          {!stats?.trend?.length ? (
            <div className="empty-state"><MdStar size={48} style={{ opacity:0.3, marginBottom:12 }} /><h3>No trend data yet</h3></div>
          ) : (
            <div className="card">
              <div style={{ fontWeight:700, marginBottom:16 }}>Monthly Satisfaction Trend</div>
              {stats.trend.map(m => (
                <div key={m.label} style={{ display:'flex', alignItems:'center', gap:12, marginBottom:10 }}>
                  <div style={{ minWidth:36, fontSize:13, color:'var(--text-muted)', fontWeight:600 }}>{m.label}</div>
                  <div style={{ flex:1, height:24, background:'var(--border)', borderRadius:99, overflow:'hidden', position:'relative' }}>
                    <div style={{
                      height:'100%',
                      width:`${(m.avgRating/5)*100}%`,
                      background: m.avgRating >= 4 ? '#10b981' : m.avgRating >= 3 ? '#f59e0b' : '#ef4444',
                      borderRadius:99,
                      display:'flex', alignItems:'center', paddingLeft:8,
                    }}>
                      <span style={{ fontSize:11, fontWeight:700, color:'#fff' }}>{m.avgRating}★</span>
                    </div>
                  </div>
                  <div style={{ minWidth:60, fontSize:12, color:'var(--text-muted)', textAlign:'right' }}>{m.count} reviews</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Generate link modal */}
      {genModal && <GenerateLinkModal onClose={() => { setGenModal(false); fetchStats(); fetchFeedback(); }} />}
    </div>
  );
}