import { useState, useEffect, useCallback } from 'react';
import {
  MdAdd, MdClose, MdEdit, MdDelete, MdCheck,
  MdRefresh, MdLink, MdPeople, MdSettings,
  MdSchedule, MdToggleOn, MdToggleOff,
} from 'react-icons/md';
import toast from 'react-hot-toast';
import API from '../utils/api';
import ShortLoader from '../Components/ShortLoader';

/* ── helpers ── */
const fmtPKR  = n => `₨${Math.round(Number(n||0)).toLocaleString()}`;
const DAY_NAMES  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const FULL_DAYS  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

const DEFAULT_SLOTS = [
  '08:00 AM','08:30 AM','09:00 AM','09:30 AM','10:00 AM','10:30 AM',
  '11:00 AM','11:30 AM','12:00 PM','12:30 PM','02:00 PM','02:30 PM',
  '03:00 PM','03:30 PM','04:00 PM','04:30 PM','05:00 PM','05:30 PM',
  '06:00 PM','06:30 PM','07:00 PM','07:30 PM','08:00 PM',
];

/* ════════════════════════════════
   DOCTOR MODAL
════════════════════════════════ */
function DoctorModal({ existing, onClose, onSaved }) {
  const [form, setForm] = useState({
    name:            existing?.name            || '',
    specialization:  existing?.specialization  || '',
    qualification:   existing?.qualification   || '',
    consultFee:      existing?.consultFee      || '',
    maxPerSlot:      existing?.maxPerSlot      || 1,
    bio:             existing?.bio             || '',
    availableDays:   existing?.availableDays   || [0,1,2,3,4,5,6],
    timeSlots:       existing?.timeSlots?.map(s => ({ time: s.time, isActive: s.isActive !== false })) || [],
    isActive:        existing?.isActive !== false,
  });
  const [saving, setSaving] = useState(false);
  const fld = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const toggleDay = d => setForm(p => ({
    ...p,
    availableDays: p.availableDays.includes(d)
      ? p.availableDays.filter(x => x !== d)
      : [...p.availableDays, d].sort(),
  }));

  const toggleSlot = time => {
    const existing = form.timeSlots.find(s => s.time === time);
    if (existing) {
      setForm(p => ({ ...p, timeSlots: p.timeSlots.filter(s => s.time !== time) }));
    } else {
      setForm(p => ({ ...p, timeSlots: [...p.timeSlots, { time, isActive: true }] }));
    }
  };

  const hasSlot = time => form.timeSlots.some(s => s.time === time);

  const handle = async () => {
    if (!form.name.trim()) { toast.error('Doctor name required'); return; }
    if (form.availableDays.length === 0) { toast.error('Select at least one available day'); return; }
    if (form.timeSlots.length === 0) { toast.error('Add at least one time slot'); return; }

    setSaving(true);
    try {
      const payload = { ...form, consultFee: Number(form.consultFee || 0), maxPerSlot: Number(form.maxPerSlot || 1) };
      if (existing) {
        await API.put(`/booking/config/doctors/${existing._id}`, payload);
        toast.success('Doctor updated');
      } else {
        await API.post('/booking/config/doctors', payload);
        toast.success(`Dr. ${form.name} added`);
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  const SPECIALIZATIONS = ['General Physician','Cardiologist','Dermatologist','ENT Specialist','Gynecologist','Neurologist','Orthopedic Surgeon','Pediatrician','Psychiatrist','Urologist','Other'];

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg" style={{ maxHeight:'90vh', overflowY:'auto' }}>
        <div className="modal-header">
          <div className="modal-title">{existing ? 'Edit Doctor' : 'Add Doctor'}</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><MdClose /></button>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          {/* Left */}
          <div>
            <div className="form-group">
              <label className="form-label required">Doctor Name</label>
              <input className="form-control" value={form.name} onChange={fld('name')} placeholder="Ahmed Khan" autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Specialization</label>
              <input className="form-control" value={form.specialization} onChange={fld('specialization')} list="specializations" placeholder="General Physician" />
              <datalist id="specializations">
                {SPECIALIZATIONS.map(s => <option key={s} value={s} />)}
              </datalist>
            </div>
            <div className="form-group">
              <label className="form-label">Qualification</label>
              <input className="form-control" value={form.qualification} onChange={fld('qualification')} placeholder="MBBS, FCPS" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Consult Fee (₨)</label>
                <input className="form-control" type="number" min="0" value={form.consultFee} onChange={fld('consultFee')} placeholder="0 = free" />
              </div>
              <div className="form-group">
                <label className="form-label">Max Per Slot</label>
                <input className="form-control" type="number" min="1" max="10" value={form.maxPerSlot} onChange={fld('maxPerSlot')} />
                <div className="form-hint">How many patients can book the same slot</div>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Short Bio</label>
              <textarea className="form-control" rows={2} value={form.bio} onChange={fld('bio')} placeholder="10+ years experience in..." />
            </div>
          </div>

          {/* Right */}
          <div>
            {/* Available days */}
            <div className="form-group">
              <label className="form-label required">Available Days</label>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {FULL_DAYS.map((day, i) => (
                  <button key={i}
                    onClick={() => toggleDay(i)}
                    style={{
                      padding:'8px 12px', borderRadius:8, cursor:'pointer', fontWeight:700, fontSize:12,
                      background: form.availableDays.includes(i) ? 'var(--accent)' : 'var(--bg-tertiary)',
                      color:      form.availableDays.includes(i) ? '#fff'          : 'var(--text-muted)',
                      border:     `2px solid ${form.availableDays.includes(i) ? 'var(--accent)' : 'var(--border)'}`,
                    }}>
                    {DAY_NAMES[i]}
                  </button>
                ))}
              </div>
            </div>

            {/* Time slots */}
            <div className="form-group">
              <label className="form-label required">Time Slots</label>
              <div style={{ maxHeight:220, overflowY:'auto', border:'1px solid var(--border)', borderRadius:10, padding:8 }}>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:4 }}>
                  {DEFAULT_SLOTS.map(time => (
                    <button key={time}
                      onClick={() => toggleSlot(time)}
                      style={{
                        padding:'6px 4px', borderRadius:6, cursor:'pointer', fontWeight:600, fontSize:11, textAlign:'center',
                        background: hasSlot(time) ? '#0ea5e9' : 'var(--bg-tertiary)',
                        color:      hasSlot(time) ? '#fff'    : 'var(--text-muted)',
                        border:     `1px solid ${hasSlot(time) ? '#0ea5e9' : 'var(--border)'}`,
                      }}>
                      {time}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-hint">{form.timeSlots.length} slots selected</div>
            </div>

            <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', fontSize:13 }}>
              <input type="checkbox" checked={form.isActive} onChange={e => setForm(p => ({ ...p, isActive: e.target.checked }))} />
              <span style={{ fontWeight:600 }}>Doctor is active (visible to patients)</span>
            </label>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handle} disabled={saving || !form.name.trim()}>
            {saving ? 'Saving...' : existing ? 'Update Doctor' : 'Add Doctor'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════
   MAIN PAGE
════════════════════════════════ */
export default function BookingConfig() {
  const [config,     setConfig]     = useState(null);
  const [stats,      setStats]      = useState({});
  const [loading,    setLoading]    = useState(true);
  const [activeTab,  setActiveTab]  = useState('setup');
  const [docModal,   setDocModal]   = useState(null);
  const [saving,     setSaving]     = useState(false);
  const [settings,   setSettings]   = useState({});
  const [copied,     setCopied]     = useState(false);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const [confRes, statsRes] = await Promise.all([
        API.get('/booking/config'),
        API.get('/booking/stats'),
      ]);
      setConfig(confRes.data.config);
      setStats(statsRes.data.stats);
      setSettings({
        slug:                confRes.data.config.slug || '',
        clinicName:          confRes.data.config.clinicName || '',
        tagline:             confRes.data.config.tagline || '',
        address:             confRes.data.config.address || '',
        phone:               confRes.data.config.phone || '',
        allowSameDayBooking: confRes.data.config.allowSameDayBooking !== false,
        advanceBookingDays:  confRes.data.config.advanceBookingDays || 30,
        cancellationHours:   confRes.data.config.cancellationHours  || 2,
        isEnabled:           confRes.data.config.isEnabled || false,
        confirmationMessage: confRes.data.config.confirmationMessage || '',
      });
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await API.put('/booking/config', settings);
      toast.success('Settings saved');
      fetchConfig();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  const handleToggle = async () => {
    try {
      await API.put('/booking/config', { isEnabled: !config.isEnabled });
      toast.success(config.isEnabled ? 'Booking page disabled' : 'Booking page enabled!');
      fetchConfig();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleDeleteDoctor = async (doctorId, name) => {
    if (!confirm(`Remove Dr. ${name}?`)) return;
    try {
      await API.delete(`/booking/config/doctors/${doctorId}`);
      toast.success(`Dr. ${name} removed`);
      fetchConfig();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const publicUrl = stats.publicUrl || `${window.location.origin}/book/${config?.slug}`;

  const copyUrl = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('URL copied!');
  };

  const TABS = [
    { id:'setup',   label:'Setup'    },
    { id:'doctors', label:'Doctors'  },
    { id:'stats',   label:'Stats'    },
  ];

  if (loading) return <div className="flex-center" style={{ height:300 }}><ShortLoader/></div>;

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>📅 Online Appointment Booking</h1>
          <p>
            {config?.isEnabled
              ? <span style={{ color:'#10b981', fontWeight:700 }}>🟢 Booking page is LIVE</span>
              : <span style={{ color:'#ef4444' }}>🔴 Booking page is disabled</span>}
            {' '}· {stats.totalBookings || 0} total bookings
          </p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-secondary btn-sm" onClick={fetchConfig}><MdRefresh /></button>
          <button
            className={`btn ${config?.isEnabled ? 'btn-secondary' : 'btn-primary'}`}
            onClick={handleToggle}>
            {config?.isEnabled ? <><MdToggleOn size={18} /> Disable Booking</> : <><MdToggleOff size={18} /> Enable Booking</>}
          </button>
        </div>
      </div>

      {/* Public URL banner */}
      {config?.slug && (
        <div style={{ background: config?.isEnabled ? '#d1fae5' : '#f3f4f6', border:`1px solid ${config?.isEnabled?'#86efac':'var(--border)'}`, borderRadius:12, padding:'12px 16px', marginBottom:20, display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:700, fontSize:13 }}>Your Public Booking URL</div>
            <div style={{ fontSize:13, color:'var(--text-muted)', marginTop:2 }}>
              Share this link with your patients — no login required!
            </div>
            <div style={{ fontWeight:600, color:'var(--accent)', fontSize:14, marginTop:4 }}>{publicUrl}</div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={copyUrl}>
            {copied ? '✓ Copied' : <><MdLink size={14} /> Copy</>}
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => window.open(publicUrl, '_blank', 'noopener')}>
            Preview →
          </button>
        </div>
      )}

      {/* Stats row */}
      <div className="stat-grid" style={{ marginBottom:20 }}>
        {[
          { label:'Total Bookings',   value:stats.totalBookings      || 0, color:'#0ea5e9', icon:'📅' },
          { label:'This Month',       value:stats.thisMonthCount     || 0, color:'#10b981', icon:'📆' },
          { label:'Upcoming',         value:stats.pendingCount       || 0, color:'#f59e0b', icon:'⏳' },
          { label:'Cancellations',    value:stats.totalCancellations || 0, color:'#ef4444', icon:'✕'  },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background:s.color+'20', fontSize:20 }}>{s.icon}</div>
            <div>
              <div className="stat-value" style={{ color:s.color, fontSize:24 }}>{s.value}</div>
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

      {/* ── SETUP TAB ── */}
      {activeTab === 'setup' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          {/* Basic info */}
          <div className="card">
            <div style={{ fontWeight:700, marginBottom:14 }}>Clinic Information</div>
            <div className="form-group">
              <label className="form-label required">Booking URL (slug)</label>
              <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                <span className="text-muted" style={{ fontSize:13, whiteSpace:'nowrap' }}>{window.location.origin}/book/</span>
                <input className="form-control" value={settings.slug || ''} onChange={e => setSettings(p => ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))} placeholder="your-clinic-name" />
              </div>
              <div className="form-hint">Only lowercase letters, numbers and hyphens</div>
            </div>
            <div className="form-group">
              <label className="form-label">Clinic Name</label>
              <input className="form-control" value={settings.clinicName || ''} onChange={e => setSettings(p => ({ ...p, clinicName: e.target.value }))} placeholder="Al-Shifa Medical Center" />
            </div>
            <div className="form-group">
              <label className="form-label">Tagline</label>
              <input className="form-control" value={settings.tagline || ''} onChange={e => setSettings(p => ({ ...p, tagline: e.target.value }))} placeholder="Your Health, Our Priority" />
            </div>
            <div className="form-group">
              <label className="form-label">Address</label>
              <input className="form-control" value={settings.address || ''} onChange={e => setSettings(p => ({ ...p, address: e.target.value }))} placeholder="Main Market, Johar Town, Lahore" />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-control" value={settings.phone || ''} onChange={e => setSettings(p => ({ ...p, phone: e.target.value }))} placeholder="042-XXXXXXXX" />
            </div>
          </div>

          {/* Booking settings */}
          <div className="card">
            <div style={{ fontWeight:700, marginBottom:14 }}>Booking Settings</div>

            <div style={{ marginBottom:14 }}>
              <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', fontSize:13 }}>
                <input type="checkbox" checked={settings.allowSameDayBooking} onChange={e => setSettings(p => ({ ...p, allowSameDayBooking: e.target.checked }))} />
                <span style={{ fontWeight:600 }}>Allow same-day bookings</span>
              </label>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Advance Booking (days)</label>
                <input className="form-control" type="number" min="1" max="90" value={settings.advanceBookingDays} onChange={e => setSettings(p => ({ ...p, advanceBookingDays: Number(e.target.value) }))} />
                <div className="form-hint">How far ahead patients can book</div>
              </div>
              <div className="form-group">
                <label className="form-label">Cancellation Window (hours)</label>
                <input className="form-control" type="number" min="0" value={settings.cancellationHours} onChange={e => setSettings(p => ({ ...p, cancellationHours: Number(e.target.value) }))} />
                <div className="form-hint">Must cancel at least X hours before</div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Confirmation Message Template</label>
              <textarea className="form-control" rows={5} value={settings.confirmationMessage || ''} onChange={e => setSettings(p => ({ ...p, confirmationMessage: e.target.value }))} placeholder="Dear {patientName}, your appointment with Dr. {doctor} on {date} at {time} at {clinic} is confirmed. To cancel: {cancelLink}" />
              <div className="form-hint">Variables: {'{patientName}'} {'{doctor}'} {'{date}'} {'{time}'} {'{clinic}'} {'{cancelLink}'}</div>
            </div>

            <button className="btn btn-primary" onClick={handleSaveSettings} disabled={saving} style={{ width:'100%' }}>
              {saving ? 'Saving...' : <><MdCheck /> Save Settings</>}
            </button>
          </div>
        </div>
      )}

      {/* ── DOCTORS TAB ── */}
      {activeTab === 'doctors' && (
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}>
            <div>
              <div style={{ fontWeight:700, fontSize:15 }}>Doctors & Schedules</div>
              <div className="text-muted text-sm">{config?.doctors?.length || 0} doctors configured</div>
            </div>
            <button className="btn btn-primary" onClick={() => setDocModal('new')}>
              <MdAdd /> Add Doctor
            </button>
          </div>

          {!config?.doctors?.length ? (
            <div className="empty-state">
              <MdPeople size={52} style={{ opacity:0.3, marginBottom:12 }} />
              <h3>No doctors configured</h3>
              <p>Add doctors with their schedules to start accepting online bookings</p>
              <button className="btn btn-primary" style={{ marginTop:12 }} onClick={() => setDocModal('new')}>
                <MdAdd /> Add First Doctor
              </button>
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px,1fr))', gap:14 }}>
              {config.doctors.map(doc => (
                <div key={doc._id} style={{ border:`1px solid ${doc.isActive?'var(--border)':'var(--border-light)'}`, borderRadius:14, padding:16, background:'var(--card-bg)', opacity: doc.isActive?1:0.65 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                    <div>
                      <div style={{ fontWeight:800, fontSize:15 }}>Dr. {doc.name}</div>
                      <div className="text-muted text-sm">{doc.specialization}{doc.qualification ? ` · ${doc.qualification}` : ''}</div>
                      {doc.consultFee > 0 && <div style={{ fontSize:13, color:'#f59e0b', fontWeight:700 }}>{fmtPKR(doc.consultFee)} consult fee</div>}
                    </div>
                    <div style={{ display:'flex', gap:4 }}>
                      <button className="btn btn-secondary btn-sm btn-icon" onClick={() => setDocModal(doc)}><MdEdit size={14} /></button>
                      <button className="btn btn-ghost btn-sm btn-icon" onClick={() => handleDeleteDoctor(doc._id, doc.name)}>
                        <MdDelete size={14} style={{ color:'var(--danger)' }} />
                      </button>
                    </div>
                  </div>

                  {/* Available days */}
                  <div style={{ display:'flex', gap:4, marginBottom:10, flexWrap:'wrap' }}>
                    {[0,1,2,3,4,5,6].map(d => (
                      <span key={d} style={{
                        padding:'3px 7px', borderRadius:6, fontSize:11, fontWeight:700,
                        background: doc.availableDays?.includes(d) ? '#dbeafe' : '#f3f4f6',
                        color:      doc.availableDays?.includes(d) ? '#1d4ed8' : '#9ca3af',
                      }}>
                        {DAY_NAMES[d]}
                      </span>
                    ))}
                  </div>

                  {/* Time slots count */}
                  <div style={{ fontSize:12, color:'var(--text-muted)' }}>
                    ⏰ {doc.timeSlots?.filter(s => s.isActive !== false).length || 0} time slots ·
                    Max {doc.maxPerSlot || 1} per slot ·
                    {!doc.isActive && ' (Hidden from patients)'}
                  </div>

                  {/* Sample slots */}
                  <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginTop:8 }}>
                    {doc.timeSlots?.filter(s => s.isActive !== false).slice(0,5).map(s => (
                      <span key={s.time} style={{ background:'var(--bg-tertiary)', padding:'2px 7px', borderRadius:6, fontSize:11, color:'var(--text-muted)' }}>
                        {s.time}
                      </span>
                    ))}
                    {(doc.timeSlots?.filter(s => s.isActive !== false).length || 0) > 5 && (
                      <span style={{ fontSize:11, color:'var(--text-muted)' }}>+{(doc.timeSlots?.length||0) - 5} more</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── STATS TAB ── */}
      {activeTab === 'stats' && (
        <div>
          <div style={{ fontWeight:700, marginBottom:14 }}>Online Booking Performance</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <div className="card">
              <div style={{ fontWeight:700, marginBottom:12 }}>Overview</div>
              {[
                ['Total Online Bookings',   stats.totalBookings     || 0],
                ['This Month',              stats.thisMonthCount    || 0],
                ['Today',                   stats.todayCount        || 0],
                ['Upcoming',                stats.pendingCount      || 0],
                ['Total Cancellations',     stats.totalCancellations||0],
                ['Booking Success Rate',    stats.totalBookings > 0 ? `${Math.round(((stats.totalBookings - (stats.totalCancellations||0)) / stats.totalBookings) * 100)}%` : '—'],
              ].map(([k, v]) => (
                <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid var(--border-light)', fontSize:13 }}>
                  <span className="text-muted">{k}</span>
                  <span style={{ fontWeight:700 }}>{v}</span>
                </div>
              ))}
            </div>

            <div className="card">
              <div style={{ fontWeight:700, marginBottom:12 }}>Share Your Booking Link</div>
              <div style={{ fontSize:13, color:'var(--text-muted)', marginBottom:12 }}>
                Share this link anywhere — on your prescription pad, WhatsApp status, Facebook page, or business card.
              </div>
              <div style={{ background:'var(--bg-tertiary)', borderRadius:10, padding:12, marginBottom:12 }}>
                <div style={{ fontWeight:600, fontSize:13, wordBreak:'break-all' }}>{publicUrl}</div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                <button className="btn btn-primary btn-sm" onClick={copyUrl}>
                  <MdLink size={14} /> Copy Link
                </button>
                <button className="btn btn-secondary btn-sm"
                  style={{ background:'#25d366', color:'#fff', border:'none' }}
                  onClick={() => {
                    const msg = encodeURIComponent(`Book your appointment online — no phone call needed!\n\n${publicUrl}`);
                    window.open(`https://wa.me/?text=${msg}`, '_blank', 'noopener');
                  }}>
                  💬 WhatsApp
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Doctor modal */}
      {docModal && (
        <DoctorModal
          existing={docModal !== 'new' ? docModal : null}
          onClose={() => setDocModal(null)}
          onSaved={() => { setDocModal(null); fetchConfig(); }}
        />
      )}
    </div>
  );
}