import { useState, useEffect, useCallback, useRef } from 'react';
import {
  MdPerson, MdMedicalServices, MdWarning, MdCheck,
  MdRefresh, MdAdd, MdClose, MdSearch, MdTimer,
  MdFavorite, MdLocalPharmacy, MdNotifications,
} from 'react-icons/md';
import toast from 'react-hot-toast';
import API from '../utils/api';
import { useSocket } from '../context/SocketContext';

/* ── helpers ── */
const todayStr  = () => new Date().toISOString().slice(0, 10);
const fmtTime   = d  => d ? new Date(d).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' }) : '—';
const fmtDate   = d  => d ? new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short' }) : '—';
const daysSince = d  => d ? Math.floor((new Date() - new Date(d)) / 86400000) : 0;

const DOSE_CFG = {
  Pending: { bg: '#f1f5f9', color: '#64748b', border: '#cbd5e1' },
  Given:   { bg: '#d1fae5', color: '#10b981', border: '#6ee7b7' },
  Skipped: { bg: '#fef3c7', color: '#f59e0b', border: '#fcd34d' },
  Refused: { bg: '#fee2e2', color: '#ef4444', border: '#fca5a5' },
  Hold:    { bg: '#f3e8ff', color: '#8b5cf6', border: '#c4b5fd' },
};

const URGENCY_CFG = {
  Routine: { color: '#64748b', bg: '#f1f5f9' },
  Urgent:  { color: '#f59e0b', bg: '#fef3c7' },
  STAT:    { color: '#ef4444', bg: '#fee2e2' },
};

/* ── Check if a dose is overdue ── */
const isDoseOverdue = (dose) => {
  if (dose.status !== 'Pending') return false;
  const [h, m] = (dose.scheduledTime || '00:00').split(':').map(Number);
  const scheduled = new Date();
  scheduled.setHours(h, m, 0, 0);
  return scheduled < new Date();
};

const overdueMin = (dose) => {
  const [h, m] = (dose.scheduledTime || '00:00').split(':').map(Number);
  const scheduled = new Date();
  scheduled.setHours(h, m, 0, 0);
  return Math.round((new Date() - scheduled) / 60000);
};

/* ════════════════════════════════
   VITALS FORM
════════════════════════════════ */
function VitalsForm({ admissionId, patientName, onSaved }) {
  const [form, setForm] = useState({ bp: '', pulse: '', temperature: '', spo2: '', rbs: '', weight: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const fld = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSave = async () => {
    const hasValue = Object.entries(form).some(([k, v]) => k !== 'notes' && v.trim() !== '');
    if (!hasValue) { toast.error('Enter at least one vital sign'); return; }
    setSaving(true);
    try {
      await API.post(`/nurse/${admissionId}/vitals`, form);
      toast.success(`Vitals recorded for ${patientName}`);
      setForm({ bp: '', pulse: '', temperature: '', spo2: '', rbs: '', weight: '', notes: '' });
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  const FIELDS = [
    { key: 'bp',          label: 'Blood Pressure', placeholder: '120/80',   unit: 'mmHg' },
    { key: 'pulse',       label: 'Pulse',          placeholder: '72',        unit: 'bpm'  },
    { key: 'temperature', label: 'Temperature',    placeholder: '37.0',      unit: '°C'   },
    { key: 'spo2',        label: 'SpO2',           placeholder: '98',        unit: '%'    },
    { key: 'rbs',         label: 'Blood Sugar',    placeholder: '110',       unit: 'mg/dL'},
    { key: 'weight',      label: 'Weight',         placeholder: '65',        unit: 'kg'   },
  ];

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
        {FIELDS.map(f => (
          <div key={f.key} className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: 11 }}>{f.label}</label>
            <div style={{ position: 'relative' }}>
              <input className="form-control" style={{ paddingRight: 42 }}
                value={form[f.key]} onChange={fld(f.key)} placeholder={f.placeholder} />
              <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--text-muted)', pointerEvents: 'none' }}>
                {f.unit}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="form-group" style={{ marginBottom: 12 }}>
        <label className="form-label" style={{ fontSize: 11 }}>Notes</label>
        <input className="form-control" value={form.notes} onChange={fld('notes')} placeholder="Any observations..." />
      </div>
      <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
        {saving ? 'Saving...' : <><MdFavorite /> Record Vitals</>}
      </button>
    </div>
  );
}

/* ════════════════════════════════
   MEDICINE REQUEST MODAL
════════════════════════════════ */
function MedRequestModal({ admissionId, patientName, onClose, onRequested }) {
  const [medicines, setMedicines]   = useState([]);
  const [mSearch,   setMSearch]     = useState('');
  const [selected,  setSelected]    = useState(null);
  const [form, setForm] = useState({
    medicineName: '', genericName: '', quantity: '1',
    dosage: '', route: 'Oral', urgency: 'Routine', notes: '',
  });
  const [saving, setSaving] = useState(false);
  const fld = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  useEffect(() => {
    if (mSearch.length < 2) { setMedicines([]); return; }
    API.get('/medicines', { params: { search: mSearch, limit: 6 } })
      .then(({ data }) => setMedicines(data.medicines || []))
      .catch(() => {});
  }, [mSearch]);

  const handleRequest = async () => {
    if (!form.medicineName.trim() || !form.quantity) {
      toast.error('Medicine name and quantity required'); return;
    }
    setSaving(true);
    try {
      await API.post(`/nurse/${admissionId}/request`, {
        ...form, medicineId: selected?._id || null,
        quantity: Number(form.quantity),
      });
      toast.success(`Request sent to pharmacy — ${form.medicineName}`);
      onRequested();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 460 }}>
        <div className="modal-header">
          <div>
            <div className="modal-title">Request Medicine from Pharmacy</div>
            <div className="text-muted text-sm">Patient: {patientName}</div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><MdClose /></button>
        </div>

        {/* Medicine search */}
        <div className="form-group">
          <label className="form-label required">Medicine</label>
          {selected ? (
            <div style={{ background: 'var(--bg-tertiary)', borderRadius: 10, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700 }}>{selected.name}</div>
                <div className="text-muted text-sm">Stock: {selected.stock} · ₨{selected.salePrice}</div>
              </div>
              <button className="btn btn-secondary btn-sm"
                onClick={() => { setSelected(null); setMSearch(''); setForm(p => ({ ...p, medicineName: '', genericName: '' })); }}>
                Change
              </button>
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <div className="input-group">
                <MdSearch className="input-icon" />
                <input className="form-control" placeholder="Search inventory or type name..."
                  value={mSearch} onChange={e => setMSearch(e.target.value)} autoFocus />
              </div>
              <input className="form-control" style={{ marginTop: 6 }}
                placeholder="Or type medicine name manually"
                value={form.medicineName} onChange={fld('medicineName')} />
              {medicines.length > 0 && (
                <div style={{ position: 'absolute', top: '42px', left: 0, right: 0, background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 10, zIndex: 100, boxShadow: 'var(--shadow-lg)', marginTop: 2 }}>
                  {medicines.map(m => (
                    <div key={m._id} style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border-light)' }}
                      onMouseDown={() => { setSelected(m); setMSearch(''); setMedicines([]); setForm(p => ({ ...p, medicineName: m.name, genericName: m.genericName || '' })); }}>
                      <div style={{ fontWeight: 600 }}>{m.name}</div>
                      <div className="text-muted text-sm">{m.genericName} · Stock: {m.stock}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label required">Quantity</label>
            <input className="form-control" type="number" min="1" value={form.quantity} onChange={fld('quantity')} />
          </div>
          <div className="form-group">
            <label className="form-label">Dosage</label>
            <input className="form-control" value={form.dosage} onChange={fld('dosage')} placeholder="500mg" />
          </div>
          <div className="form-group">
            <label className="form-label">Route</label>
            <select className="form-control" value={form.route} onChange={fld('route')}>
              {['Oral', 'IV', 'IM', 'SC', 'Topical'].map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
        </div>

        {/* Urgency */}
        <div className="form-group">
          <label className="form-label">Urgency</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {['Routine', 'Urgent', 'STAT'].map(u => {
              const cfg = URGENCY_CFG[u];
              return (
                <button key={u}
                  onClick={() => setForm(p => ({ ...p, urgency: u }))}
                  style={{
                    flex: 1, padding: '10px 0', borderRadius: 10, cursor: 'pointer',
                    background: form.urgency === u ? cfg.color : cfg.bg,
                    color:      form.urgency === u ? '#fff'    : cfg.color,
                    border: `2px solid ${cfg.color}`,
                    fontWeight: 700, fontSize: 13,
                  }}>
                  {u === 'STAT' ? '🚨 STAT' : u === 'Urgent' ? '⚡ Urgent' : '📋 Routine'}
                </button>
              );
            })}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Notes</label>
          <input className="form-control" value={form.notes} onChange={fld('notes')} placeholder="Administration instructions..." />
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleRequest}
            disabled={saving || !form.medicineName.trim()}>
            {saving ? 'Sending...' : <><MdLocalPharmacy /> Send to Pharmacy</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════
   PATIENT DETAIL PANEL
════════════════════════════════ */
function PatientPanel({ admissionId, onClose }) {
  const [detail,    setDetail]    = useState(null);
  const [vitals,    setVitals]    = useState([]);
  const [activeTab, setTab]       = useState('mar');
  const [marDate,   setMARDate]   = useState(todayStr());
  const [loading,   setLoading]   = useState(true);
  const [reqModal,  setReqModal]  = useState(false);

  const { on } = useSocket() || {};

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const [detailRes, vitalsRes] = await Promise.all([
        API.get(`/nurse/${admissionId}`),
        API.get(`/nurse/${admissionId}/vitals`),
      ]);
      setDetail(detailRes.data);
      setVitals(vitalsRes.data.vitals || []);
    } catch { toast.error('Failed to load patient detail'); }
    finally { setLoading(false); }
  }, [admissionId]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  // Listen for dispensed notification
  useEffect(() => {
    if (!on) return;
    const unsub = on('nurse:medicineDispensed', (data) => {
      toast.success(`💊 ${data.medicineName} dispensed by pharmacy!`, { duration: 5000 });
      fetchDetail();
    });
    return unsub;
  }, [on, fetchDetail]);

  const handleDoseAction = async (sheetId, doseId, status) => {
    let notes = '';
    if (status === 'Skipped' || status === 'Refused') {
      notes = prompt(`Reason for ${status}?`) || '';
      if (notes === null) return;
    }
    try {
      await API.patch(`/ipd/mar/${sheetId}/doses/${doseId}`, { status, notes });
      toast.success(`Dose marked as ${status}`);
      fetchDetail();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  if (loading) {
    return (
      <div style={{ padding: 24 }} className="flex-center">
        <div className="text-muted">Loading patient...</div>
      </div>
    );
  }

  if (!detail) return null;

  const { admission, mar, requests = [] } = detail;
  const patient = admission?.patient;
  const doses   = mar?.doses || [];
  const now     = new Date();

  // Group doses by time slot
  const timeGroups = {};
  doses.forEach(d => {
    const t = d.scheduledTime || 'PRN';
    if (!timeGroups[t]) timeGroups[t] = [];
    timeGroups[t].push(d);
  });

  const TABS = [
    { id: 'mar',      label: `MAR (${doses.filter(d => d.status === 'Pending').length} pending)` },
    { id: 'vitals',   label: 'Vitals' },
    { id: 'requests', label: `Requests (${requests.length})` },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Patient header */}
      <div style={{ padding: '16px 20px', background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>{admission.patientName}</div>
            <div className="text-muted text-sm">
              {admission.wardName} · Bed {admission.bedNumber} · Day {daysSince(admission.admittedAt)}
            </div>
            {patient?.allergies?.length > 0 && (
              <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                {patient.allergies.map(a => (
                  <span key={a} style={{ background: '#fee2e2', color: '#ef4444', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99 }}>
                    ⚠️ {a}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setReqModal(true)}>
              <MdLocalPharmacy size={14} /> Request Med
            </button>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><MdClose /></button>
          </div>
        </div>

        {/* Quick vitals */}
        {vitals.length > 0 && (
          <div style={{ display: 'flex', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
            {[
              { label: 'BP',   value: vitals[0].bp },
              { label: 'Pulse', value: vitals[0].pulse ? `${vitals[0].pulse} bpm` : null },
              { label: 'Temp', value: vitals[0].temperature ? `${vitals[0].temperature}°C` : null },
              { label: 'SpO2', value: vitals[0].spo2 ? `${vitals[0].spo2}%` : null, warn: vitals[0].spo2 < 90 },
            ].filter(v => v.value).map(v => (
              <div key={v.label} style={{ fontSize: 12 }}>
                <span className="text-muted">{v.label}: </span>
                <span style={{ fontWeight: 700, color: v.warn ? '#ef4444' : 'var(--text-primary)' }}>{v.value}</span>
              </div>
            ))}
            <span className="text-muted" style={{ fontSize: 11 }}>Last: {fmtTime(vitals[0].recordedAt)}</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              flex: 1, padding: '10px 8px', background: 'none', border: 'none',
              borderBottom: activeTab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
              color: activeTab === t.id ? 'var(--accent)' : 'var(--text-muted)',
              fontWeight: activeTab === t.id ? 700 : 500,
              cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-main)',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>

        {/* ── MAR TAB ── */}
        {activeTab === 'mar' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, alignItems: 'center' }}>
              <input type="date" className="form-control" style={{ width: 160, fontSize: 12 }}
                value={marDate} max={todayStr()}
                onChange={e => setMARDate(e.target.value)} />
              <button className="btn btn-secondary btn-sm" onClick={fetchDetail}><MdRefresh size={14} /></button>
            </div>

            {doses.length === 0 ? (
              <div className="text-muted text-sm" style={{ textAlign: 'center', padding: '30px 0' }}>
                No doses scheduled. Add medicine orders in IPD Management.
              </div>
            ) : (
              Object.entries(timeGroups)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([time, timeDoses]) => {
                  const [h, m] = time !== 'PRN' ? time.split(':').map(Number) : [null, null];
                  const scheduled = h !== null ? new Date() : null;
                  if (scheduled) scheduled.setHours(h, m, 0, 0);
                  const isPast     = scheduled && scheduled < now;
                  const hasOverdue = timeDoses.some(d => d.status === 'Pending') && isPast;

                  return (
                    <div key={time} style={{ marginBottom: 16 }}>
                      {/* Time header */}
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
                      }}>
                        <div style={{
                          background: hasOverdue ? '#fee2e2' : 'var(--bg-tertiary)',
                          color:      hasOverdue ? '#ef4444' : 'var(--text-muted)',
                          padding: '3px 10px', borderRadius: 8,
                          fontSize: 12, fontWeight: 700,
                          display: 'flex', alignItems: 'center', gap: 4,
                        }}>
                          {hasOverdue && <MdTimer size={13} />} ⏰ {time}
                          {hasOverdue && ' — OVERDUE'}
                        </div>
                      </div>

                      {timeDoses.map(dose => {
                        const cfg      = DOSE_CFG[dose.status] || DOSE_CFG.Pending;
                        const overdue  = isDoseOverdue(dose);
                        const isPending= dose.status === 'Pending';

                        return (
                          <div key={dose._id} style={{
                            border:     `1px solid ${overdue ? '#fca5a5' : cfg.border}`,
                            borderLeft: `4px solid ${overdue ? '#ef4444' : cfg.color}`,
                            borderRadius: 10, padding: '10px 14px', marginBottom: 6,
                            background: overdue ? '#fff5f5' : cfg.bg,
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700, fontSize: 13 }}>{dose.medicineName}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                  {dose.dosage}{dose.route ? ` · ${dose.route}` : ''}
                                  {dose.administeredByName && ` · By: ${dose.administeredByName}`}
                                  {dose.administeredAt && ` at ${fmtTime(dose.administeredAt)}`}
                                </div>
                                {dose.notes && (
                                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, fontStyle: 'italic' }}>
                                    📝 {dose.notes}
                                  </div>
                                )}
                              </div>

                              {/* Status badge */}
                              <span style={{
                                background: cfg.bg, color: cfg.color,
                                border: `1px solid ${cfg.border}`,
                                padding: '3px 10px', borderRadius: 8,
                                fontSize: 11, fontWeight: 700, flexShrink: 0,
                              }}>
                                {dose.status}
                              </span>

                              {/* Action buttons — only for pending doses today */}
                              {isPending && marDate === todayStr() && (
                                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                                  <button
                                    className="btn btn-success btn-sm"
                                    style={{ fontSize: 11, padding: '4px 10px' }}
                                    onClick={() => handleDoseAction(mar._id, dose._id, 'Given')}>
                                    <MdCheck size={12} /> Given
                                  </button>
                                  <button
                                    className="btn btn-secondary btn-sm"
                                    style={{ fontSize: 11, padding: '4px 10px' }}
                                    onClick={() => handleDoseAction(mar._id, dose._id, 'Skipped')}>
                                    Skip
                                  </button>
                                  <button
                                    className="btn btn-danger btn-sm"
                                    style={{ fontSize: 11, padding: '4px 8px' }}
                                    onClick={() => handleDoseAction(mar._id, dose._id, 'Refused')}>
                                    ✕
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })
            )}
          </div>
        )}

        {/* ── VITALS TAB ── */}
        {activeTab === 'vitals' && (
          <div>
            <VitalsForm
              admissionId={admissionId}
              patientName={admission.patientName}
              onSaved={() => {
                fetchDetail();
                API.get(`/nurse/${admissionId}/vitals`)
                  .then(({ data }) => setVitals(data.vitals || []))
                  .catch(() => {});
              }}
            />

            {/* Vitals history */}
            <div style={{ marginTop: 20 }}>
              <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 13 }}>Recent Vitals</div>
              {vitals.length === 0 ? (
                <div className="text-muted text-sm">No vitals recorded yet</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="table" style={{ fontSize: 12 }}>
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>BP</th>
                        <th>Pulse</th>
                        <th>Temp</th>
                        <th>SpO2</th>
                        <th>RBS</th>
                        <th>Weight</th>
                        <th>By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vitals.slice(0, 10).map((v, i) => (
                        <tr key={i}>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            <div>{fmtDate(v.recordedAt)}</div>
                            <div className="text-muted" style={{ fontSize: 10 }}>{fmtTime(v.recordedAt)}</div>
                          </td>
                          <td>{v.bp || '—'}</td>
                          <td style={{ color: v.pulse > 120 || v.pulse < 50 ? '#ef4444' : 'inherit', fontWeight: (v.pulse > 120 || v.pulse < 50) ? 700 : 'normal' }}>
                            {v.pulse || '—'}
                          </td>
                          <td style={{ color: v.temperature > 39.5 ? '#ef4444' : 'inherit', fontWeight: v.temperature > 39.5 ? 700 : 'normal' }}>
                            {v.temperature ? `${v.temperature}°` : '—'}
                          </td>
                          <td style={{ color: v.spo2 < 90 ? '#ef4444' : 'inherit', fontWeight: v.spo2 < 90 ? 700 : 'normal' }}>
                            {v.spo2 ? `${v.spo2}%` : '—'}
                          </td>
                          <td>{v.rbs || '—'}</td>
                          <td>{v.weight ? `${v.weight}kg` : '—'}</td>
                          <td className="text-muted">{v.recordedByName || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── REQUESTS TAB ── */}
        {activeTab === 'requests' && (
          <div>
            <button className="btn btn-primary btn-sm" style={{ marginBottom: 12 }}
              onClick={() => setReqModal(true)}>
              <MdAdd /> New Request
            </button>

            {requests.length === 0 ? (
              <div className="text-muted text-sm" style={{ textAlign: 'center', padding: '20px 0' }}>
                No pending medicine requests
              </div>
            ) : (
              requests.map(r => {
                const ucfg = URGENCY_CFG[r.urgency] || URGENCY_CFG.Routine;
                return (
                  <div key={r._id} style={{
                    border: '1px solid var(--border)', borderRadius: 10,
                    padding: '12px 14px', marginBottom: 8,
                    background: 'var(--card-bg)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{r.medicineName}</div>
                        <div className="text-muted" style={{ fontSize: 12 }}>
                          Qty: {r.quantity}{r.dosage ? ` · ${r.dosage}` : ''}{r.route ? ` · ${r.route}` : ''}
                        </div>
                        <div className="text-muted" style={{ fontSize: 11, marginTop: 2 }}>
                          Requested at {fmtTime(r.createdAt)} by {r.requestedByName}
                        </div>
                        {r.notes && <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>📝 {r.notes}</div>}
                      </div>
                      <span style={{
                        background: ucfg.bg, color: ucfg.color,
                        padding: '3px 10px', borderRadius: 99,
                        fontSize: 11, fontWeight: 700, flexShrink: 0,
                      }}>
                        {r.urgency}
                      </span>
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <span style={{
                        background: '#fef3c7', color: '#f59e0b',
                        padding: '2px 10px', borderRadius: 99,
                        fontSize: 11, fontWeight: 700,
                      }}>
                        ⏳ Pending
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Medicine request modal */}
      {reqModal && (
        <MedRequestModal
          admissionId={admissionId}
          patientName={admission.patientName}
          onClose={() => setReqModal(false)}
          onRequested={() => { setReqModal(false); fetchDetail(); }}
        />
      )}
    </div>
  );
}

/* ════════════════════════════════
   MAIN PAGE
════════════════════════════════ */
export default function NurseStation() {
  const [patients,       setPatients]       = useState([]);
  const [alerts,         setAlerts]         = useState({ overdueDoses: [], pendingRequests: 0, totalOverdue: 0 });
  const [loading,        setLoading]        = useState(true);
  const [selectedId,     setSelectedId]     = useState(null);
  const [search,         setSearch]         = useState('');
  const [showAlerts,     setShowAlerts]     = useState(false);
  const [pendingReqCount,setPendingReqCount]= useState(0);

  const { on } = useSocket() || {};
  const timerRef = useRef(null);

  const fetchPatients = useCallback(async () => {
    try {
      const { data } = await API.get('/nurse/patients');
      setPatients(data.patients || []);
    } catch { toast.error('Failed to load patients'); }
    finally { setLoading(false); }
  }, []);

  const fetchAlerts = useCallback(async () => {
    try {
      const { data } = await API.get('/nurse/alerts');
      setAlerts(data.alerts || { overdueDoses: [], pendingRequests: 0, totalOverdue: 0 });
      setPendingReqCount(data.alerts?.pendingRequests || 0);
    } catch {}
  }, []);

  useEffect(() => {
    fetchPatients();
    fetchAlerts();
    // Refresh alerts every 2 minutes
    timerRef.current = setInterval(fetchAlerts, 120000);
    return () => clearInterval(timerRef.current);
  }, [fetchPatients, fetchAlerts]);

  // Real-time socket events
  useEffect(() => {
    if (!on) return;
    const unsubs = [
      on('nurse:medicineRequest', () => {
        setPendingReqCount(c => c + 1);
        fetchAlerts();
      }),
      on('nurse:medicineDispensed', (data) => {
        toast.success(`💊 ${data.medicineName} dispensed for ${data.patientName}!`, { duration: 5000 });
        fetchAlerts();
      }),
      on('nurse:criticalVitals', (data) => {
        toast.error(`🚨 Critical vitals — ${data.patientName} (Bed ${data.bedNumber}): ${data.alerts.join(', ')}`, { duration: 8000 });
      }),
    ];
    return () => unsubs.forEach(u => u && u());
  }, [on, fetchAlerts]);

  const filteredPatients = patients.filter(p =>
    !search || p.patientName.toLowerCase().includes(search.toLowerCase()) ||
    p.bedNumber?.includes(search) || p.wardName?.toLowerCase().includes(search.toLowerCase())
  );

  const totalOverdue = alerts.totalOverdue || 0;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 0, height: 'calc(100vh - 64px)', overflow: 'hidden' }}>

      {/* ── LEFT: Patient List ── */}
      <div style={{ borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontWeight: 800, fontSize: 16 }}>Nurse Station</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { fetchPatients(); fetchAlerts(); }}>
                <MdRefresh size={16} />
              </button>
              <button
                className="btn btn-sm"
                style={{
                  background: totalOverdue > 0 ? '#fee2e2' : 'var(--bg-tertiary)',
                  color:      totalOverdue > 0 ? '#ef4444' : 'var(--text-muted)',
                  border: `1px solid ${totalOverdue > 0 ? '#fca5a5' : 'var(--border)'}`,
                  display: 'flex', alignItems: 'center', gap: 4, fontSize: 12,
                }}
                onClick={() => setShowAlerts(p => !p)}
              >
                <MdNotifications size={15} />
                {totalOverdue > 0 && <span style={{ fontWeight: 800 }}>{totalOverdue}</span>}
              </button>
            </div>
          </div>

          {/* Alert panel */}
          {showAlerts && totalOverdue > 0 && (
            <div style={{
              background: '#fff5f5', border: '1px solid #fca5a5',
              borderRadius: 10, padding: 10, marginBottom: 10,
              maxHeight: 180, overflowY: 'auto',
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', marginBottom: 6 }}>
                🚨 {totalOverdue} OVERDUE DOSE{totalOverdue > 1 ? 'S' : ''}
              </div>
              {alerts.overdueDoses?.slice(0, 8).map((d, i) => (
                <div key={i} style={{ fontSize: 11, padding: '4px 0', borderBottom: '1px solid #fee2e2', color: '#dc2626' }}>
                  <span style={{ fontWeight: 700 }}>{d.displayToken || d.bedNumber}</span>
                  {' '}{d.patientName} — {d.medicineName} ({d.scheduledTime})
                  <span style={{ color: '#ef4444', fontWeight: 700 }}> {d.overdueMin}m late</span>
                </div>
              ))}
            </div>
          )}

          {/* Summary pills */}
          <div style={{ display: 'flex', gap: 6 }}>
            <span style={{ background: '#d1fae5', color: '#10b981', padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
              {patients.length} patients
            </span>
            {totalOverdue > 0 && (
              <span style={{ background: '#fee2e2', color: '#ef4444', padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
                {totalOverdue} overdue
              </span>
            )}
            {pendingReqCount > 0 && (
              <span style={{ background: '#fef3c7', color: '#f59e0b', padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
                {pendingReqCount} requests
              </span>
            )}
          </div>

          {/* Search */}
          <div className="input-group" style={{ marginTop: 10 }}>
            <MdSearch className="input-icon" style={{ width: 16 }} />
            <input style={{ fontSize: 13 }} placeholder="Search patient, bed, ward..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        {/* Patient list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div className="flex-center" style={{ height: 200 }}>
              <div className="text-muted text-sm">Loading...</div>
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="text-muted text-sm" style={{ textAlign: 'center', padding: 24 }}>
              {search ? 'No patients match your search' : 'No active IPD patients'}
            </div>
          ) : (
            filteredPatients.map(p => {
              const hasOverdue  = p.marSummary?.overdue > 0;
              const isSelected  = selectedId === p._id;

              return (
                <div key={p._id}
                  onClick={() => setSelectedId(isSelected ? null : p._id)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border-light)',
                    cursor: 'pointer',
                    background: isSelected ? 'var(--accent-light)' : hasOverdue ? '#fff5f5' : 'transparent',
                    borderLeft: isSelected ? '3px solid var(--accent)' : hasOverdue ? '3px solid #ef4444' : '3px solid transparent',
                    transition: 'all 0.15s',
                  }}
                >
                  {/* Patient name row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: isSelected ? 'var(--accent)' : hasOverdue ? '#dc2626' : 'var(--text-primary)' }}>
                        {hasOverdue && '⚠️ '}{p.patientName}
                      </div>
                      <div className="text-muted" style={{ fontSize: 11, marginTop: 2 }}>
                        {p.wardName} · Bed {p.bedNumber} · {daysSince(p.admittedAt)}d
                      </div>
                      {p.admissionDiagnosis && (
                        <div className="text-muted" style={{ fontSize: 11, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.admissionDiagnosis}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* MAR summary pills */}
                  {p.marSummary && (
                    <div style={{ display: 'flex', gap: 4, marginTop: 7, flexWrap: 'wrap' }}>
                      {p.marSummary.given > 0 && (
                        <span style={{ background: '#d1fae5', color: '#10b981', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 6 }}>
                          ✓ {p.marSummary.given} given
                        </span>
                      )}
                      {p.marSummary.pending > 0 && (
                        <span style={{ background: p.marSummary.overdue > 0 ? '#fee2e2' : '#e0f2fe', color: p.marSummary.overdue > 0 ? '#ef4444' : '#0ea5e9', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 6 }}>
                          {p.marSummary.overdue > 0 ? `🔴 ${p.marSummary.overdue} overdue` : `${p.marSummary.pending} pending`}
                        </span>
                      )}
                      {p.marSummary.total === 0 && (
                        <span className="text-muted" style={{ fontSize: 10 }}>No doses today</span>
                      )}
                    </div>
                  )}

                  {/* Active orders count */}
                  {p.medicineOrders?.filter(o => o.isActive).length > 0 && (
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                      💊 {p.medicineOrders.filter(o => o.isActive).length} active orders
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── RIGHT: Patient Detail ── */}
      <div style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {selectedId ? (
          <PatientPanel
            admissionId={selectedId}
            onClose={() => setSelectedId(null)}
          />
        ) : (
          <div className="flex-center" style={{ height: '100%', flexDirection: 'column', gap: 12, color: 'var(--text-muted)' }}>
            <MdPerson size={64} style={{ opacity: 0.2 }} />
            <div style={{ fontSize: 16, fontWeight: 600 }}>Select a patient</div>
            <div className="text-muted text-sm">Click any patient on the left to view their MAR, vitals and medication requests</div>
          </div>
        )}
      </div>
    </div>
  );
}