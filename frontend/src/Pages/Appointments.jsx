import { useState, useEffect, useCallback } from 'react';
import {
  MdAdd, MdSearch, MdCalendarToday, MdList,
  MdCheckCircle, MdCancel, MdVisibility,
  MdPerson, MdMedicalServices, MdArrowBack,
  MdArrowForward, MdEdit,
} from 'react-icons/md';
import toast from 'react-hot-toast';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useSocketEvent } from '../hooks/useSocketEvent';

/* ── helpers ── */
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TIME_SLOTS = ['08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM', '06:00 PM'];
const TYPES = ['Checkup', 'Follow-up', 'Emergency', 'Consultation', 'Procedure', 'Lab Test', 'Other'];

const STATUS_STYLE = {
  Scheduled: { cls: 'badge-accent', dot: '#6366f1' },
  Completed: { cls: 'badge-success', dot: '#10b981' },
  Cancelled: { cls: 'badge-danger', dot: '#ef4444' },
  'No-Show': { cls: 'badge-warning', dot: '#f59e0b' },
};

const TYPE_COLOR = {
  Checkup: '#0ea5e9', 'Follow-up': '#10b981', Emergency: '#ef4444',
  Consultation: '#8b5cf6', Procedure: '#f59e0b', 'Lab Test': '#06b6d4',
  Other: '#94a3b8',
};

const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—';

const fmtDateTime = (d) => d
  ? new Date(d).toLocaleString('en-PK', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  : '—';

/* ═══════════════════════════════════════════
   BOOK APPOINTMENT MODAL
═══════════════════════════════════════════ */
function BookModal({ onClose, onSaved, editing }) {
  const { user } = useAuth();
  const store = (() => { try { return JSON.parse(localStorage.getItem('medistore_profile')) || {}; } catch { return {}; } })();

  const [patSearch, setPatSearch] = useState('');
  const [patients, setPatients] = useState([]);
  const [showDrop, setShowDrop] = useState(false);
  const [selectedPat, setSelectedPat] = useState(editing?.patient || null);

  const [form, setForm] = useState({
    doctorName: editing?.doctorName || store.doctor || user?.name || '',
    date: editing?.date ? new Date(editing.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    timeSlot: editing?.timeSlot || '10:00 AM',
    type: editing?.type || 'Checkup',
    notes: editing?.visitNotes || '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (patSearch.length < 2) { setShowDrop(false); return; }
    API.get('/patients', { params: { search: patSearch, limit: 6 } })
      .then(({ data }) => { setPatients(data.patients); setShowDrop(true); });
  }, [patSearch]);

  const fld = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSave = async () => {
    if (!selectedPat && !editing) { toast.error('Select a patient'); return; }
    if (!form.doctorName) { toast.error('Doctor name required'); return; }
    setSaving(true);
    try {
      if (editing) {
        await API.put(`/appointments/${editing._id}`, form);
        toast.success('Appointment updated');
      } else {
        await API.post('/appointments', { patient: selectedPat._id, ...form });
        toast.success('Appointment scheduled!');
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">{editing ? 'Edit Appointment' : 'Schedule Appointment'}</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>

        {/* Patient */}
        {!editing && (
          <div className="form-group">
            <label className="form-label required">Patient</label>
            {selectedPat ? (
              <div className="flex-between" style={{ background: 'var(--bg-tertiary)', borderRadius: 10, padding: '10px 14px' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{selectedPat.name}</div>
                  <div className="text-muted text-sm">{selectedPat.patientId}</div>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={() => setSelectedPat(null)}>Change</button>
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <div className="input-group">
                  <MdSearch className="input-icon" />
                  <input className="form-control" placeholder="Search patient..."
                    value={patSearch} onChange={e => setPatSearch(e.target.value)} />
                </div>
                {showDrop && patients.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 10, zIndex: 100, boxShadow: 'var(--shadow-lg)', marginTop: 4 }}>
                    {patients.map(p => (
                      <div key={p._id} style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border-light)' }}
                        onMouseDown={() => { setSelectedPat(p); setPatSearch(''); setShowDrop(false); }}>
                        <div style={{ fontWeight: 600 }}>{p.name}</div>
                        <div className="text-muted text-sm">{p.patientId} · Age {p.age}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="form-row">
          <div className="form-group">
            <label className="form-label required">Date</label>
            <input className="form-control" type="date" value={form.date} onChange={fld('date')}
              min={new Date().toISOString().slice(0, 10)} />
          </div>
          <div className="form-group">
            <label className="form-label">Time Slot</label>
            <select className="form-control" value={form.timeSlot} onChange={fld('timeSlot')}>
              {TIME_SLOTS.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label required">Doctor</label>
            <input className="form-control" value={form.doctorName} onChange={fld('doctorName')} placeholder="Dr. Ahmad" />
          </div>
          <div className="form-group">
            <label className="form-label">Appointment Type</label>
            <select className="form-control" value={form.type} onChange={fld('type')}>
              {TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Notes</label>
          <textarea className="form-control" rows={2} value={form.notes} onChange={fld('notes')}
            placeholder="Reason for visit, special instructions..." />
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : editing ? 'Update' : 'Schedule Appointment'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   COMPLETE VISIT MODAL
═══════════════════════════════════════════ */
function CompleteVisitModal({ appointment, onClose, onSaved }) {
  const [form, setForm] = useState({
    visitNotes: appointment.visitNotes || '',
    diagnosis: appointment.diagnosis || '',
    vitalSigns: appointment.vitalSigns || { bp: '', pulse: '', temperature: '', weight: '', sugar: '' },
    medicinesGiven: appointment.medicinesGiven || [],
    followUpDate: '',
  });
  const [medSearch, setMedSearch] = useState('');
  const [medicines, setMedicines] = useState([]);
  const [showDrop, setShowDrop] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (medSearch.length < 2) { setShowDrop(false); return; }
    API.get('/medicines', { params: { search: medSearch, limit: 6 } })
      .then(({ data }) => { setMedicines(data.medicines); setShowDrop(true); });
  }, [medSearch]);

  const addMed = (med) => {
    setMedSearch(''); setShowDrop(false);
    if (form.medicinesGiven.find(m => m.medicine === med._id)) return;
    setForm(p => ({
      ...p,
      medicinesGiven: [...p.medicinesGiven, { medicine: med._id, medicineName: med.name, dosage: '', quantity: 1 }],
    }));
  };

  const updateMed = (idx, field, val) => {
    setForm(p => ({
      ...p,
      medicinesGiven: p.medicinesGiven.map((m, i) => i === idx ? { ...m, [field]: val } : m),
    }));
  };

  const removeMed = (idx) => setForm(p => ({ ...p, medicinesGiven: p.medicinesGiven.filter((_, i) => i !== idx) }));
  const fld = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));
  const vital = (k) => (e) => setForm(p => ({ ...p, vitalSigns: { ...p.vitalSigns, [k]: e.target.value } }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await API.patch(`/appointments/${appointment._id}/complete`, form);
      toast.success('Visit recorded!');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <div>
            <div className="modal-title">Record Visit — {appointment.patientName}</div>
            <div className="text-muted text-sm">{fmtDateTime(appointment.date)} · Dr. {appointment.doctorName}</div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>

        {/* Vital Signs */}
        <div className="card" style={{ marginBottom: 16, background: 'var(--bg-tertiary)', boxShadow: 'none' }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>VITAL SIGNS</div>
          <div className="form-row">
            {[
              { key: 'bp', label: 'Blood Pressure', placeholder: '120/80 mmHg' },
              { key: 'pulse', label: 'Pulse', placeholder: '72 bpm' },
              { key: 'temperature', label: 'Temperature', placeholder: '98.6 °F' },
              { key: 'weight', label: 'Weight (kg)', placeholder: '70' },
              { key: 'sugar', label: 'Blood Sugar', placeholder: 'mg/dL' },
            ].map(v => (
              <div key={v.key} className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">{v.label}</label>
                <input className="form-control" value={form.vitalSigns[v.key] || ''}
                  onChange={vital(v.key)} placeholder={v.placeholder} />
              </div>
            ))}
          </div>
        </div>

        {/* Visit details */}
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Diagnosis</label>
            <input className="form-control" value={form.diagnosis} onChange={fld('diagnosis')}
              placeholder="e.g. URTI, Hypertension, Diabetes follow-up" />
          </div>
          <div className="form-group">
            <label className="form-label">Follow-up Date</label>
            <input className="form-control" type="date" value={form.followUpDate} onChange={fld('followUpDate')} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Visit Notes</label>
          <textarea className="form-control" rows={3} value={form.visitNotes} onChange={fld('visitNotes')}
            placeholder="Chief complaint, examination findings, treatment plan..." />
        </div>

        {/* Medicines given */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10 }}>
            MEDICINES GIVEN DURING VISIT
          </div>

          {/* Search */}
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <div className="input-group">
              <MdSearch className="input-icon" />
              <input className="form-control" placeholder="Search medicine from inventory..."
                value={medSearch} onChange={e => setMedSearch(e.target.value)} />
            </div>
            {showDrop && medicines.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 10, zIndex: 100, boxShadow: 'var(--shadow-lg)', marginTop: 4 }}>
                {medicines.map(m => (
                  <div key={m._id} style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between' }}
                    onMouseDown={() => addMed(m)}>
                    <span style={{ fontWeight: 600 }}>{m.name}</span>
                    <span className="text-muted text-sm">Stock: {m.stock}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {form.medicinesGiven.map((med, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, padding: '10px 12px', background: 'var(--bg-tertiary)', borderRadius: 10 }}>
              <div style={{ fontWeight: 600, fontSize: 13, flex: 1 }}>{med.medicineName}</div>
              <input className="form-control" style={{ width: 140 }} placeholder="Dosage e.g. 1 tab twice daily"
                value={med.dosage} onChange={e => updateMed(idx, 'dosage', e.target.value)} />
              <input className="form-control" type="number" style={{ width: 70 }} placeholder="Qty" min={0}
                value={med.quantity} onChange={e => updateMed(idx, 'quantity', e.target.value)} />
              <button className="btn btn-danger btn-sm btn-icon" onClick={() => removeMed(idx)}>✕</button>
            </div>
          ))}

          {form.medicinesGiven.length === 0 && (
            <div className="text-muted text-sm" style={{ padding: '12px 0' }}>No medicines added — use search above</div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-success" onClick={handleSave} disabled={saving}>
            <MdCheckCircle /> {saving ? 'Saving...' : 'Complete Visit'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MINI CALENDAR
═══════════════════════════════════════════ */
function MiniCalendar({ year, month, grouped, onDayClick, onPrev, onNext }) {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const today = new Date();
  const isToday = (d) => today.getFullYear() === year && today.getMonth() + 1 === month && today.getDate() === d;

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div>
      {/* Nav */}
      <div className="flex-between" style={{ marginBottom: 16 }}>
        <button className="btn btn-ghost btn-icon" onClick={onPrev}><MdArrowBack /></button>
        <div style={{ fontWeight: 800, fontSize: 16 }}>{MONTHS[month - 1]} {year}</div>
        <button className="btn btn-ghost btn-icon" onClick={onNext}><MdArrowForward /></button>
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 4 }}>
        {DAYS.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', padding: '4px 0' }}>{d}</div>
        ))}
      </div>

      {/* Cells */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const appts = grouped[day] || [];
          const hasAppts = appts.length > 0;

          return (
            <div key={i}
              onClick={() => day && onDayClick(day, appts)}
              style={{
                minHeight: 52, borderRadius: 8, padding: '4px 5px', cursor: hasAppts ? 'pointer' : 'default',
                border: isToday(day) ? '2px solid var(--accent)' : '1px solid var(--border)',
                background: isToday(day) ? 'var(--accent-light)' : hasAppts ? 'var(--bg-secondary)' : 'transparent',
                transition: 'var(--transition)',
              }}
              onMouseEnter={e => hasAppts && (e.currentTarget.style.background = 'var(--bg-tertiary)')}
              onMouseLeave={e => hasAppts && (e.currentTarget.style.background = isToday(day) ? 'var(--accent-light)' : 'var(--bg-secondary)')}
            >
              <div style={{ fontWeight: isToday(day) ? 800 : 500, fontSize: 13, color: isToday(day) ? 'var(--accent)' : 'var(--text-primary)', marginBottom: 2 }}>{day}</div>
              {appts.slice(0, 2).map((a, ai) => (
                <div key={ai} style={{ fontSize: 9, fontWeight: 600, padding: '1px 4px', borderRadius: 4, marginBottom: 1, background: TYPE_COLOR[a.type] + '22', color: TYPE_COLOR[a.type], whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {a.timeSlot ? a.timeSlot.slice(0, 5) + ' ' : ''}{a.patientName?.split(' ')[0]}
                </div>
              ))}
              {appts.length > 2 && <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>+{appts.length - 2} more</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   VIEW APPOINTMENT MODAL
═══════════════════════════════════════════ */
function ViewModal({ id, onClose, onEdit, onComplete, onCancel }) {
  const [appt, setAppt] = useState(null);

  useEffect(() => {
    API.get(`/appointments/${id}`)
      .then(({ data }) => setAppt(data.appointment))
      .catch(() => toast.error('Failed to load'));
  }, [id]);

  if (!appt) return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 400 }}>
        <div className="flex-center" style={{ height: 120 }}><div className="text-muted">Loading...</div></div>
      </div>
    </div>
  );

  const vs = appt.vitalSigns || {};

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <div>
            <div className="modal-title">{appt.patientName}</div>
            <div className="text-muted text-sm">{fmtDateTime(appt.date)} · {appt.timeSlot}</div>
          </div>
          <div className="flex gap-2">
            <span className={`badge ${STATUS_STYLE[appt.status]?.cls || 'badge-default'}`}>{appt.status}</span>
            <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Basic info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div style={{ background: 'var(--bg-tertiary)', borderRadius: 10, padding: 14 }}>
            <div className="text-muted text-sm" style={{ marginBottom: 4 }}>Patient</div>
            <div style={{ fontWeight: 700 }}>{appt.patientName}</div>
            <div className="text-muted text-sm">{appt.patient?.patientId} · Age {appt.patient?.age} · {appt.patient?.gender}</div>
            {appt.patient?.phone && <div className="text-sm" style={{ marginTop: 2 }}>{appt.patient.phone}</div>}
          </div>
          <div style={{ background: 'var(--bg-tertiary)', borderRadius: 10, padding: 14 }}>
            <div className="text-muted text-sm" style={{ marginBottom: 4 }}>Appointment</div>
            <div style={{ fontWeight: 700 }}>Dr. {appt.doctorName}</div>
            <div className="text-sm">{appt.type} · {fmtDate(appt.date)} {appt.timeSlot && `at ${appt.timeSlot}`}</div>
            {appt.diagnosis && <div className="text-sm" style={{ marginTop: 2 }}>Dx: {appt.diagnosis}</div>}
          </div>
        </div>

        {/* Vital signs */}
        {(vs.bp || vs.pulse || vs.temperature || vs.weight || vs.sugar) && (
          <div style={{ background: 'var(--bg-tertiary)', borderRadius: 10, padding: 14, marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10 }}>VITAL SIGNS</div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {[
                { label: 'BP', val: vs.bp, unit: '' },
                { label: 'Pulse', val: vs.pulse, unit: ' bpm' },
                { label: 'Temperature', val: vs.temperature, unit: ' °F' },
                { label: 'Weight', val: vs.weight, unit: ' kg' },
                { label: 'Blood Sugar', val: vs.sugar, unit: ' mg/dL' },
              ].filter(v => v.val).map(v => (
                <div key={v.label} style={{ textAlign: 'center', padding: '8px 14px', background: 'var(--card-bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent)' }}>{v.val}{v.unit}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{v.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Visit notes */}
        {appt.visitNotes && (
          <div style={{ background: 'var(--bg-tertiary)', borderRadius: 10, padding: 14, marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>VISIT NOTES</div>
            <div style={{ fontSize: 14, lineHeight: 1.6 }}>{appt.visitNotes}</div>
          </div>
        )}

        {/* Medicines given */}
        {appt.medicinesGiven?.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10 }}>MEDICINES GIVEN</div>
            <div className="table-container">
              <table>
                <thead><tr><th>Medicine</th><th>Dosage</th><th>Quantity</th></tr></thead>
                <tbody>
                  {appt.medicinesGiven.map((m, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{m.medicineName}</td>
                      <td>{m.dosage || '—'}</td>
                      <td>{m.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Linked records */}
        <div className="flex gap-3" style={{ flexWrap: 'wrap', marginBottom: 16 }}>
          {appt.linkedPrescription && (
            <span className="badge badge-accent">Rx: {appt.linkedPrescription.rxNumber}</span>
          )}
          {appt.linkedBill && (
            <span className="badge badge-success">Invoice: {appt.linkedBill.billNumber}</span>
          )}
          {appt.followUpDate && (
            <span className="badge badge-info">Follow-up: {fmtDate(appt.followUpDate)}</span>
          )}
        </div>

        <div className="modal-footer">
          {appt.status === 'Scheduled' && (
            <>
              <button className="btn btn-success btn-sm" onClick={() => onComplete(appt)}>
                <MdCheckCircle /> Record Visit
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => onEdit(appt)}>
                <MdEdit /> Edit
              </button>
              <button className="btn btn-danger btn-sm" onClick={() => onCancel(appt._id)}>
                <MdCancel /> Cancel
              </button>
            </>
          )}
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   DAY APPOINTMENTS PANEL (from calendar click)
═══════════════════════════════════════════ */
function DayPanel({ day, month, year, appointments, onClose, onView }) {
  const date = `${MONTHS[month - 1]} ${day}, ${year}`;
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <div className="modal-title">Appointments — {date}</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        {appointments.length === 0 ? (
          <div className="empty-state" style={{ padding: 40 }}><p>No appointments this day</p></div>
        ) : appointments.map(a => (
          <div key={a._id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border-light)', cursor: 'pointer' }}
            onClick={() => { onClose(); onView(a._id); }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: TYPE_COLOR[a.type] + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', color: TYPE_COLOR[a.type], fontWeight: 800, fontSize: 12, flexShrink: 0 }}>
              {a.timeSlot?.slice(0, 5) || '—'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700 }}>{a.patientName}</div>
              <div className="text-muted text-sm">{a.type} · Dr. {a.doctorName}</div>
            </div>
            <span className={`badge ${STATUS_STYLE[a.status]?.cls || 'badge-default'}`}>{a.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════ */
export default function Appointments() {
  const [view, setView] = useState('list');  // 'list' | 'calendar'
  const [appointments, setAppointments] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // Calendar
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth() + 1);
  const [calData, setCalData] = useState({});
  const [dayPanel, setDayPanel] = useState(null);

  // Modals
  const [bookModal, setBookModal] = useState(false);
  const [editAppt, setEditAppt] = useState(null);
  const [completeAppt, setCompleteAppt] = useState(null);
  const [viewId, setViewId] = useState(null);

  /* ── fetch list ── */
  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (status) params.status = status;
      if (dateFilter) { params.startDate = dateFilter; params.endDate = dateFilter; }
      const { data } = await API.get('/appointments', { params });
      setAppointments(data.appointments);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch { toast.error('Failed to load appointments'); }
    finally { setLoading(false); }
  }, [page, status, dateFilter]);

  /* ── fetch calendar ── */
  const fetchCalendar = useCallback(async () => {
    try {
      const { data } = await API.get('/appointments/calendar', { params: { year: calYear, month: calMonth } });
      setCalData(data.grouped || {});
    } catch { }
  }, [calYear, calMonth]);

  useEffect(() => { fetchList(); }, [fetchList]);
  useEffect(() => { fetchCalendar(); }, [fetchCalendar]);
  useEffect(() => {
    API.get('/appointments/stats').then(({ data }) => setStats(data.stats)).catch(() => { });
  }, []);
  useEffect(() => { setPage(1); }, [status, dateFilter, search]);

  const handleCancel = async (id) => {
    if (!confirm('Cancel this appointment?')) return;
    try {
      await API.patch(`/appointments/${id}/cancel`);
      toast.success('Cancelled');
      fetchList(); fetchCalendar();
      if (viewId === id) setViewId(null);
    } catch { toast.error('Failed'); }
  };

  const afterSave = () => {
    setBookModal(false); setEditAppt(null);
    setCompleteAppt(null); setViewId(null);
    fetchList(); fetchCalendar();
    API.get('/appointments/stats').then(({ data }) => setStats(data.stats)).catch(() => { });
  };

  useSocketEvent('appointment:created', (appt) => {
    toast.success(`New appointment: ${appt.patientName} — ${new Date(appt.date).toLocaleDateString()}`, {
      icon: '📅', duration: 3000,
    });
    fetchList();
    fetchCalendar();
  }, []);

  useSocketEvent('appointment:updated', () => {
    fetchList();
    fetchCalendar();
  }, []);

  const prevMonth = () => { if (calMonth === 1) { setCalMonth(12); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); };
  const nextMonth = () => { if (calMonth === 12) { setCalMonth(1); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); };

  const statusTabs = [
    { id: '', label: 'All' },
    { id: 'Scheduled', label: 'Scheduled' },
    { id: 'Completed', label: 'Completed' },
    { id: 'Cancelled', label: 'Cancelled' },
    { id: 'No-Show', label: 'No-Show' },
  ];

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Appointments</h1>
          <p>Schedule and track patient visits</p>
        </div>
        <div className="flex gap-2">
          <button className={`pill${view === 'list' ? ' active' : ''}`} onClick={() => setView('list')}>
            <MdList /> List
          </button>
          <button className={`pill${view === 'calendar' ? ' active' : ''}`} onClick={() => setView('calendar')}>
            <MdCalendarToday /> Calendar
          </button>
          <button className="btn btn-primary" onClick={() => setBookModal(true)}>
            <MdAdd /> Schedule
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom: 20 }}>
        {[
          { label: "Today's Appointments", value: stats.todayTotal || 0, cls: 'blue' },
          { label: 'Completed Today', value: stats.todayCompleted || 0, cls: 'green' },
          { label: 'This Week', value: stats.weekTotal || 0, cls: 'purple' },
          { label: 'Unique Patients', value: stats.totalPatients || 0, cls: 'yellow' },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <div className={`stat-icon ${s.cls}`}><MdCalendarToday /></div>
            <div>
              <div className="stat-value" style={{ fontSize: 24 }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Calendar view */}
      {view === 'calendar' && (
        <div className="card">
          <MiniCalendar
            year={calYear} month={calMonth} grouped={calData}
            onDayClick={(day, appts) => setDayPanel({ day, appts })}
            onPrev={prevMonth} onNext={nextMonth}
          />
        </div>
      )}

      {/* List view */}
      {view === 'list' && (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="toolbar" style={{ marginBottom: 10 }}>
              <div className="search-box">
                <MdSearch className="search-icon" />
                <input placeholder="Search patient, doctor..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <input className="form-control" type="date" value={dateFilter}
                onChange={e => setDateFilter(e.target.value)} style={{ width: 180 }} />
              {dateFilter && <button className="btn btn-secondary btn-sm" onClick={() => setDateFilter('')}>Clear Date</button>}
            </div>
            <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
              {statusTabs.map(t => (
                <button key={t.id} className={`pill${status === t.id ? ' active' : ''}`} onClick={() => setStatus(t.id)}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            {loading ? (
              <div className="flex-center" style={{ height: 200 }}>
                <div className="text-muted">Loading...</div>
              </div>
            ) : appointments.length === 0 ? (
              <div className="empty-state">
                <MdCalendarToday size={52} style={{ opacity: 0.3, marginBottom: 16 }} />
                <h3>No appointments found</h3>
                <p>Schedule your first patient appointment</p>
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Patient</th><th>Doctor</th><th>Date & Time</th>
                      <th>Type</th><th>Diagnosis</th><th>Status</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map(a => (
                      <tr key={a._id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{a.patientName}</div>
                          <div className="text-muted text-sm">{a.patient?.patientId}</div>
                        </td>
                        <td className="text-sm">Dr. {a.doctorName}</td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{fmtDate(a.date)}</div>
                          {a.timeSlot && <div className="text-muted text-sm">{a.timeSlot}</div>}
                        </td>
                        <td>
                          <span style={{ background: TYPE_COLOR[a.type] + '22', color: TYPE_COLOR[a.type], padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600 }}>
                            {a.type}
                          </span>
                        </td>
                        <td className="text-sm text-muted">{a.diagnosis || '—'}</td>
                        <td>
                          <span className={`badge ${STATUS_STYLE[a.status]?.cls || 'badge-default'}`}>
                            {a.status}
                          </span>
                        </td>
                        <td>
                          <div className="table-actions">
                            <button className="btn btn-secondary btn-sm btn-icon"
                              onClick={() => setViewId(a._id)} title="View">
                              <MdVisibility />
                            </button>
                            {a.status === 'Scheduled' && (
                              <>
                                <button className="btn btn-sm btn-icon"
                                  style={{ background: 'var(--success-bg)', color: 'var(--success)' }}
                                  onClick={() => setCompleteAppt(a)} title="Record Visit">
                                  <MdCheckCircle />
                                </button>
                                <button className="btn btn-secondary btn-sm btn-icon"
                                  onClick={() => setEditAppt(a)} title="Edit">
                                  <MdEdit />
                                </button>
                                <button className="btn btn-danger btn-sm btn-icon"
                                  onClick={() => handleCancel(a._id)} title="Cancel">
                                  <MdCancel />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {totalPages > 1 && (
              <div className="pagination">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button key={p} className={page === p ? 'active' : ''} onClick={() => setPage(p)}>{p}</button>
                ))}
                <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Modals */}
      {bookModal && <BookModal onClose={() => setBookModal(false)} onSaved={afterSave} />}
      {editAppt && <BookModal editing={editAppt} onClose={() => setEditAppt(null)} onSaved={afterSave} />}
      {completeAppt && <CompleteVisitModal appointment={completeAppt} onClose={() => setCompleteAppt(null)} onSaved={afterSave} />}
      {viewId && (
        <ViewModal
          id={viewId}
          onClose={() => setViewId(null)}
          onEdit={(a) => { setViewId(null); setEditAppt(a); }}
          onComplete={(a) => { setViewId(null); setCompleteAppt(a); }}
          onCancel={(id) => { setViewId(null); handleCancel(id); }}
        />
      )}
      {dayPanel && (
        <DayPanel
          day={dayPanel.day} month={calMonth} year={calYear}
          appointments={dayPanel.appts}
          onClose={() => setDayPanel(null)}
          onView={(id) => { setDayPanel(null); setViewId(id); }}
        />
      )}
    </div>
  );
}