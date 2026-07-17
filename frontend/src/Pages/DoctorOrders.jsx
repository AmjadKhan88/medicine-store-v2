import { useState, useEffect, useCallback, useRef } from 'react';
import {
  MdAdd, MdClose, MdCheck, MdEdit, MdDelete,
  MdRefresh, MdSearch, MdPerson, MdArrowBack,
  MdWarning, MdMedicalServices, MdAssignment,
  MdNotes, MdSwapHoriz,
} from 'react-icons/md';
import toast from 'react-hot-toast';
import API from '../utils/api';
import { useSocket } from '../context/SocketContext';

/* ── helpers ── */
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-PK', { day:'2-digit', month:'short', year:'numeric' }) : '—';
const fmtTime = d => d ? new Date(d).toLocaleTimeString('en-PK', { hour:'2-digit', minute:'2-digit' }) : '—';
const fmtDT   = d => d ? `${fmtDate(d)} ${fmtTime(d)}` : '—';
const todayISO= () => new Date().toISOString().slice(0,10);

const ORDER_TYPES = ['Medicine','Investigation','Diet','Procedure','Nursing','Consultation','Restriction','Other'];
const NOTE_TYPES  = ['Progress Note','Observation','Incident Report','Patient Education','Discharge Note','Other'];
const SHIFTS      = ['Morning','Evening','Night'];
const PRIORITIES  = ['Routine','Urgent','STAT','One-Time'];

const ORDER_TYPE_CFG = {
  Medicine:     { icon:'💊', color:'#0ea5e9' },
  Investigation:{ icon:'🔬', color:'#8b5cf6' },
  Diet:         { icon:'🥗', color:'#10b981' },
  Procedure:    { icon:'🩺', color:'#f59e0b' },
  Nursing:      { icon:'👩‍⚕️', color:'#ec4899' },
  Consultation: { icon:'👨‍⚕️', color:'#6366f1' },
  Restriction:  { icon:'🚫', color:'#ef4444' },
  Other:        { icon:'📋', color:'#64748b' },
};

const STATUS_CFG = {
  Pending:      { bg:'#fee2e2', color:'#ef4444', dot:'#ef4444'  },
  Acknowledged: { bg:'#fef3c7', color:'#f59e0b', dot:'#f59e0b'  },
  'In-Progress':{ bg:'#dbeafe', color:'#3b82f6', dot:'#3b82f6'  },
  Completed:    { bg:'#d1fae5', color:'#10b981', dot:'#10b981'  },
  Cancelled:    { bg:'#f3f4f6', color:'#6b7280', dot:'#6b7280'  },
  'On-Hold':    { bg:'#f3e8ff', color:'#8b5cf6', dot:'#8b5cf6'  },
};

const PRIORITY_CFG = {
  Routine:   { color:'#64748b', bg:'#f1f5f9' },
  Urgent:    { color:'#f59e0b', bg:'#fef3c7' },
  STAT:      { color:'#ef4444', bg:'#fee2e2' },
  'One-Time':{ color:'#8b5cf6', bg:'#ede9fe' },
};

/* ════════════════════════════════
   CREATE ORDER MODAL
════════════════════════════════ */
function CreateOrderModal({ admissionId, patientName, onClose, onCreated }) {
  const [form, setForm] = useState({
    orderType: 'Medicine', priority: 'Routine',
    title: '', details: '', frequency: '', duration: '',
    startDate: todayISO(), endDate: '',
  });
  const [saving, setSaving] = useState(false);
  const fld = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  // Quick fill templates per type
  const TEMPLATES = {
    Medicine:     'Medicine name · Dose · Route · Frequency',
    Investigation:'Test name · Urgency · Special instructions',
    Diet:         'Diet type (e.g. Low sodium, Diabetic diet, NPO)',
    Procedure:    'Procedure name · Technique · Special precautions',
    Nursing:      'Nursing action required (e.g. 4-hourly neuro obs, wound dressing)',
    Consultation: 'Specialty needed · Reason for consult',
    Restriction:  'Activity restriction or isolation requirement',
    Other:        'Order details',
  };

  const handleCreate = async () => {
    if (!form.title.trim()) { toast.error('Title required'); return; }
    setSaving(true);
    try {
      await API.post(`/clinical/${admissionId}/orders`, form);
      toast.success('Order created and sent to nurses');
      onCreated();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <div>
            <div className="modal-title">New Doctor Order</div>
            <div className="text-muted text-sm">Patient: {patientName}</div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><MdClose /></button>
        </div>

        {/* Order type selector */}
        <div className="form-group">
          <label className="form-label">Order Type</label>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6 }}>
            {ORDER_TYPES.map(t => {
              const cfg = ORDER_TYPE_CFG[t];
              return (
                <button key={t}
                  onClick={() => setForm(p => ({ ...p, orderType: t, details: '' }))}
                  style={{
                    padding:'10px 4px', borderRadius:10, cursor:'pointer',
                    background: form.orderType===t ? cfg.color : cfg.color+'15',
                    color:      form.orderType===t ? '#fff'     : cfg.color,
                    border: `2px solid ${cfg.color}`,
                    fontWeight:700, fontSize:11, textAlign:'center',
                  }}>
                  <div style={{ fontSize:18, marginBottom:3 }}>{cfg.icon}</div>
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        {/* Priority */}
        <div className="form-group">
          <label className="form-label">Priority</label>
          <div style={{ display:'flex', gap:8 }}>
            {PRIORITIES.map(p => {
              const cfg = PRIORITY_CFG[p];
              return (
                <button key={p}
                  onClick={() => setForm(f => ({ ...f, priority: p }))}
                  style={{
                    flex:1, padding:'8px 0', borderRadius:10, cursor:'pointer',
                    background: form.priority===p ? cfg.color : cfg.bg,
                    color:      form.priority===p ? '#fff'    : cfg.color,
                    border: `2px solid ${cfg.color}`,
                    fontWeight:700, fontSize:12,
                  }}>
                  {p === 'STAT' ? '🚨 STAT' : p === 'Urgent' ? '⚡ Urgent' : p}
                </button>
              );
            })}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label required">Order Title / Summary</label>
          <input className="form-control" value={form.title} onChange={fld('title')}
            placeholder={`e.g. ${TEMPLATES[form.orderType]}`} autoFocus />
        </div>

        <div className="form-group">
          <label className="form-label">Detailed Instructions</label>
          <textarea className="form-control" rows={3} value={form.details} onChange={fld('details')}
            placeholder="Full instructions for the nurse — dose, timing, precautions, etc." />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Frequency</label>
            <input className="form-control" value={form.frequency} onChange={fld('frequency')}
              placeholder="Once daily, PRN, Stat, Ongoing" />
          </div>
          <div className="form-group">
            <label className="form-label">Duration</label>
            <input className="form-control" value={form.duration} onChange={fld('duration')}
              placeholder="3 days, Until discharge, Indefinite" />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Start Date</label>
            <input className="form-control" type="date" value={form.startDate} onChange={fld('startDate')} />
          </div>
          <div className="form-group">
            <label className="form-label">End Date (optional)</label>
            <input className="form-control" type="date" value={form.endDate} onChange={fld('endDate')} min={form.startDate} />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleCreate} disabled={saving || !form.title.trim()}>
            {saving ? 'Sending...' : '📤 Send Order to Nurses'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════
   WRITE NOTE MODAL
════════════════════════════════ */
function WriteNoteModal({ admissionId, patientName, admissions = [], onClose, onCreated }) {
  const [form, setForm] = useState({
    noteType: 'Progress Note', title: '', content: '',
    tags: '', isPrivate: false, isPinned: false,
    admissionId: admissionId || '',
  });
  const [isHandover, setIsHandover] = useState(false);
  const [handover, setHandover] = useState({
    shiftType: 'Morning', outgoingNurse: '', incomingNurse: '',
    wardCovered: '', overallSummary: '', criticalPatients: '', pendingTasks: '',
  });
  const [patients, setPatients] = useState([]);
  const [patientSummaries, setPatientSummaries] = useState({});
  const [saving, setSaving] = useState(false);
  const fld  = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const hfld = k => e => setHandover(p => ({ ...p, [k]: e.target.value }));

  useEffect(() => {
    if (form.noteType === 'Shift Handover') {
      setIsHandover(true);
      // Load active patients for handover
      API.get('/nurse/patients')
        .then(({ data }) => setPatients(data.patients || []))
        .catch(() => {});
    } else {
      setIsHandover(false);
    }
  }, [form.noteType]);

  const updatePatientSummary = (admId, field, value) => {
    setPatientSummaries(p => ({
      ...p,
      [admId]: { ...(p[admId] || {}), admissionId: admId, [field]: value },
    }));
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast.error('Title and content required'); return;
    }
    setSaving(true);
    try {
      await API.post('/clinical/notes', {
        ...form,
        admissionId: form.admissionId || admissionId || null,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        shiftHandover: isHandover ? {
          ...handover,
          patientsHandover: Object.values(patientSummaries),
        } : null,
      });
      toast.success(`${form.noteType} saved`);
      onCreated();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg" style={{ maxHeight:'88vh', overflowY:'auto' }}>
        <div className="modal-header">
          <div className="modal-title">Write Nursing Note</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><MdClose /></button>
        </div>

        {/* Note type */}
        <div className="form-group">
          <label className="form-label">Note Type</label>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {['Progress Note','Shift Handover','Observation','Incident Report','Patient Education','Other'].map(t => (
              <button key={t}
                onClick={() => setForm(p => ({ ...p, noteType: t }))}
                className={`pill${form.noteType===t?' active':''}`}
                style={{ fontSize:12 }}>
                {t === 'Shift Handover' ? '🔄' : t === 'Incident Report' ? '⚠️' : '📝'} {t}
              </button>
            ))}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group" style={{ flex:2 }}>
            <label className="form-label required">Title</label>
            <input className="form-control" value={form.title} onChange={fld('title')}
              placeholder={
                isHandover ? 'e.g. Morning Shift Handover — Ward A' :
                form.noteType === 'Incident Report' ? 'e.g. Patient Fall — Bed A-05' :
                'Note title'
              } autoFocus />
          </div>
          {!isHandover && (
            <div className="form-group" style={{ flex:1 }}>
              <label className="form-label">Tags</label>
              <input className="form-control" value={form.tags} onChange={fld('tags')} placeholder="pain, fever, BP (comma sep)" />
            </div>
          )}
        </div>

        {/* Handover specific */}
        {isHandover && (
          <div className="card" style={{ marginBottom:16, background:'var(--bg-tertiary)' }}>
            <div style={{ fontWeight:700, marginBottom:12 }}>Shift Details</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:12 }}>
              <div className="form-group" style={{ marginBottom:0 }}>
                <label className="form-label">Shift</label>
                <select className="form-control" value={handover.shiftType} onChange={hfld('shiftType')}>
                  {SHIFTS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom:0 }}>
                <label className="form-label">Outgoing Nurse</label>
                <input className="form-control" value={handover.outgoingNurse} onChange={hfld('outgoingNurse')} placeholder="Your name" />
              </div>
              <div className="form-group" style={{ marginBottom:0 }}>
                <label className="form-label">Incoming Nurse</label>
                <input className="form-control" value={handover.incomingNurse} onChange={hfld('incomingNurse')} placeholder="Next nurse name" />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom:8 }}>
              <label className="form-label">Ward</label>
              <input className="form-control" value={handover.wardCovered} onChange={hfld('wardCovered')} placeholder="Ward A, ICU..." />
            </div>
            <div className="form-group" style={{ marginBottom:8 }}>
              <label className="form-label">Critical Patients</label>
              <input className="form-control" value={handover.criticalPatients} onChange={hfld('criticalPatients')} placeholder="Bed A-03 critical, Bed B-07 unstable..." />
            </div>
            <div className="form-group" style={{ marginBottom:0 }}>
              <label className="form-label">Pending Tasks</label>
              <input className="form-control" value={handover.pendingTasks} onChange={hfld('pendingTasks')} placeholder="IV change for A-02 at 10PM, Blood sample for B-05..." />
            </div>
          </div>
        )}

        {/* Incident report specific */}
        {form.noteType === 'Incident Report' && (
          <div className="card" style={{ marginBottom:16, background:'#fff9f0', border:'1px solid #fca5a5' }}>
            <div style={{ fontWeight:700, color:'#ef4444', marginBottom:12 }}>⚠️ Incident Details</div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Incident Type</label>
                <select className="form-control" onChange={e => setForm(p => ({ ...p, incidentReport: { ...(p.incidentReport||{}), incidentType: e.target.value } }))}>
                  {['Patient Fall','Medication Error','Equipment Failure','Needle Stick','Adverse Reaction','Other'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Severity</label>
                <select className="form-control" onChange={e => setForm(p => ({ ...p, incidentReport: { ...(p.incidentReport||{}), severity: e.target.value } }))}>
                  {['Minor','Moderate','Serious','Critical'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Action Taken</label>
              <input className="form-control" placeholder="Immediate actions taken..."
                onChange={e => setForm(p => ({ ...p, incidentReport: { ...(p.incidentReport||{}), actionTaken: e.target.value } }))} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Reported To</label>
                <input className="form-control" placeholder="Dr. Ahmed, Charge Nurse..."
                  onChange={e => setForm(p => ({ ...p, incidentReport: { ...(p.incidentReport||{}), reportedTo: e.target.value } }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Witness</label>
                <input className="form-control" placeholder="Witness name (if any)"
                  onChange={e => setForm(p => ({ ...p, incidentReport: { ...(p.incidentReport||{}), witnessName: e.target.value } }))} />
              </div>
            </div>
          </div>
        )}

        {/* Main content */}
        <div className="form-group">
          <label className="form-label required">
            {isHandover ? 'Overall Shift Summary' : 'Note Content'}
          </label>
          <textarea className="form-control" rows={isHandover ? 3 : 6} value={form.content} onChange={fld('content')}
            placeholder={
              isHandover ? 'Overall summary of the shift — general ward status, admissions, discharges...' :
              'Detailed nursing note...'
            } />
        </div>

        {/* Per-patient handover */}
        {isHandover && patients.length > 0 && (
          <div>
            <div style={{ fontWeight:700, marginBottom:10 }}>Patient-by-Patient Handover</div>
            {patients.map(p => (
              <div key={p._id} style={{ border:'1px solid var(--border)', borderRadius:10, padding:12, marginBottom:8 }}>
                <div style={{ fontWeight:700, fontSize:13, marginBottom:8 }}>
                  Bed {p.bedNumber} — {p.patientName}
                  <span className="text-muted" style={{ fontWeight:400, marginLeft:8, fontSize:11 }}>{p.admissionDiagnosis}</span>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  {[
                    { key:'summary',       label:'Condition summary'     },
                    { key:'vitals',        label:'Last vitals'           },
                    { key:'pendingOrders', label:'Pending orders/tasks'  },
                    { key:'alerts',        label:'Alerts for next nurse' },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label className="form-label" style={{ fontSize:10 }}>{label}</label>
                      <input className="form-control" style={{ fontSize:12 }}
                        value={(patientSummaries[p._id] || {})[key] || ''}
                        onChange={e => updatePatientSummary(p._id, key, e.target.value)}
                        placeholder={label} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display:'flex', gap:16, marginBottom:16 }}>
          <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:13 }}>
            <input type="checkbox" checked={form.isPrivate} onChange={e => setForm(p => ({ ...p, isPrivate: e.target.checked }))} />
            <span>Private (nursing staff only)</span>
          </label>
          <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:13 }}>
            <input type="checkbox" checked={form.isPinned} onChange={e => setForm(p => ({ ...p, isPinned: e.target.checked }))} />
            <span>📌 Pin to top</span>
          </label>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.title.trim() || !form.content.trim()}>
            {saving ? 'Saving...' : <><MdNotes /> Save Note</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════
   ORDER CARD
════════════════════════════════ */
function OrderCard({ order, onAck, onComplete, onCancel, showPatient = false }) {
  const [expanded,  setExpanded]  = useState(false);
  const [loading,   setLoading]   = useState('');
  const sc   = STATUS_CFG[order.status]   || STATUS_CFG.Pending;
  const pc   = PRIORITY_CFG[order.priority]|| PRIORITY_CFG.Routine;
  const tcfg = ORDER_TYPE_CFG[order.orderType] || ORDER_TYPE_CFG.Other;
  const isPending = order.status === 'Pending';
  const canAck    = ['Pending'].includes(order.status);
  const canDo     = ['Pending','Acknowledged','In-Progress'].includes(order.status);

  const act = async (fn, label) => {
    setLoading(label);
    await fn();
    setLoading('');
  };

  return (
    <div style={{
      border:       `1px solid var(--border)`,
      borderLeft:   `4px solid ${tcfg.color}`,
      borderRadius: 12,
      padding:      '12px 16px',
      background:   isPending ? '#fffbeb' : 'var(--card-bg)',
      transition:   'box-shadow 0.2s',
    }}>
      {/* Header row */}
      <div style={{ display:'flex', alignItems:'flex-start', gap:10, cursor:'pointer' }}
        onClick={() => setExpanded(p => !p)}>

        {/* Type icon */}
        <div style={{ fontSize:24, flexShrink:0, lineHeight:1 }}>{tcfg.icon}</div>

        {/* Main info */}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
            <span style={{ fontWeight:700, fontSize:14 }}>{order.title}</span>
            {order.priority !== 'Routine' && (
              <span style={{ background:pc.bg, color:pc.color, padding:'2px 8px', borderRadius:99, fontSize:11, fontWeight:700 }}>
                {order.priority === 'STAT' ? '🚨' : '⚡'} {order.priority}
              </span>
            )}
            <span style={{ background:sc.bg, color:sc.color, padding:'2px 8px', borderRadius:99, fontSize:11, fontWeight:700 }}>
              {order.status}
            </span>
          </div>

          <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:3, display:'flex', gap:12, flexWrap:'wrap' }}>
            {showPatient && <span><strong>👤</strong> {order.patientName} · Bed {order.bedNumber}</span>}
            <span><strong>👨‍⚕️</strong> Dr. {order.orderedByName}</span>
            <span>⏰ {fmtTime(order.orderedAt)}</span>
            {order.frequency && <span>🔄 {order.frequency}</span>}
            {order.duration  && <span>📅 {order.duration}</span>}
          </div>

          {/* Acknowledgement info */}
          {order.acknowledgement && (
            <div style={{ fontSize:11, color:'#10b981', marginTop:3 }}>
              ✓ Acknowledged by {order.acknowledgement.acknowledgedByName} at {fmtTime(order.acknowledgement.acknowledgedAt)}
            </div>
          )}
          {order.completedAt && (
            <div style={{ fontSize:11, color:'#10b981', marginTop:2 }}>
              ✅ Completed by {order.completedByName} at {fmtTime(order.completedAt)}
            </div>
          )}
          {order.status === 'Cancelled' && (
            <div style={{ fontSize:11, color:'#ef4444', marginTop:2 }}>
              ✗ Cancelled by {order.cancelledByName}: {order.cancellationReason}
            </div>
          )}
        </div>

        {/* Expand indicator */}
        <div style={{ fontSize:16, color:'var(--text-muted)', flexShrink:0 }}>{expanded ? '▲' : '▼'}</div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div style={{ marginTop:12, paddingTop:12, borderTop:'1px solid var(--border-light)' }}>
          {order.details && (
            <div style={{ fontSize:13, lineHeight:1.7, marginBottom:12, background:'var(--bg-tertiary)', padding:'10px 14px', borderRadius:8, whiteSpace:'pre-wrap' }}>
              {order.details}
            </div>
          )}
          {order.originalDetails && (
            <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:8 }}>
              ✏️ Modified by {order.modifiedBy} — Original: {order.originalDetails}
            </div>
          )}
          {order.completionNotes && (
            <div style={{ fontSize:12, color:'#10b981', marginBottom:8 }}>
              📝 Completion notes: {order.completionNotes}
            </div>
          )}
          {order.acknowledgement?.notes && (
            <div style={{ fontSize:12, color:'#f59e0b', marginBottom:8 }}>
              📝 Ack notes: {order.acknowledgement.notes}
            </div>
          )}
        </div>
      )}

      {/* Action buttons */}
      {canDo && (
        <div style={{ display:'flex', gap:6, marginTop:10, flexWrap:'wrap' }}>
          {canAck && (
            <button className="btn btn-secondary btn-sm" style={{ fontSize:11 }}
              disabled={!!loading} onClick={() => act(() => onAck(order._id), 'ack')}>
              {loading === 'ack' ? '...' : '✓ Acknowledge'}
            </button>
          )}
          <button className="btn btn-success btn-sm" style={{ fontSize:11 }}
            disabled={!!loading} onClick={() => {
              const notes = prompt('Completion notes (optional)?') ?? '';
              if (notes !== null) act(() => onComplete(order._id, notes), 'complete');
            }}>
            {loading === 'complete' ? '...' : <><MdCheck size={12} /> Done</>}
          </button>
          <button className="btn btn-danger btn-sm" style={{ fontSize:11 }}
            disabled={!!loading} onClick={() => {
              const reason = prompt('Reason for cancellation?');
              if (reason !== null) act(() => onCancel(order._id, reason), 'cancel');
            }}>
            ✗ Cancel
          </button>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════
   ADMISSION ORDERS VIEW
════════════════════════════════ */
function AdmissionOrdersView({ admissionId, patientName, onBack }) {
  const [orders, setOrders] = useState([]);
  const [notes,  setNotes ] = useState([]);
  const [tab,    setTab   ] = useState('orders');
  const [loading,setLoading]= useState(true);
  const [filter, setFilter ] = useState('');
  const [orderModal,setOrderModal] = useState(false);
  const [noteModal, setNoteModal ] = useState(false);

  const { on } = useSocket() || {};

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const [ordRes, noteRes] = await Promise.all([
        API.get(`/clinical/${admissionId}/orders`, { params: { limit:100 } }),
        API.get(`/clinical/${admissionId}/notes`,  { params: { limit:50  } }),
      ]);
      setOrders(ordRes.data.orders);
      setNotes( noteRes.data.notes);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  }, [admissionId]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  useEffect(() => {
    if (!on) return;
    const unsubs = [
      on('orders:new',         () => fetchOrders()),
      on('orders:acknowledged',() => fetchOrders()),
      on('orders:completed',   () => fetchOrders()),
      on('orders:cancelled',   () => fetchOrders()),
    ];
    return () => unsubs.forEach(u => u && u());
  }, [on, fetchOrders]);

  const handleAck = async (orderId) => {
    try {
      const notes = prompt('Acknowledgement notes (optional)?') ?? '';
      if (notes === null) return;
      await API.patch(`/clinical/orders/${orderId}/acknowledge`, { notes });
      toast.success('Order acknowledged');
      fetchOrders();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleComplete = async (orderId, completionNotes) => {
    try {
      await API.patch(`/clinical/orders/${orderId}/complete`, { completionNotes });
      toast.success('Order completed');
      fetchOrders();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleCancel = async (orderId, reason) => {
    try {
      await API.patch(`/clinical/orders/${orderId}/cancel`, { reason });
      toast.success('Order cancelled');
      fetchOrders();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleAckAll = async () => {
    try {
      const { data } = await API.post(`/clinical/${admissionId}/orders/acknowledge-all`);
      toast.success(data.message);
      fetchOrders();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const pendingCount  = orders.filter(o => o.status === 'Pending').length;
  const filteredOrders = filter ? orders.filter(o => o.status === filter) : orders;

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <button className="btn btn-ghost btn-icon" onClick={onBack}><MdArrowBack /></button>
          <div>
            <h2 style={{ margin:0 }}>Orders & Notes — {patientName}</h2>
            <div className="text-muted text-sm">
              {orders.length} orders · {notes.length} notes
              {pendingCount > 0 && <span style={{ color:'#ef4444', fontWeight:700 }}> · {pendingCount} pending</span>}
            </div>
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-secondary btn-sm" onClick={fetchOrders}><MdRefresh /></button>
          {pendingCount > 0 && (
            <button className="btn btn-secondary" onClick={handleAckAll}>
              <MdCheck /> Acknowledge All ({pendingCount})
            </button>
          )}
          <button className="btn btn-secondary" onClick={() => setNoteModal(true)}>
            <MdNotes /> Write Note
          </button>
          <button className="btn btn-primary" onClick={() => setOrderModal(true)}>
            <MdAdd /> New Order
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:16, borderBottom:'1px solid var(--border)' }}>
        {[
          { id:'orders', label:`Orders (${orders.length})` },
          { id:'notes',  label:`Notes (${notes.length})`   },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding:'10px 16px', background:'none', border:'none', borderBottom: tab===t.id?'2px solid var(--accent)':'2px solid transparent', color: tab===t.id?'var(--accent)':'var(--text-muted)', fontWeight: tab===t.id?700:500, cursor:'pointer', fontSize:14, fontFamily:'var(--font-main)' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── ORDERS ── */}
      {tab === 'orders' && (
        <div>
          {/* Filter pills */}
          <div style={{ display:'flex', gap:6, marginBottom:14, flexWrap:'wrap' }}>
            <button className={`pill${filter===''?' active':''}`} onClick={() => setFilter('')}>All</button>
            {Object.entries(STATUS_CFG).map(([s, cfg]) => {
              const count = orders.filter(o => o.status === s).length;
              if (!count) return null;
              return (
                <button key={s} className={`pill${filter===s?' active':''}`} onClick={() => setFilter(filter===s?'':s)}>
                  {s} ({count})
                </button>
              );
            })}
          </div>

          {loading ? (
            <div className="flex-center" style={{ height:200 }}><div className="text-muted">Loading...</div></div>
          ) : filteredOrders.length === 0 ? (
            <div className="empty-state">
              <MdAssignment size={48} style={{ opacity:0.3, marginBottom:12 }} />
              <h3>No orders yet</h3>
              <button className="btn btn-primary" style={{ marginTop:12 }} onClick={() => setOrderModal(true)}>
                <MdAdd /> Write First Order
              </button>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {filteredOrders.map(order => (
                <OrderCard key={order._id} order={order}
                  onAck={handleAck} onComplete={handleComplete} onCancel={handleCancel} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── NOTES ── */}
      {tab === 'notes' && (
        <div>
          <button className="btn btn-secondary" style={{ marginBottom:14 }} onClick={() => setNoteModal(true)}>
            <MdAdd /> Write Note
          </button>

          {notes.length === 0 ? (
            <div className="empty-state">
              <MdNotes size={48} style={{ opacity:0.3, marginBottom:12 }} />
              <h3>No nursing notes</h3>
              <button className="btn btn-primary" style={{ marginTop:12 }} onClick={() => setNoteModal(true)}>
                <MdAdd /> Write First Note
              </button>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {notes.map(note => <NoteCard key={note._id} note={note} onRefresh={fetchOrders} />)}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {orderModal && (
        <CreateOrderModal admissionId={admissionId} patientName={patientName}
          onClose={() => setOrderModal(false)}
          onCreated={() => { setOrderModal(false); fetchOrders(); }} />
      )}
      {noteModal && (
        <WriteNoteModal admissionId={admissionId} patientName={patientName}
          onClose={() => setNoteModal(false)}
          onCreated={() => { setNoteModal(false); fetchOrders(); }} />
      )}
    </div>
  );
}

/* ════════════════════════════════
   NOTE CARD
════════════════════════════════ */
function NoteCard({ note, onRefresh }) {
  const [expanded, setExpanded] = useState(false);

  const typeColors = {
    'Progress Note': '#0ea5e9', 'Shift Handover': '#10b981', 'Observation': '#f59e0b',
    'Incident Report': '#ef4444', 'Patient Education': '#8b5cf6', 'Discharge Note': '#6366f1', 'Other': '#64748b',
  };
  const color = typeColors[note.noteType] || '#64748b';

  return (
    <div style={{
      border: `1px solid var(--border)`, borderLeft: `4px solid ${color}`,
      borderRadius: 12, padding: '12px 16px', background: 'var(--card-bg)',
    }}>
      <div style={{ display:'flex', alignItems:'flex-start', gap:10, cursor:'pointer' }}
        onClick={() => setExpanded(p => !p)}>
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
            <span style={{ background: color+'20', color, padding:'2px 8px', borderRadius:99, fontSize:11, fontWeight:700 }}>
              {note.isPinned ? '📌 ' : ''}{note.noteType}
            </span>
            {note.isPrivate && <span style={{ fontSize:11, color:'var(--text-muted)' }}>🔒 Private</span>}
            <span style={{ fontWeight:700, fontSize:14 }}>{note.title}</span>
          </div>
          <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:3 }}>
            ✍️ {note.writtenByName} · {fmtDT(note.writtenAt)}
            {note.tags?.length > 0 && (
              <span style={{ marginLeft:8 }}>
                {note.tags.map(t => (
                  <span key={t} style={{ background:'var(--bg-tertiary)', padding:'1px 6px', borderRadius:4, fontSize:10, marginRight:4 }}>{t}</span>
                ))}
              </span>
            )}
          </div>
        </div>
        <span style={{ fontSize:14, color:'var(--text-muted)', flexShrink:0 }}>{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div style={{ marginTop:12, paddingTop:12, borderTop:'1px solid var(--border-light)' }}>
          <div style={{ fontSize:14, lineHeight:1.8, whiteSpace:'pre-wrap' }}>{note.content}</div>

          {/* Shift handover summary */}
          {note.noteType === 'Shift Handover' && note.shiftHandover && (
            <div style={{ marginTop:12 }}>
              <div style={{ fontWeight:700, marginBottom:8, fontSize:13 }}>
                🔄 {note.shiftHandover.shiftType} Shift · {note.shiftHandover.wardCovered}
              </div>
              <div style={{ fontSize:12, display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:10 }}>
                {[
                  ['Outgoing', note.shiftHandover.outgoingNurse],
                  ['Incoming', note.shiftHandover.incomingNurse],
                  ['Critical Patients', note.shiftHandover.criticalPatients],
                  ['Pending Tasks', note.shiftHandover.pendingTasks],
                ].filter(([,v]) => v).map(([k,v]) => (
                  <div key={k} style={{ background:'var(--bg-tertiary)', borderRadius:8, padding:'8px 10px' }}>
                    <div className="text-muted" style={{ fontSize:10 }}>{k}</div>
                    <div style={{ fontWeight:600, marginTop:2 }}>{v}</div>
                  </div>
                ))}
              </div>
              {note.shiftHandover.patientsHandover?.length > 0 && (
                <div>
                  <div style={{ fontWeight:700, fontSize:12, marginBottom:6 }}>Patient Handovers:</div>
                  {note.shiftHandover.patientsHandover.map((p, i) => (
                    <div key={i} style={{ background:'var(--bg-secondary)', borderRadius:8, padding:'8px 12px', marginBottom:6, fontSize:12 }}>
                      <div style={{ fontWeight:700 }}>Bed {p.bedNumber} — {p.patientName}</div>
                      {p.summary  && <div className="text-muted">Status: {p.summary}</div>}
                      {p.vitals   && <div className="text-muted">Vitals: {p.vitals}</div>}
                      {p.pendingOrders && <div style={{ color:'#f59e0b' }}>Pending: {p.pendingOrders}</div>}
                      {p.alerts   && <div style={{ color:'#ef4444', fontWeight:600 }}>⚠️ {p.alerts}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Incident report */}
          {note.noteType === 'Incident Report' && note.incidentReport && (
            <div style={{ marginTop:12, background:'#fff5f5', border:'1px solid #fca5a5', borderRadius:8, padding:12 }}>
              <div style={{ fontWeight:700, color:'#ef4444', marginBottom:8 }}>⚠️ Incident Details</div>
              {[
                ['Type',        note.incidentReport.incidentType],
                ['Severity',    note.incidentReport.severity],
                ['Action Taken',note.incidentReport.actionTaken],
                ['Reported To', note.incidentReport.reportedTo],
                ['Witness',     note.incidentReport.witnessName],
              ].filter(([,v]) => v).map(([k,v]) => (
                <div key={k} style={{ fontSize:12, marginBottom:4 }}>
                  <span className="text-muted">{k}: </span><span style={{ fontWeight:600 }}>{v}</span>
                </div>
              ))}
            </div>
          )}

          {/* Review */}
          {note.reviewedBy && (
            <div style={{ marginTop:10, fontSize:12, color:'#10b981' }}>
              👁 Reviewed by {note.reviewedByName} · {fmtDT(note.reviewedAt)}
              {note.reviewNotes && `: ${note.reviewNotes}`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════
   MAIN PAGE
════════════════════════════════ */
export default function DoctorOrders() {
  const [admissions, setAdmissions] = useState([]);
  const [stats,      setStats     ] = useState({});
  const [pendingAll, setPendingAll ] = useState([]);
  const [loading,    setLoading   ] = useState(true);
  const [search,     setSearch    ] = useState('');
  const [detailId,   setDetailId  ] = useState(null);
  const [detailName, setDetailName] = useState('');
  const [activeTab,  setActiveTab ] = useState('patients');
  const [handovers,  setHandovers ] = useState([]);
  const [noteModal,  setNoteModal ] = useState(false);

  const { on } = useSocket() || {};
  const alertRef = useRef(null);

  const fetchAdmissions = useCallback(async () => {
    setLoading(true);
    try {
      const [admRes, statsRes, pendRes, handRes] = await Promise.all([
        API.get('/ipd',          { params: { status:'Active', limit:50 } }),
        API.get('/clinical/stats'),
        API.get('/clinical/pending'),
        API.get('/clinical/handovers', { params: { limit:5 } }),
      ]);
      setAdmissions(admRes.data.admissions);
      setStats(statsRes.data.stats);
      setPendingAll(pendRes.data.orders);
      setHandovers(handRes.data.handovers);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAdmissions(); }, [fetchAdmissions]);

  useEffect(() => {
    if (!on) return;
    const unsubs = [
      on('orders:new', (data) => {
        toast(`📋 New order: ${data.title} — ${data.patientName} (Bed ${data.bedNumber})`, {
          icon: data.priority === 'STAT' ? '🚨' : data.priority === 'Urgent' ? '⚡' : '📋',
          duration: 6000,
        });
        fetchAdmissions();
      }),
      on('orders:acknowledged', () => fetchAdmissions()),
      on('orders:completed',    () => fetchAdmissions()),
      on('nursing:handover', (data) => {
        toast.success(`🔄 Shift handover posted by ${data.writtenBy} — ${data.shiftType} shift`, { duration:5000 });
        fetchAdmissions();
      }),
      on('nursing:incident', (data) => {
        toast.error(`⚠️ Incident report: ${data.title} (${data.severity})`, { duration:8000 });
        fetchAdmissions();
      }),
    ];
    return () => unsubs.forEach(u => u && u());
  }, [on, fetchAdmissions]);

  if (detailId) {
    return (
      <AdmissionOrdersView
        admissionId={detailId}
        patientName={detailName}
        onBack={() => { setDetailId(null); fetchAdmissions(); }}
      />
    );
  }

  const filtered = admissions.filter(a =>
    !search || a.patientName.toLowerCase().includes(search.toLowerCase()) ||
    a.bedNumber?.includes(search) || a.wardName?.toLowerCase().includes(search.toLowerCase())
  );

  const TABS = [
    { id:'patients',  label:'Active Patients' },
    { id:'pending',   label:`All Pending (${stats.pending || 0})` },
    { id:'handovers', label:'Shift Handovers'                    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>Doctor Orders & Nursing Notes</h1>
          <p>
            {stats.pending || 0} orders pending acknowledgement ·
            {stats.todayOrders || 0} orders today
          </p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-secondary" onClick={() => setNoteModal(true)}>
            <MdNotes /> Write Handover
          </button>
          <button className="btn btn-secondary btn-sm" onClick={fetchAdmissions}><MdRefresh /></button>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom:20 }}>
        {[
          { label:'Pending Ack',   value:stats.pending        || 0, color:'#ef4444', icon:'🔴' },
          { label:'Unacknowledged',value:stats.unacknowledged || 0, color:'#f59e0b', icon:'⚠️' },
          { label:'Today Orders',  value:stats.todayOrders    || 0, color:'#0ea5e9', icon:'📋' },
          { label:'Active Patients',value:admissions.length,        color:'#10b981', icon:'👥' },
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

      {/* Global pending alert */}
      {stats.pending > 0 && (
        <div style={{ background:'#fee2e2', border:'1px solid #fca5a5', borderRadius:12, padding:'12px 16px', marginBottom:16, display:'flex', alignItems:'center', gap:12 }}>
          <MdWarning size={22} style={{ color:'#ef4444', flexShrink:0 }} />
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:700, color:'#dc2626' }}>{stats.pending} orders waiting for nurse acknowledgement</div>
            <div style={{ fontSize:12, color:'#991b1b' }}>Click any patient to view and acknowledge orders</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:16, borderBottom:'1px solid var(--border)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{ padding:'10px 16px', background:'none', border:'none', borderBottom: activeTab===t.id?'2px solid var(--accent)':'2px solid transparent', color: activeTab===t.id?'var(--accent)':'var(--text-muted)', fontWeight: activeTab===t.id?700:500, cursor:'pointer', fontSize:14, fontFamily:'var(--font-main)' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── PATIENTS TAB ── */}
      {activeTab === 'patients' && (
        <div>
          <div className="search-box" style={{ marginBottom:14 }}>
            <MdSearch className="search-icon" />
            <input placeholder="Search patient, bed, ward..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          {loading ? (
            <div className="flex-center" style={{ height:200 }}><div className="text-muted">Loading...</div></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <MdPerson size={48} style={{ opacity:0.3, marginBottom:12 }} />
              <h3>No active IPD patients</h3>
              <p>Admit patients through IPD Management first</p>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {filtered.map(a => {
                // Count pending orders for this patient from pendingAll
                const patientPending = pendingAll.filter(o => o.admission === a._id || o.admission?._id === a._id || o.admission?.toString() === a._id?.toString()).length;
                return (
                  <div key={a._id}
                    onClick={() => { setDetailId(a._id); setDetailName(a.patientName); }}
                    style={{ border:`1px solid ${patientPending>0?'#fca5a5':'var(--border)'}`, borderLeft:`4px solid ${patientPending>0?'#ef4444':'var(--accent)'}`, borderRadius:12, padding:'14px 16px', background: patientPending>0?'#fff9f9':'var(--card-bg)', cursor:'pointer', transition:'all 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.transform='translateX(4px)'}
                    onMouseLeave={e => e.currentTarget.style.transform='none'}
                  >
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                      <div>
                        <div style={{ fontWeight:700, fontSize:15 }}>{a.patientName}</div>
                        <div className="text-muted text-sm">
                          {a.wardName} · Bed {a.bedNumber}
                          {a.attendingDoctor && ` · Dr. ${a.attendingDoctor}`}
                          {a.admissionDiagnosis && ` · ${a.admissionDiagnosis}`}
                        </div>
                      </div>
                      <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                        {patientPending > 0 && (
                          <span style={{ background:'#fee2e2', color:'#ef4444', padding:'4px 12px', borderRadius:99, fontSize:12, fontWeight:800 }}>
                            🔴 {patientPending} pending
                          </span>
                        )}
                        <span style={{ color:'var(--accent)', fontSize:13, fontWeight:600 }}>View →</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── PENDING ORDERS (nurse global view) ── */}
      {activeTab === 'pending' && (
        <div>
          {pendingAll.length === 0 ? (
            <div className="empty-state">
              <MdAssignment size={48} style={{ opacity:0.3, marginBottom:12 }} />
              <h3>No pending orders</h3>
              <p>All orders acknowledged ✓</p>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {pendingAll.map(order => (
                <OrderCard key={order._id} order={order} showPatient
                  onAck={async (id) => {
                    const notes = prompt('Ack notes?') ?? '';
                    if (notes === null) return;
                    try {
                      await API.patch(`/clinical/orders/${id}/acknowledge`, { notes });
                      toast.success('Acknowledged');
                      fetchAdmissions();
                    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
                  }}
                  onComplete={async (id, completionNotes) => {
                    try {
                      await API.patch(`/clinical/orders/${id}/complete`, { completionNotes });
                      toast.success('Completed');
                      fetchAdmissions();
                    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
                  }}
                  onCancel={async (id, reason) => {
                    try {
                      await API.patch(`/clinical/orders/${id}/cancel`, { reason });
                      toast.success('Cancelled');
                      fetchAdmissions();
                    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── HANDOVERS TAB ── */}
      {activeTab === 'handovers' && (
        <div>
          <button className="btn btn-primary" style={{ marginBottom:16 }} onClick={() => setNoteModal(true)}>
            <MdAdd /> Write Shift Handover
          </button>
          {handovers.length === 0 ? (
            <div className="empty-state">
              <MdSwapHoriz size={48} style={{ opacity:0.3, marginBottom:12 }} />
              <h3>No handovers yet</h3>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {handovers.map(h => <NoteCard key={h._id} note={h} onRefresh={fetchAdmissions} />)}
            </div>
          )}
        </div>
      )}

      {/* Write note modal (for handovers from main page) */}
      {noteModal && (
        <WriteNoteModal
          admissions={admissions}
          onClose={() => setNoteModal(false)}
          onCreated={() => { setNoteModal(false); fetchAdmissions(); }}
        />
      )}
    </div>
  );
}