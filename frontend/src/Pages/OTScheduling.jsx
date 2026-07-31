import { useState, useEffect, useCallback } from 'react';
import {
  MdAdd, MdClose, MdSearch, MdEdit, MdDelete,
  MdCheck, MdPerson, MdRefresh, MdBarChart,
  MdCalendarToday, MdArrowBack,
  MdLocalHospital,
} from 'react-icons/md';
import toast from 'react-hot-toast';
import API from '../utils/api';
import { useSocket } from '../context/SocketContext';
import ShortLoader from '../Components/ShortLoader';

/* ── helpers ── */
const fmtDate  = d => d ? new Date(d).toLocaleDateString('en-PK', { weekday:'short', day:'2-digit', month:'short', year:'numeric' }) : '—';
const fmtShort = d => d ? new Date(d).toLocaleDateString('en-PK', { day:'2-digit', month:'short' }) : '—';
const fmtTime  = d => d ? new Date(d).toLocaleTimeString('en-PK', { hour:'2-digit', minute:'2-digit' }) : '—';
const fmtPKR   = n => `₨${Number(n||0).toLocaleString()}`;
const todayISO = () => new Date().toISOString().slice(0,10);
const monthISO = () => new Date().toISOString().slice(0,7);

const STATUS_CFG = {
  Scheduled:   { bg:'#e0f2fe', color:'#0ea5e9', dot:'#0ea5e9' },
  'Pre-Op':    { bg:'#fef3c7', color:'#f59e0b', dot:'#f59e0b' },
  'In-Progress':{ bg:'#d1fae5', color:'#10b981', dot:'#10b981' },
  Completed:   { bg:'#f0fdf4', color:'#16a34a', dot:'#16a34a' },
  Cancelled:   { bg:'#f3f4f6', color:'#6b7280', dot:'#6b7280' },
  Postponed:   { bg:'#f3e8ff', color:'#8b5cf6', dot:'#8b5cf6' },
};

const PRIORITY_CFG = {
  Routine:   { color:'#64748b', bg:'#f1f5f9' },
  Urgent:    { color:'#f59e0b', bg:'#fef3c7' },
  Emergency: { color:'#ef4444', bg:'#fee2e2' },
};

const OT_ROOMS   = ['OT-1', 'OT-2', 'OT-3', 'Major OT', 'Minor OT', 'Cardiac OT', 'Ortho OT', 'Gynaec OT', 'Emergency OT'];
const TEAM_ROLES = ['Surgeon', 'Co-Surgeon', 'Anesthesiologist', 'OT Nurse', 'Scrub Nurse', 'OT Technician', 'Other'];
const SURGERY_CATEGORIES = ['Elective', 'Emergency', 'Semi-Urgent'];
const ANESTHESIA_TYPES   = ['General', 'Spinal', 'Epidural', 'Local', 'Regional', 'Sedation'];

/* ════════════════════════════════
   SCHEDULE FORM MODAL
════════════════════════════════ */
function ScheduleModal({ existing, onClose, onSaved }) {
  const isEdit = !!existing;
  const [patients, setPatients] = useState([]);
  const [pSearch,  setPSearch]  = useState('');
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({
    otRoom:           existing?.otRoom           || 'OT-1',
    surgeryType:      existing?.surgeryType      || '',
    surgeryCategory:  existing?.surgeryCategory  || 'Elective',
    anesthesiaType:   existing?.anesthesiaType   || 'General',
    priority:         existing?.priority         || 'Routine',
    scheduledDate:    existing?.scheduledDate
      ? new Date(existing.scheduledDate).toISOString().slice(0,10)
      : todayISO(),
    startTime:        existing?.startTime        || '09:00',
    estimatedMinutes: existing?.estimatedMinutes || 60,
    preOpNotes:       existing?.preOpNotes       || '',
    estimatedCost:    existing?.estimatedCost    || '',
  });
  const [saving, setSaving] = useState(false);
  const fld = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  useEffect(() => {
    if (isEdit && existing?.patient) {
      setSelected({ _id: existing.patient._id || existing.patient, name: existing.patientName });
    }
  }, []);

  useEffect(() => {
    if (pSearch.length < 2) { setPatients([]); return; }
    API.get('/patients', { params: { search: pSearch, limit: 6 } })
      .then(({ data }) => setPatients(data.patients || []))
      .catch(() => {});
  }, [pSearch]);

  const handleSave = async () => {
    if (!selected || !form.surgeryType || !form.startTime) {
      toast.error('Patient, surgery type and time required'); return;
    }
    setSaving(true);
    try {
      const payload = { ...form, patientId: selected._id, estimatedMinutes: Number(form.estimatedMinutes) };
      if (isEdit) {
        await API.put(`/ot/${existing._id}`, payload);
        toast.success('Schedule updated');
      } else {
        await API.post('/ot', payload);
        toast.success(`Surgery scheduled!`);
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <div className="modal-title">{isEdit ? 'Edit OT Schedule' : 'Schedule Surgery'}</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><MdClose /></button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Left col */}
          <div>
            {/* Patient */}
            <div className="form-group">
              <label className="form-label required">Patient</label>
              {selected ? (
                <div style={{ background:'var(--bg-tertiary)', borderRadius:10, padding:'10px 14px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div>
                    <div style={{ fontWeight:700 }}>{selected.name}</div>
                    {selected.patientId && <div className="text-muted text-sm">{selected.patientId}</div>}
                  </div>
                  {!isEdit && <button className="btn btn-secondary btn-sm" onClick={() => { setSelected(null); setPSearch(''); }}>Change</button>}
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
                          <div className="text-muted text-sm">{p.patientId} · {p.age}y · {p.bloodGroup}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label required">Surgery Type / Procedure</label>
              <input className="form-control" value={form.surgeryType} onChange={fld('surgeryType')} placeholder="e.g. Appendectomy, LSCS, Hernia Repair" />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label required">OT Room</label>
                <select className="form-control" value={form.otRoom} onChange={fld('otRoom')}>
                  {OT_ROOMS.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-control" value={form.surgeryCategory} onChange={fld('surgeryCategory')}>
                  {SURGERY_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Priority</label>
              <div style={{ display:'flex', gap:8 }}>
                {['Routine','Urgent','Emergency'].map(p => {
                  const cfg = PRIORITY_CFG[p];
                  return (
                    <button key={p} onClick={() => setForm(f => ({ ...f, priority:p }))}
                      style={{ flex:1, padding:'8px 0', borderRadius:10, cursor:'pointer', background: form.priority===p ? cfg.color : cfg.bg, color: form.priority===p ? '#fff' : cfg.color, border:`2px solid ${cfg.color}`, fontWeight:700, fontSize:12 }}>
                      {p === 'Emergency' ? '🚨 ' : p === 'Urgent' ? '⚡ ' : ''}{p}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right col */}
          <div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label required">Date</label>
                <input className="form-control" type="date" value={form.scheduledDate} min={todayISO()} onChange={fld('scheduledDate')} />
              </div>
              <div className="form-group">
                <label className="form-label required">Start Time</label>
                <input className="form-control" type="time" value={form.startTime} onChange={fld('startTime')} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Est. Duration (min)</label>
                <input className="form-control" type="number" min="15" step="15" value={form.estimatedMinutes} onChange={fld('estimatedMinutes')} />
              </div>
              <div className="form-group">
                <label className="form-label">Anesthesia</label>
                <select className="form-control" value={form.anesthesiaType} onChange={fld('anesthesiaType')}>
                  {ANESTHESIA_TYPES.map(a => <option key={a}>{a}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Estimated Cost (₨)</label>
              <input className="form-control" type="number" min="0" value={form.estimatedCost} onChange={fld('estimatedCost')} placeholder="50000" />
            </div>

            <div className="form-group">
              <label className="form-label">Pre-Op Notes</label>
              <textarea className="form-control" rows={3} value={form.preOpNotes} onChange={fld('preOpNotes')} placeholder="Special instructions, patient condition, allergies to note..." />
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || !selected || !form.surgeryType}>
            {saving ? 'Saving...' : isEdit ? 'Update Schedule' : 'Schedule Surgery'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════
   COMPLETE SURGERY MODAL
════════════════════════════════ */
function CompleteModal({ schedule, onClose, onCompleted }) {
  const [form, setForm] = useState({
    operativeNotes: '', postOpNotes: '', complications: '',
    implants: '', postOpWard: '', postOpBed: '',
    actualCost: schedule.estimatedCost || '',
    recoveryNotes: '',
  });
  const [saving, setSaving] = useState(false);
  const fld = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleComplete = async () => {
    setSaving(true);
    try {
      await API.patch(`/ot/${schedule._id}/status`, { status: 'Completed', ...form });
      toast.success('Surgery marked as completed!');
      onCompleted();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <div>
            <div className="modal-title">Complete Surgery</div>
            <div className="text-muted text-sm">{schedule.surgeryType} — {schedule.patientName}</div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><MdClose /></button>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          <div>
            <div className="form-group">
              <label className="form-label">Operative Notes</label>
              <textarea className="form-control" rows={4} value={form.operativeNotes} onChange={fld('operativeNotes')} placeholder="Intra-operative findings, technique used, steps performed..." />
            </div>
            <div className="form-group">
              <label className="form-label">Post-Op Notes</label>
              <textarea className="form-control" rows={3} value={form.postOpNotes} onChange={fld('postOpNotes')} placeholder="Post-operative instructions, follow-up..." />
            </div>
            <div className="form-group">
              <label className="form-label">Complications</label>
              <input className="form-control" value={form.complications} onChange={fld('complications')} placeholder="None / describe any complications" />
            </div>
          </div>
          <div>
            <div className="form-group">
              <label className="form-label">Implants / Materials Used</label>
              <input className="form-control" value={form.implants} onChange={fld('implants')} placeholder="Mesh, prosthetic, suture types..." />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Post-Op Ward</label>
                <input className="form-control" value={form.postOpWard} onChange={fld('postOpWard')} placeholder="ICU, General Ward A" />
              </div>
              <div className="form-group">
                <label className="form-label">Bed No.</label>
                <input className="form-control" value={form.postOpBed} onChange={fld('postOpBed')} placeholder="A-05" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Actual Cost (₨)</label>
              <input className="form-control" type="number" value={form.actualCost} onChange={fld('actualCost')} />
            </div>
            <div className="form-group">
              <label className="form-label">Recovery Notes</label>
              <textarea className="form-control" rows={3} value={form.recoveryNotes} onChange={fld('recoveryNotes')} placeholder="Patient condition in recovery room..." />
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-success" onClick={handleComplete} disabled={saving}>
            {saving ? 'Saving...' : <><MdCheck /> Mark Completed</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════
   SCHEDULE DETAIL
════════════════════════════════ */
function ScheduleDetail({ scheduleId, onBack, onRefresh }) {
  const [schedule,  setSchedule ] = useState(null);
  const [loading,   setLoading  ] = useState(true);
  const [activeTab, setTab      ] = useState('overview');
  const [editModal, setEditModal] = useState(false);
  const [completeModal, setCompleteModal] = useState(false);
  const [teamForm,  setTeamForm ] = useState({ role:'Surgeon', name:'', phone:'' });

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await API.get(`/ot/${scheduleId}`);
      setSchedule(data.schedule);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  }, [scheduleId]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleStatusChange = async (status, extra = {}) => {
    if (status === 'Completed') { setCompleteModal(true); return; }
    if (!confirm(`Change status to ${status}?`)) return;
    try {
      await API.patch(`/ot/${scheduleId}/status`, { status, ...extra });
      toast.success(`Status → ${status}`);
      fetch();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleChecklistToggle = async (itemId, done) => {
    try {
      await API.patch(`/ot/${scheduleId}/checklist/${itemId}`, { done });
      fetch();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleAddTeam = async () => {
    if (!teamForm.name) { toast.error('Name required'); return; }
    try {
      await API.post(`/ot/${scheduleId}/team`, teamForm);
      toast.success(`${teamForm.name} added to team`);
      setTeamForm({ role:'Surgeon', name:'', phone:'' });
      fetch();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleRemoveTeam = async (memberId) => {
    try {
      await API.delete(`/ot/${scheduleId}/team/${memberId}`);
      fetch();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  if (loading) return <div className="flex-center" style={{ height:300 }}><ShortLoader/></div>;
  if (!schedule) return null;

  const sc   = STATUS_CFG[schedule.status]  || STATUS_CFG.Scheduled;
  const pc   = PRIORITY_CFG[schedule.priority] || PRIORITY_CFG.Routine;
  const prog = schedule.checklistProgress || 0;
  const p    = schedule.patient || {};

  const TABS = [
    { id:'overview',  label:'Overview'                                                       },
    { id:'checklist', label:`Pre-Op Checklist (${prog}%)`                                   },
    { id:'team',      label:`OT Team (${schedule.team?.length || 0})`                       },
    { id:'notes',     label:'Operative Notes', show: ['Completed'].includes(schedule.status) },
  ];

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <button className="btn btn-ghost btn-icon" onClick={onBack}><MdArrowBack /></button>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <h2 style={{ margin:0 }}>{schedule.surgeryType}</h2>
              <span style={{ background:sc.bg, color:sc.color, padding:'3px 12px', borderRadius:99, fontSize:12, fontWeight:700 }}>{schedule.status}</span>
              <span style={{ background:pc.bg, color:pc.color, padding:'3px 10px', borderRadius:99, fontSize:11, fontWeight:700 }}>{schedule.priority}</span>
            </div>
            <div className="text-muted text-sm">
              {schedule.scheduleNumber} · {schedule.otRoom} · {fmtDate(schedule.scheduledDate)} · {schedule.startTime} ({schedule.estimatedMinutes}min est.)
            </div>
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {schedule.status === 'Scheduled' && (
            <button className="btn btn-secondary" onClick={() => handleStatusChange('Pre-Op')}>→ Pre-Op</button>
          )}
          {schedule.status === 'Pre-Op' && (
            <button className="btn btn-primary" onClick={() => handleStatusChange('In-Progress')}>▶ Start Surgery</button>
          )}
          {schedule.status === 'In-Progress' && (
            <button className="btn btn-success" onClick={() => setCompleteModal(true)}><MdCheck /> Complete</button>
          )}
          {['Scheduled','Pre-Op'].includes(schedule.status) && (
            <>
              <button className="btn btn-secondary" onClick={() => setEditModal(true)}><MdEdit /></button>
              <button className="btn btn-secondary" onClick={() => handleStatusChange('Cancelled')}>Cancel</button>
              <button className="btn btn-secondary" onClick={() => handleStatusChange('Postponed')}>Postpone</button>
            </>
          )}
          <button className="btn btn-secondary btn-sm" onClick={fetch}><MdRefresh /></button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:20, borderBottom:'1px solid var(--border)' }}>
        {TABS.filter(t => t.show !== false).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding:'10px 16px', background:'none', border:'none', borderBottom: activeTab===t.id?'2px solid var(--accent)':'2px solid transparent', color: activeTab===t.id?'var(--accent)':'var(--text-muted)', fontWeight: activeTab===t.id?700:500, cursor:'pointer', fontSize:14, fontFamily:'var(--font-main)' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === 'overview' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>

          {/* Patient card */}
          <div className="card">
            <div style={{ fontWeight:700, marginBottom:12 }}>Patient</div>
            {p.allergies?.length > 0 && (
              <div style={{ background:'#fee2e2', color:'#ef4444', padding:'8px 12px', borderRadius:8, marginBottom:12, fontSize:12, fontWeight:600 }}>
                ⚠️ Allergies: {p.allergies.join(', ')}
              </div>
            )}
            {[
              ['Name',        schedule.patientName],
              ['Patient ID',  p.patientId],
              ['Age / Gender',`${p.age||'—'} / ${p.gender||'—'}`],
              ['Blood Group', p.bloodGroup],
              ['Phone',       p.phone],
            ].filter(([,v])=>v).map(([k,v])=>(
              <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid var(--border-light)', fontSize:13 }}>
                <span className="text-muted">{k}</span>
                <span style={{ fontWeight:600 }}>{v}</span>
              </div>
            ))}
          </div>

          {/* Surgery details */}
          <div className="card">
            <div style={{ fontWeight:700, marginBottom:12 }}>Surgery Details</div>
            {[
              ['OT Room',      schedule.otRoom],
              ['Category',     schedule.surgeryCategory],
              ['Anesthesia',   schedule.anesthesiaType],
              ['Date',         fmtDate(schedule.scheduledDate)],
              ['Start Time',   schedule.startTime],
              ['Est. Duration',`${schedule.estimatedMinutes} minutes`],
              ['Est. End',     schedule.endTime],
              ['Est. Cost',    fmtPKR(schedule.estimatedCost)],
            ].map(([k,v])=>(
              <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid var(--border-light)', fontSize:13 }}>
                <span className="text-muted">{k}</span>
                <span style={{ fontWeight:600 }}>{v}</span>
              </div>
            ))}
          </div>

          {/* Actual timing if started/done */}
          {['In-Progress','Completed'].includes(schedule.status) && (
            <div className="card">
              <div style={{ fontWeight:700, marginBottom:12 }}>Actual Timing</div>
              {[
                ['Actual Start',    fmtTime(schedule.actualStartTime)],
                ['Actual End',      schedule.actualEndTime ? fmtTime(schedule.actualEndTime) : 'In progress...'],
                ['Actual Duration', schedule.actualMinutes ? `${schedule.actualMinutes} min` : '—'],
                ['Actual Cost',     schedule.actualCost ? fmtPKR(schedule.actualCost) : '—'],
              ].map(([k,v])=>(
                <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid var(--border-light)', fontSize:13 }}>
                  <span className="text-muted">{k}</span>
                  <span style={{ fontWeight:700, color:'var(--accent)' }}>{v}</span>
                </div>
              ))}
              {schedule.postOpWard && (
                <div style={{ marginTop:10, background:'var(--bg-tertiary)', padding:'10px 12px', borderRadius:8, fontSize:13 }}>
                  <div className="text-muted text-sm">Post-Op Location</div>
                  <div style={{ fontWeight:700, marginTop:4 }}>{schedule.postOpWard} — Bed {schedule.postOpBed}</div>
                </div>
              )}
            </div>
          )}

          {/* Pre-op notes */}
          {schedule.preOpNotes && (
            <div className="card">
              <div style={{ fontWeight:700, marginBottom:8 }}>Pre-Op Notes</div>
              <div style={{ fontSize:14, lineHeight:1.7 }}>{schedule.preOpNotes}</div>
            </div>
          )}
        </div>
      )}

      {/* ── CHECKLIST TAB ── */}
      {activeTab === 'checklist' && (
        <div className="card">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <div>
              <div style={{ fontWeight:700 }}>Pre-Op Checklist</div>
              <div className="text-muted text-sm">{prog}% complete ({schedule.preOpChecklist?.filter(c=>c.done).length}/{schedule.preOpChecklist?.length} items)</div>
            </div>
            {/* Progress bar */}
            <div style={{ width:120, height:8, background:'var(--border)', borderRadius:99, overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${prog}%`, background: prog===100?'#10b981':'var(--accent)', borderRadius:99, transition:'width 0.3s' }} />
            </div>
          </div>

          {prog < 100 && schedule.status !== 'Completed' && (
            <div style={{ background:'#fef3c7', color:'#92400e', padding:'10px 14px', borderRadius:10, marginBottom:16, fontSize:13, fontWeight:600 }}>
              ⚠️ {100 - prog}% of checklist incomplete. All items should be done before surgery starts.
            </div>
          )}

          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {schedule.preOpChecklist?.map((item, i) => (
              <div key={item._id}
                style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', borderRadius:12, background: item.done ? '#f0fdf4' : 'var(--bg-secondary)', border:`1px solid ${item.done ? '#86efac' : 'var(--border)'}` }}
              >
                <button
                  onClick={() => handleChecklistToggle(item._id, !item.done)}
                  disabled={schedule.status === 'Completed'}
                  style={{
                    width:24, height:24, borderRadius:8, border:`2px solid ${item.done ? '#10b981' : 'var(--border)'}`,
                    background: item.done ? '#10b981' : 'transparent',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    cursor: schedule.status === 'Completed' ? 'default' : 'pointer',
                    flexShrink:0, color:'#fff',
                  }}>
                  {item.done && <MdCheck size={14} />}
                </button>

                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight: item.done ? 500 : 600, color: item.done ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: item.done ? 'line-through' : 'none' }}>
                    {item.item}
                  </div>
                  {item.done && item.doneBy && (
                    <div style={{ fontSize:11, color:'#10b981', marginTop:2 }}>
                      ✓ Done by {item.doneBy} at {fmtTime(item.doneAt)}
                    </div>
                  )}
                </div>

                {item.done && <span style={{ background:'#d1fae5', color:'#10b981', padding:'2px 8px', borderRadius:99, fontSize:11, fontWeight:700 }}>Done</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TEAM TAB ── */}
      {activeTab === 'team' && (
        <div>
          {/* Add team member */}
          {schedule.status !== 'Completed' && (
            <div className="card" style={{ marginBottom:16 }}>
              <div style={{ fontWeight:700, marginBottom:12 }}>Add Team Member</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr 1fr auto', gap:8, alignItems:'end' }}>
                <div>
                  <label className="form-label" style={{ fontSize:11 }}>Role</label>
                  <select className="form-control" value={teamForm.role} onChange={e => setTeamForm(p => ({ ...p, role:e.target.value }))}>
                    {TEAM_ROLES.map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label" style={{ fontSize:11 }}>Name</label>
                  <input className="form-control" value={teamForm.name} onChange={e => setTeamForm(p => ({ ...p, name:e.target.value }))} placeholder="Dr. Ahmed Khan" />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize:11 }}>Phone</label>
                  <input className="form-control" value={teamForm.phone} onChange={e => setTeamForm(p => ({ ...p, phone:e.target.value }))} placeholder="Optional" />
                </div>
                <button className="btn btn-primary" onClick={handleAddTeam} style={{ alignSelf:'flex-end' }}>
                  <MdAdd /> Add
                </button>
              </div>
            </div>
          )}

          {/* Team list */}
          {schedule.team?.length === 0 ? (
            <div className="empty-state"><MdPerson size={40} style={{ opacity:0.3 }} /><p>No team members assigned yet</p></div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px,1fr))', gap:12 }}>
              {schedule.team?.map(m => {
                const roleColors = { Surgeon:'#ef4444', 'Co-Surgeon':'#f97316', Anesthesiologist:'#8b5cf6', 'OT Nurse':'#0ea5e9', 'Scrub Nurse':'#10b981', 'OT Technician':'#f59e0b', Other:'#64748b' };
                const color = roleColors[m.role] || '#64748b';
                return (
                  <div key={m._id} style={{ border:'1px solid var(--border)', borderRadius:14, padding:16, background:'var(--card-bg)', display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ width:44, height:44, borderRadius:'50%', background: color+'15', color, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, fontSize:18, flexShrink:0 }}>
                      {m.name[0]}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:700 }}>{m.name}</div>
                      <div style={{ background: color+'20', color, fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:99, display:'inline-block', marginTop:3 }}>{m.role}</div>
                      {m.phone && <div className="text-muted" style={{ fontSize:11, marginTop:3 }}>{m.phone}</div>}
                    </div>
                    {schedule.status !== 'Completed' && (
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleRemoveTeam(m._id)}>
                        <MdDelete size={15} style={{ color:'var(--danger)' }} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── NOTES TAB (completed) ── */}
      {activeTab === 'notes' && schedule.status === 'Completed' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          {[
            { title:'Operative Notes',   value:schedule.operativeNotes  },
            { title:'Post-Op Notes',     value:schedule.postOpNotes     },
            { title:'Complications',     value:schedule.complications   },
            { title:'Implants / Materials', value:schedule.implants    },
            { title:'Recovery Notes',    value:schedule.recoveryNotes  },
          ].map(({ title, value }) => (
            <div key={title} className="card">
              <div style={{ fontWeight:700, marginBottom:8 }}>{title}</div>
              <div style={{ fontSize:14, lineHeight:1.7, color: value ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                {value || 'Not recorded'}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {editModal && (
        <ScheduleModal existing={schedule} onClose={() => setEditModal(false)} onSaved={() => { setEditModal(false); fetch(); onRefresh(); }} />
      )}
      {completeModal && (
        <CompleteModal schedule={schedule} onClose={() => setCompleteModal(false)} onCompleted={() => { setCompleteModal(false); fetch(); onRefresh(); }} />
      )}
    </div>
  );
}

/* ════════════════════════════════
   REPORT MODAL
════════════════════════════════ */
function ReportModal({ onClose }) {
  const [month,    setMonth]   = useState(monthISO());
  const [report,   setReport]  = useState(null);
  const [loading,  setLoading] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/ot/report', { params: { month } });
      setReport(data.report);
    } catch { toast.error('Failed to load report'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchReport(); }, [month]);

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg" style={{ maxHeight:'85vh', overflowY:'auto' }}>
        <div className="modal-header">
          <div className="modal-title">📊 OT Utilization Report</div>
          <div style={{ display:'flex', gap:10, alignItems:'center' }}>
            <input type="month" className="form-control" style={{ width:160 }} value={month} onChange={e => setMonth(e.target.value)} />
            <button className="btn btn-ghost btn-icon" onClick={onClose}><MdClose /></button>
          </div>
        </div>

        {loading ? (
          <div className="flex-center" style={{ height:200 }}><ShortLoader/></div>
        ) : report && (
          <>
            {/* Totals */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, marginBottom:24 }}>
              {[
                { label:'Scheduled',  value:report.totals.scheduled,  color:'#0ea5e9' },
                { label:'Completed',  value:report.totals.completed,  color:'#10b981' },
                { label:'Cancelled',  value:report.totals.cancelled,  color:'#ef4444' },
                { label:'Postponed',  value:report.totals.postponed,  color:'#8b5cf6' },
                { label:'Total Hours',value:`${report.totals.totalHours}h`, color:'#f59e0b' },
              ].map(s => (
                <div key={s.label} style={{ background:s.color+'12', border:`1px solid ${s.color}30`, borderRadius:12, padding:'14px 16px', textAlign:'center' }}>
                  <div style={{ fontSize:26, fontWeight:900, color:s.color }}>{s.value}</div>
                  <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:4 }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              {/* By OT Room */}
              <div className="card">
                <div style={{ fontWeight:700, marginBottom:12 }}>By OT Room</div>
                {report.byRoom.map(r => (
                  <div key={r.room} style={{ marginBottom:12 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:4 }}>
                      <span style={{ fontWeight:700 }}>{r.room}</span>
                      <span className="text-muted">{r.completed}/{r.total} · {Math.round(r.totalMinutes/60*10)/10}h</span>
                    </div>
                    <div style={{ height:8, background:'var(--border)', borderRadius:99, overflow:'hidden' }}>
                      <div style={{ height:'100%', width: report.totals.scheduled > 0 ? `${(r.total/report.totals.scheduled)*100}%` : '0%', background:'var(--accent)', borderRadius:99 }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* By Surgery Type */}
              <div className="card">
                <div style={{ fontWeight:700, marginBottom:12 }}>Top Procedures</div>
                {report.byType.slice(0,8).map((t,i) => (
                  <div key={t.type} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid var(--border-light)', fontSize:13 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ color:'var(--text-muted)', fontSize:11 }}>#{i+1}</span>
                      <span style={{ fontWeight:600 }}>{t.type}</span>
                    </div>
                    <span style={{ fontWeight:700, color:'var(--accent)' }}>{t.count}</span>
                  </div>
                ))}
              </div>

              {/* By Surgeon */}
              <div className="card">
                <div style={{ fontWeight:700, marginBottom:12 }}>Surgeon Activity</div>
                {report.bySurgeon.map(s => (
                  <div key={s.name} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--border-light)', fontSize:13 }}>
                    <span style={{ fontWeight:600 }}>{s.name}</span>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontWeight:700 }}>{s.count} cases</div>
                      <div className="text-muted" style={{ fontSize:11 }}>{Math.round(s.minutes/60*10)/10}h</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════
   MAIN PAGE
════════════════════════════════ */
export default function OTScheduling() {
  const [schedules,  setSchedules ] = useState([]);
  const [stats,      setStats     ] = useState({});
  const [total,      setTotal     ] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page,       setPage      ] = useState(1);
  const [loading,    setLoading   ] = useState(true);

  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter,   setDateFilter  ] = useState('');
  const [search,       setSearch      ] = useState('');
  const [viewMode,     setViewMode    ] = useState('list');  // 'list' | 'calendar'

  const [scheduleModal,  setScheduleModal ] = useState(false);
  const [reportModal,    setReportModal   ] = useState(false);
  const [detailId,       setDetailId      ] = useState(null);

  const { on } = useSocket() || {};

  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit:15 };
      if (statusFilter) params.status = statusFilter;
      if (dateFilter)   params.date   = dateFilter;
      if (search)       params.search = search;
      const { data } = await API.get('/ot', { params });
      setSchedules(data.schedules);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch { toast.error('Failed to load schedules'); }
    finally { setLoading(false); }
  }, [statusFilter, dateFilter, search, page]);

  const fetchStats = useCallback(() => {
    API.get('/ot/stats').then(({ data }) => setStats(data.stats)).catch(() => {});
  }, []);

  useEffect(() => { fetchSchedules(); fetchStats(); }, [fetchSchedules]);

  useEffect(() => {
    if (!on) return;
    const unsubs = [
      on('ot:scheduled',     () => { fetchSchedules(); fetchStats(); }),
      on('ot:statusUpdated', () => { fetchSchedules(); fetchStats(); }),
    ];
    return () => unsubs.forEach(u => u && u());
  }, [on, fetchSchedules, fetchStats]);

  useEffect(() => { setPage(1); }, [statusFilter, dateFilter, search]);

  if (detailId) {
    return (
      <ScheduleDetail
        scheduleId={detailId}
        onBack={() => setDetailId(null)}
        onRefresh={() => { fetchSchedules(); fetchStats(); }}
      />
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>OT Scheduling</h1>
          <p>{stats.todayTotal || 0} today · {stats.todayInProgress || 0} in progress · {stats.upcoming || 0} upcoming</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-secondary" onClick={() => setReportModal(true)}>
            <MdBarChart /> Report
          </button>
          <button className="btn btn-secondary" onClick={() => setViewMode(v => v === 'list' ? 'calendar' : 'list')}>
            <MdCalendarToday /> {viewMode === 'list' ? 'Calendar' : 'List'}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => { fetchSchedules(); fetchStats(); }}><MdRefresh /></button>
          <button className="btn btn-primary" onClick={() => setScheduleModal(true)}>
            <MdAdd /> Schedule Surgery
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom:20 }}>
        {[
          { label:'Today Total',      value:stats.todayTotal      || 0, color:'#0ea5e9', icon:'🏥' },
          { label:'In Progress',      value:stats.todayInProgress || 0, color:'#10b981', icon:'⚕️' },
          { label:'Completed Today',  value:stats.todayCompleted  || 0, color:'#16a34a', icon:'✅' },
          { label:'Upcoming',         value:stats.upcoming        || 0, color:'#8b5cf6', icon:'📅' },
          { label:'This Month Done',  value:stats.thisMonthDone   || 0, color:'#f59e0b', icon:'📊' },
          { label:'This Month Hours', value:`${stats.thisMonthHours || 0}h`, color:'#06b6d4', icon:'⏱' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background:s.color+'20', fontSize:20 }}>{s.icon}</div>
            <div>
              <div className="stat-value" style={{ color:s.color, fontSize:typeof s.value==='string'?16:24 }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom:16 }}>
        <div style={{ display:'flex', gap:12, flexWrap:'wrap', alignItems:'center' }}>
          <div className="search-box" style={{ flex:1, minWidth:200 }}>
            <MdSearch className="search-icon" />
            <input placeholder="Search patient, surgery type, surgeon..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <input type="date" className="form-control" style={{ width:160 }} value={dateFilter} onChange={e => setDateFilter(e.target.value)} placeholder="Filter by date" />
          <button className="btn btn-secondary btn-sm" onClick={() => setDateFilter(todayISO())}>Today</button>
          {dateFilter && <button className="btn btn-ghost btn-sm" onClick={() => setDateFilter('')}>Clear</button>}
        </div>
        <div style={{ display:'flex', gap:6, marginTop:10, flexWrap:'wrap' }}>
          <button className={`pill${statusFilter===''?' active':''}`} onClick={() => setStatusFilter('')}>All ({total})</button>
          {Object.keys(STATUS_CFG).map(s => (
            <button key={s} className={`pill${statusFilter===s?' active':''}`} onClick={() => setStatusFilter(statusFilter===s?'':s)}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex-center" style={{ height:200 }}><ShortLoader/></div>
      ) : schedules.length === 0 ? (
        <div className="empty-state">
          <MdLocalHospital size={52} style={{ opacity:0.3, marginBottom:16 }} />
          <h3>No surgeries found</h3>
          <button className="btn btn-primary" style={{ marginTop:12 }} onClick={() => setScheduleModal(true)}>
            <MdAdd /> Schedule First Surgery
          </button>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {schedules.map(s => {
            const sc  = STATUS_CFG[s.status]   || STATUS_CFG.Scheduled;
            const pc  = PRIORITY_CFG[s.priority]|| PRIORITY_CFG.Routine;
            const prog = s.checklistProgress    || 0;
            const surgeon = s.team?.find(m => m.role === 'Surgeon')?.name || '—';

            return (
              <div key={s._id}
                onClick={() => setDetailId(s._id)}
                style={{ border:`1px solid var(--border)`, borderLeft:`5px solid ${sc.dot}`, borderRadius:14, padding:'14px 18px', background:'var(--card-bg)', cursor:'pointer', transition:'transform 0.15s', display:'grid', gridTemplateColumns:'1fr auto', alignItems:'center', gap:12 }}
                onMouseEnter={e => e.currentTarget.style.transform='translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform='none'}
              >
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4, flexWrap:'wrap' }}>
                    <span style={{ fontWeight:800, fontSize:15 }}>{s.surgeryType}</span>
                    <span style={{ background:sc.bg, color:sc.color, padding:'2px 10px', borderRadius:99, fontSize:11, fontWeight:700 }}>{s.status}</span>
                    {s.priority !== 'Routine' && (
                      <span style={{ background:pc.bg, color:pc.color, padding:'2px 10px', borderRadius:99, fontSize:11, fontWeight:700 }}>
                        {s.priority === 'Emergency' ? '🚨' : '⚡'} {s.priority}
                      </span>
                    )}
                    <span style={{ color:'var(--text-muted)', fontWeight:700, fontSize:12 }}>{s.scheduleNumber}</span>
                  </div>

                  <div style={{ display:'flex', gap:16, fontSize:13, flexWrap:'wrap' }}>
                    <span><strong>👤</strong> {s.patientName}</span>
                    <span><strong>🏥</strong> {s.otRoom}</span>
                    <span><strong>📅</strong> {fmtShort(s.scheduledDate)} at {s.startTime}</span>
                    <span><strong>⏱</strong> {s.estimatedMinutes}min</span>
                    {surgeon !== '—' && <span><strong>👨‍⚕️</strong> Dr. {surgeon}</span>}
                    <span className="text-muted">{s.anesthesiaType} anesthesia</span>
                  </div>

                  {/* Checklist progress bar */}
                  {s.status !== 'Completed' && (
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:8 }}>
                      <div style={{ flex:1, height:4, background:'var(--border)', borderRadius:99, overflow:'hidden', maxWidth:200 }}>
                        <div style={{ height:'100%', width:`${prog}%`, background: prog===100?'#10b981':'var(--accent)', borderRadius:99, transition:'width 0.3s' }} />
                      </div>
                      <span style={{ fontSize:11, color:'var(--text-muted)' }}>Checklist {prog}%</span>
                      {prog < 100 && <span style={{ fontSize:11, color:'#f59e0b', fontWeight:700 }}>⚠️ Incomplete</span>}
                    </div>
                  )}
                </div>

                <div style={{ textAlign:'right', flexShrink:0 }}>
                  {s.estimatedCost > 0 && (
                    <div style={{ fontWeight:700, color:'var(--accent)', fontSize:14 }}>{fmtPKR(s.estimatedCost)}</div>
                  )}
                  <div className="text-muted" style={{ fontSize:11, marginTop:4 }}>{s.team?.length || 0} team members</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination" style={{ marginTop:16 }}>
          <button disabled={page===1} onClick={() => setPage(p=>p-1)}>‹</button>
          {Array.from({ length:totalPages }, (_,i) => i+1).map(p => (
            <button key={p} className={page===p?'active':''} onClick={() => setPage(p)}>{p}</button>
          ))}
          <button disabled={page===totalPages} onClick={() => setPage(p=>p+1)}>›</button>
        </div>
      )}

      {/* Modals */}
      {scheduleModal && (
        <ScheduleModal
          onClose={() => setScheduleModal(false)}
          onSaved={() => { setScheduleModal(false); fetchSchedules(); fetchStats(); }}
        />
      )}
      {reportModal && <ReportModal onClose={() => setReportModal(false)} />}
    </div>
  );
}