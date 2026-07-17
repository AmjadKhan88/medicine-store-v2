import { useState, useEffect, useCallback, useRef } from 'react';
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts';
import {
  MdAdd, MdClose, MdSearch, MdRefresh,
  MdWarning, MdPrint, MdPerson, MdArrowBack,
  MdFavorite, MdDelete,
} from 'react-icons/md';
import toast from 'react-hot-toast';
import API from '../utils/api';
import { useSocket } from '../context/SocketContext';

/* ── helpers ── */
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtTime = d => d ? new Date(d).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' }) : '—';
const fmtDT   = d => d ? `${fmtDate(d)} ${fmtTime(d)}` : '—';
const todayISO= () => new Date().toISOString().slice(0, 16);

/* ── Normal ranges ── */
const RANGES = {
  bpSystolic:      { warn: [90, 140],  crit: [70, 180],  unit: 'mmHg',   label: 'Systolic BP'   },
  bpDiastolic:     { warn: [60, 90],   crit: [40, 120],  unit: 'mmHg',   label: 'Diastolic BP'  },
  pulse:           { warn: [50, 100],  crit: [40, 130],  unit: 'bpm',    label: 'Pulse'         },
  temperature:     { warn: [36.0,37.5],crit: [35.0,39.5],unit: '°C',     label: 'Temperature'   },
  spo2:            { warn: [95, 100],  crit: [90, 100],  unit: '%',      label: 'SpO2'          },
  rbs:             { warn: [70, 140],  crit: [50, 400],  unit: 'mg/dL',  label: 'Blood Sugar'   },
  weight:          { warn: null,       crit: null,        unit: 'kg',     label: 'Weight'        },
  respiratoryRate: { warn: [12, 20],   crit: [8, 30],    unit: '/min',   label: 'Resp. Rate'    },
};

const getStatus = (param, val) => {
  const r = RANGES[param];
  if (!r || val == null) return 'normal';
  if (r.crit) {
    if (val < r.crit[0] || val > r.crit[1]) return 'critical';
  }
  if (r.warn) {
    if (val < r.warn[0] || val > r.warn[1]) return 'warning';
  }
  return 'normal';
};

const STATUS_COLORS = { normal: '#10b981', warning: '#f59e0b', critical: '#ef4444' };

/* ── Chart colors ── */
const CHART_COLORS = {
  bpSystolic:  '#ef4444',
  bpDiastolic: '#f97316',
  pulse:       '#0ea5e9',
  temperature: '#f59e0b',
  spo2:        '#10b981',
  rbs:         '#8b5cf6',
  weight:      '#6366f1',
  respiratoryRate: '#ec4899',
};

/* ════════════════════════════════
   RECORD VITALS MODAL
════════════════════════════════ */
function RecordModal({ patientId, patientName, admissionId, onClose, onRecorded }) {
  const [form, setForm] = useState({
    bpSystolic: '', bpDiastolic: '', bpPosition: 'Sitting', bpArm: 'Right',
    pulse: '', pulseRhythm: '',
    respiratoryRate: '', spo2: '', oxygenSupport: '',
    temperature: '', tempRoute: 'Oral',
    rbs: '', rbsTiming: 'Random',
    weight: '', height: '',
    painScore: '', gcsScore: '',
    urineOutput: '', fluidIntake: '',
    context: admissionId ? 'IPD' : 'OPD',
    notes: '', recordedAt: todayISO(),
  });
  const [saving,  setSaving]  = useState(false);
  const [preview, setPreview] = useState(null);   // live alert preview
  const fld = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  // Live alert preview as user types
  useEffect(() => {
    const alerts = [];
    const check = (param, val) => {
      if (!val) return;
      const n = Number(val);
      const s = getStatus(param, n);
      if (s !== 'normal') {
        const r = RANGES[param];
        alerts.push({ param, val: n, status: s, label: r.label, unit: r.unit });
      }
    };
    check('bpSystolic',  form.bpSystolic);
    check('bpDiastolic', form.bpDiastolic);
    check('pulse',       form.pulse);
    check('temperature', form.temperature);
    check('spo2',        form.spo2);
    check('rbs',         form.rbs);
    check('respiratoryRate', form.respiratoryRate);
    setPreview(alerts);
  }, [form.bpSystolic, form.bpDiastolic, form.pulse, form.temperature, form.spo2, form.rbs, form.respiratoryRate]);

  const handleRecord = async () => {
    const hasValue = ['bpSystolic','bpDiastolic','pulse','temperature','spo2','rbs','weight','respiratoryRate']
      .some(k => form[k]);
    if (!hasValue) { toast.error('Enter at least one vital sign'); return; }

    setSaving(true);
    try {
      const { data } = await API.post('/vitals', {
        ...form,
        patientId,
        admissionId: admissionId || null,
      });

      if (data.hasCriticalAlert) {
        toast.error(`⚠️ Critical vitals detected! ${data.alerts.filter(a => a.severity === 'Critical').map(a => a.message).join(', ')}`, { duration: 8000 });
      } else {
        toast.success(data.message);
      }
      onRecorded(data.vital, data.alerts);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record');
    } finally { setSaving(false); }
  };

  const FIELDS = [
    { section: 'Blood Pressure', fields: [
      { key: 'bpSystolic',  label: 'Systolic',  unit: 'mmHg', type: 'number', placeholder: '120', param: 'bpSystolic'  },
      { key: 'bpDiastolic', label: 'Diastolic', unit: 'mmHg', type: 'number', placeholder: '80',  param: 'bpDiastolic' },
    ]},
    { section: 'Heart & Resp.', fields: [
      { key: 'pulse',           label: 'Pulse',       unit: 'bpm',  type: 'number', placeholder: '72',  param: 'pulse'          },
      { key: 'respiratoryRate', label: 'Resp. Rate',  unit: '/min', type: 'number', placeholder: '16',  param: 'respiratoryRate'},
      { key: 'spo2',            label: 'SpO2',        unit: '%',    type: 'number', placeholder: '98',  param: 'spo2'           },
    ]},
    { section: 'Temperature', fields: [
      { key: 'temperature', label: 'Temperature', unit: '°C', type: 'number', placeholder: '37.0', param: 'temperature' },
    ]},
    { section: 'Blood Sugar', fields: [
      { key: 'rbs', label: 'Blood Sugar (RBS)', unit: 'mg/dL', type: 'number', placeholder: '110', param: 'rbs' },
    ]},
    { section: 'Weight & Height', fields: [
      { key: 'weight', label: 'Weight', unit: 'kg', type: 'number', placeholder: '65' },
      { key: 'height', label: 'Height', unit: 'cm', type: 'number', placeholder: '170' },
    ]},
    { section: 'Other', fields: [
      { key: 'painScore', label: 'Pain Score',  unit: '/10', type: 'number', placeholder: '0-10' },
      { key: 'gcsScore',  label: 'GCS Score',   unit: '/15', type: 'number', placeholder: '3-15' },
    ]},
  ];

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg" style={{ maxHeight: '88vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <div>
            <div className="modal-title">Record Vital Signs</div>
            <div className="text-muted text-sm">Patient: {patientName}</div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><MdClose /></button>
        </div>

        {/* Timestamp + context */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Date & Time</label>
            <input className="form-control" type="datetime-local" value={form.recordedAt} onChange={fld('recordedAt')} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Context</label>
            <select className="form-control" value={form.context} onChange={fld('context')}>
              {['IPD','OPD','Emergency','ICU','OT','Follow-up','Home'].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Live alert preview */}
        {preview?.length > 0 && (
          <div style={{ background: preview.some(a => a.status === 'critical') ? '#fee2e2' : '#fef3c7', border: `1px solid ${preview.some(a => a.status === 'critical') ? '#fca5a5' : '#fcd34d'}`, borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, color: preview.some(a => a.status === 'critical') ? '#dc2626' : '#92400e' }}>
              {preview.some(a => a.status === 'critical') ? '🚨 Critical values detected' : '⚠️ Abnormal values detected'}
            </div>
            {preview.map((a, i) => (
              <div key={i} style={{ fontSize: 12, color: a.status === 'critical' ? '#dc2626' : '#92400e' }}>
                {a.label}: {a.val} {a.unit} — {a.status}
              </div>
            ))}
          </div>
        )}

        {/* Vital fields */}
        {FIELDS.map(({ section, fields }) => (
          <div key={section} style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{section}</div>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(fields.length, 3)}, 1fr)`, gap: 10 }}>
              {fields.map(f => {
                const status = f.param ? getStatus(f.param, form[f.key] ? Number(form[f.key]) : null) : 'normal';
                const color  = STATUS_COLORS[status];
                return (
                  <div key={f.key} className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: 11 }}>
                      {f.label}
                      {status !== 'normal' && <span style={{ color, marginLeft: 6, fontSize: 10 }}>● {status}</span>}
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input className="form-control"
                        style={{ paddingRight: 44, borderColor: status !== 'normal' ? color : undefined, boxShadow: status === 'critical' ? `0 0 0 2px ${color}40` : undefined }}
                        type={f.type} value={form[f.key]} onChange={fld(f.key)} placeholder={f.placeholder} />
                      <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: 'var(--text-muted)', pointerEvents: 'none' }}>
                        {f.unit}
                      </span>
                    </div>
                    {/* Normal range hint */}
                    {f.param && RANGES[f.param]?.warn && (
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                        Normal: {RANGES[f.param].warn[0]}–{RANGES[f.param].warn[1]} {f.unit}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Extra selects for BP */}
            {section === 'Blood Pressure' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 11 }}>Position</label>
                  <select className="form-control" style={{ fontSize: 12 }} value={form.bpPosition} onChange={fld('bpPosition')}>
                    {['Sitting','Lying','Standing'].map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: 11 }}>Arm</label>
                  <select className="form-control" style={{ fontSize: 12 }} value={form.bpArm} onChange={fld('bpArm')}>
                    {['Right','Left'].map(a => <option key={a}>{a}</option>)}
                  </select>
                </div>
              </div>
            )}

            {/* RBS timing */}
            {section === 'Blood Sugar' && (
              <div className="form-group" style={{ marginBottom: 0, marginTop: 8 }}>
                <label className="form-label" style={{ fontSize: 11 }}>Timing</label>
                <select className="form-control" style={{ fontSize: 12 }} value={form.rbsTiming} onChange={fld('rbsTiming')}>
                  {['Random','Fasting','Post-meal (2h)','Pre-meal','Bedtime'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            )}
          </div>
        ))}

        <div className="form-group">
          <label className="form-label">Notes</label>
          <input className="form-control" value={form.notes} onChange={fld('notes')} placeholder="Any relevant observations..." />
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleRecord} disabled={saving}>
            {saving ? 'Recording...' : <><MdFavorite /> Record Vitals</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════
   VITAL CARD
════════════════════════════════ */
function VitalCard({ label, value, unit, param, trend }) {
  if (value == null) return null;
  const status = param ? getStatus(param, value) : 'normal';
  const color  = STATUS_COLORS[status];

  return (
    <div style={{
      border:       `1px solid ${status !== 'normal' ? color : 'var(--border)'}`,
      borderTop:    `4px solid ${color}`,
      borderRadius: 12,
      padding:      '14px 16px',
      background:   status === 'critical' ? '#fff5f5' : status === 'warning' ? '#fffbeb' : 'var(--card-bg)',
      textAlign:    'center',
    }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{unit}</div>
      {status !== 'normal' && (
        <div style={{ marginTop: 6, fontSize: 11, fontWeight: 700, color, background: color + '15', padding: '2px 8px', borderRadius: 99, display: 'inline-block' }}>
          {status === 'critical' ? '🚨 CRITICAL' : '⚠️ ABNORMAL'}
        </div>
      )}
      {trend != null && (
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
          {trend > 0 ? '↑' : trend < 0 ? '↓' : '→'} {Math.abs(trend)}{unit} from prev.
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════
   CUSTOM CHART TOOLTIP
════════════════════════════════ */
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', boxShadow: 'var(--shadow-lg)', fontSize: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 6, color: 'var(--text-muted)' }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color, marginBottom: 3 }}>
          <span style={{ fontWeight: 600 }}>{p.name}:</span> {p.value} {RANGES[p.dataKey]?.unit || ''}
        </div>
      ))}
    </div>
  );
}

/* ════════════════════════════════
   PATIENT VITALS DETAIL
════════════════════════════════ */
function PatientVitalsDetail({ patient, admissionId, onBack }) {
  const [vitals,    setVitals]    = useState([]);
  const [summary,   setSummary]   = useState({});
  const [admissions,setAdmissions]= useState([]);
  const [loading,   setLoading]   = useState(true);
  const [recordModal,setRecordModal]=useState(false);
  const [activeChart,setActiveChart]=useState('bp');
  const [filterAdm, setFilterAdm] = useState(admissionId || '');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const printRef = useRef(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 200 };
      if (filterAdm)     params.admissionId = filterAdm;
      if (dateRange.from)params.from         = dateRange.from;
      if (dateRange.to)  params.to           = dateRange.to;
      const { data } = await API.get(`/vitals/patient/${patient._id}`, { params });
      setVitals(data.vitals);
      setSummary(data.summary || {});
      setAdmissions(data.admissions || []);
    } catch { toast.error('Failed to load vitals'); }
    finally { setLoading(false); }
  }, [patient._id, filterAdm, dateRange.from, dateRange.to]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this vital entry?')) return;
    try {
      await API.delete(`/vitals/${id}`);
      toast.success('Deleted');
      fetch();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handlePrint = () => window.print();

  /* ── Chart data ── */
  const chartData = vitals.map(v => ({
    time:        new Date(v.recordedAt).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
    bpSystolic:  v.bpSystolic,
    bpDiastolic: v.bpDiastolic,
    pulse:       v.pulse,
    temperature: v.temperature,
    spo2:        v.spo2,
    rbs:         v.rbs,
    weight:      v.weight,
    respiratoryRate: v.respiratoryRate,
  }));

  /* ── Chart configs ── */
  const CHARTS = {
    bp: {
      title: 'Blood Pressure',
      lines: [
        { key: 'bpSystolic',  name: 'Systolic',  color: '#ef4444', refLines: [{ y: 140, color: '#fca5a5' }, { y: 90, color: '#fca5a5' }] },
        { key: 'bpDiastolic', name: 'Diastolic', color: '#f97316', refLines: [{ y: 90,  color: '#fed7aa' }, { y: 60, color: '#fed7aa' }] },
      ],
      unit: 'mmHg', yDomain: [40, 200],
    },
    pulse: {
      title: 'Pulse',
      lines: [{ key: 'pulse', name: 'Pulse', color: '#0ea5e9' }],
      unit: 'bpm', yDomain: [30, 160],
      refLines: [{ y: 100 }, { y: 50 }],
    },
    temperature: {
      title: 'Temperature',
      lines: [{ key: 'temperature', name: 'Temp', color: '#f59e0b' }],
      unit: '°C', yDomain: [34, 42],
      refLines: [{ y: 37.5 }, { y: 36.0 }],
    },
    spo2: {
      title: 'SpO2 / Oxygen Saturation',
      lines: [{ key: 'spo2', name: 'SpO2', color: '#10b981' }],
      unit: '%', yDomain: [80, 100],
      refLines: [{ y: 95 }],
    },
    rbs: {
      title: 'Blood Sugar (RBS)',
      lines: [{ key: 'rbs', name: 'RBS', color: '#8b5cf6' }],
      unit: 'mg/dL', yDomain: [40, 500],
      refLines: [{ y: 140 }, { y: 70 }],
    },
    weight: {
      title: 'Weight',
      lines: [{ key: 'weight', name: 'Weight', color: '#6366f1' }],
      unit: 'kg', yDomain: ['auto', 'auto'],
    },
  };

  const currentChart = CHARTS[activeChart];
  const latest = vitals[vitals.length - 1];

  return (
    <div ref={printRef}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost btn-icon" onClick={onBack}><MdArrowBack /></button>
          <div>
            <h2 style={{ margin: 0 }}>Vital Signs — {patient.name}</h2>
            <div className="text-muted text-sm">
              {patient.patientId} · {patient.age}y · {patient.gender} · {patient.bloodGroup}
              · {vitals.length} readings
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm no-print" onClick={handlePrint}><MdPrint /> Print</button>
          <button className="btn btn-secondary btn-sm no-print" onClick={fetch}><MdRefresh /></button>
          <button className="btn btn-primary no-print" onClick={() => setRecordModal(true)}>
            <MdAdd /> Record Vitals
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card no-print" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ marginBottom: 0, minWidth: 200 }}>
            <label className="form-label" style={{ fontSize: 11 }}>Filter by Admission</label>
            <select className="form-control" value={filterAdm} onChange={e => setFilterAdm(e.target.value)}>
              <option value="">All Admissions</option>
              {admissions.map(a => (
                <option key={a._id} value={a._id}>
                  {a.admissionNumber} — {fmtDate(a.admittedAt)} ({a.status})
                </option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: 11 }}>From</label>
            <input className="form-control" type="date" value={dateRange.from}
              onChange={e => setDateRange(p => ({ ...p, from: e.target.value }))} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: 11 }}>To</label>
            <input className="form-control" type="date" value={dateRange.to}
              onChange={e => setDateRange(p => ({ ...p, to: e.target.value }))} />
          </div>
          {(filterAdm || dateRange.from || dateRange.to) && (
            <button className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-end' }}
              onClick={() => { setFilterAdm(''); setDateRange({ from: '', to: '' }); }}>
              Clear
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex-center" style={{ height: 200 }}><div className="text-muted">Loading...</div></div>
      ) : (
        <>
          {/* ── Latest vitals cards ── */}
          {latest && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                Latest Vitals
                <span className="text-muted" style={{ fontWeight: 400, fontSize: 12 }}>{fmtDT(latest.recordedAt)}</span>
                {latest.hasCriticalAlert && (
                  <span style={{ background: '#fee2e2', color: '#ef4444', padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
                    🚨 Critical
                  </span>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px,1fr))', gap: 10 }}>
                {latest.bpSystolic && latest.bpDiastolic && (
                  <VitalCard label="Blood Pressure" value={`${latest.bpSystolic}/${latest.bpDiastolic}`}
                    unit="mmHg" param="bpSystolic" />
                )}
                {latest.pulse     && <VitalCard label="Pulse"       value={latest.pulse}       unit="bpm"    param="pulse"       />}
                {latest.temperature&&<VitalCard label="Temperature"  value={latest.temperature}  unit="°C"     param="temperature" />}
                {latest.spo2      && <VitalCard label="SpO2"         value={latest.spo2}         unit="%"      param="spo2"        />}
                {latest.rbs       && <VitalCard label="Blood Sugar"  value={latest.rbs}          unit="mg/dL"  param="rbs"         />}
                {latest.weight    && <VitalCard label="Weight"       value={latest.weight}       unit="kg"                        />}
                {latest.respiratoryRate && <VitalCard label="Resp. Rate" value={latest.respiratoryRate} unit="/min" param="respiratoryRate" />}
                {latest.painScore != null && <VitalCard label="Pain Score" value={latest.painScore} unit="/10" />}
              </div>

              {/* Critical alerts */}
              {latest.alerts?.filter(a => a.severity === 'Critical').length > 0 && (
                <div style={{ marginTop: 10, background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 10, padding: '10px 14px' }}>
                  <div style={{ fontWeight: 800, color: '#dc2626', marginBottom: 4 }}>🚨 Critical Alerts</div>
                  {latest.alerts.filter(a => a.severity === 'Critical').map((a, i) => (
                    <div key={i} style={{ fontSize: 13, color: '#dc2626' }}>• {a.message}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Summary stats ── */}
          {vitals.length > 1 && Object.keys(summary).length > 0 && (
            <div className="card" style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 700, marginBottom: 12 }}>Summary ({vitals.length} readings)</div>
              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th>Parameter</th>
                      <th>Latest</th>
                      <th>Average</th>
                      <th>Min</th>
                      <th>Max</th>
                      <th>Normal Range</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { key: 'bpSystolic',  label: 'Systolic BP',  unit: 'mmHg', range: '90–140'   },
                      { key: 'bpDiastolic', label: 'Diastolic BP', unit: 'mmHg', range: '60–90'    },
                      { key: 'pulse',       label: 'Pulse',        unit: 'bpm',  range: '50–100'   },
                      { key: 'temperature', label: 'Temperature',  unit: '°C',   range: '36–37.5'  },
                      { key: 'spo2',        label: 'SpO2',         unit: '%',    range: '95–100'   },
                      { key: 'rbs',         label: 'Blood Sugar',  unit: 'mg/dL',range: '70–140'   },
                      { key: 'weight',      label: 'Weight',       unit: 'kg',   range: '—'        },
                    ].filter(r => summary[r.key]?.avg != null).map(r => {
                      const s   = summary[r.key];
                      const st  = getStatus(r.key, s.last);
                      const col = STATUS_COLORS[st];
                      return (
                        <tr key={r.key}>
                          <td style={{ fontWeight: 600 }}>{r.label}</td>
                          <td style={{ fontWeight: 700, color: col }}>{s.last} {r.unit}</td>
                          <td>{s.avg} {r.unit}</td>
                          <td>{s.min} {r.unit}</td>
                          <td>{s.max} {r.unit}</td>
                          <td className="text-muted">{r.range} {r.unit}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Trend Charts ── */}
          {vitals.length > 1 && (
            <div className="card" style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ fontWeight: 700 }}>Trend Charts</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {Object.entries(CHARTS).map(([key, cfg]) => (
                    <button key={key}
                      className={`pill${activeChart === key ? ' active' : ''}`}
                      onClick={() => setActiveChart(key)}
                      style={{ fontSize: 11, color: activeChart === key ? '#fff' : CHART_COLORS[cfg.lines[0].key] }}>
                      {cfg.title}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>{currentChart.title} ({currentChart.unit})</div>

              {/* Reference lines */}
              <div style={{ marginBottom: 8 }}>
                {currentChart.lines[0]?.refLines?.map((ref, i) => (
                  <span key={i} style={{ fontSize: 11, color: 'var(--text-muted)', marginRight: 12 }}>
                    — Normal boundary: {ref.y} {currentChart.unit}
                  </span>
                ))}
                {currentChart.refLines?.map((ref, i) => (
                  <span key={i} style={{ fontSize: 11, color: 'var(--text-muted)', marginRight: 12 }}>
                    — Reference: {ref.y} {currentChart.unit}
                  </span>
                ))}
              </div>

              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                  <YAxis domain={currentChart.yDomain} tick={{ fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="line" wrapperStyle={{ fontSize: 12 }} />

                  {/* Reference lines */}
                  {(currentChart.refLines || []).map((ref, i) => (
                    <ReferenceLine key={i} y={ref.y} stroke="#94a3b8" strokeDasharray="4 4" />
                  ))}
                  {currentChart.lines.map(l =>
                    (l.refLines || []).map((ref, i) => (
                      <ReferenceLine key={`${l.key}-ref-${i}`} y={ref.y} stroke={ref.color || '#94a3b8'} strokeDasharray="4 4" />
                    ))
                  )}

                  {currentChart.lines.map(l => (
                    <Area key={l.key}
                      type="monotone"
                      dataKey={l.key}
                      name={l.name}
                      stroke={l.color}
                      fill={l.color + '20'}
                      strokeWidth={2}
                      dot={{ r: 3, fill: l.color }}
                      activeDot={{ r: 5 }}
                      connectNulls
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ── History table ── */}
          <div className="card">
            <div style={{ fontWeight: 700, marginBottom: 12 }}>Vitals History ({vitals.length})</div>
            {vitals.length === 0 ? (
              <div className="text-muted text-sm" style={{ textAlign: 'center', padding: '20px 0' }}>
                No vitals recorded yet
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ fontSize: 12, minWidth: 700 }}>
                  <thead>
                    <tr>
                      <th>Date & Time</th>
                      <th>BP (mmHg)</th>
                      <th>Pulse</th>
                      <th>Temp</th>
                      <th>SpO2</th>
                      <th>RBS</th>
                      <th>Wt</th>
                      <th>RR</th>
                      <th>By</th>
                      <th className="no-print"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...vitals].reverse().map(v => {
                      const hasAlert = v.alerts?.length > 0;
                      return (
                        <tr key={v._id} style={{ background: v.hasCriticalAlert ? '#fff5f5' : hasAlert ? '#fffbeb' : 'transparent' }}>
                          <td style={{ whiteSpace: 'nowrap' }}>
                            <div>{fmtDate(v.recordedAt)}</div>
                            <div className="text-muted" style={{ fontSize: 10 }}>{fmtTime(v.recordedAt)}</div>
                            {v.hasCriticalAlert && <div style={{ fontSize: 10, color: '#ef4444', fontWeight: 700 }}>🚨</div>}
                          </td>
                          <td style={{ color: getStatus('bpSystolic', v.bpSystolic) !== 'normal' ? STATUS_COLORS[getStatus('bpSystolic', v.bpSystolic)] : 'inherit', fontWeight: getStatus('bpSystolic', v.bpSystolic) !== 'normal' ? 700 : 'normal' }}>
                            {v.bpSystolic && v.bpDiastolic ? `${v.bpSystolic}/${v.bpDiastolic}` : '—'}
                          </td>
                          <td style={{ color: STATUS_COLORS[getStatus('pulse', v.pulse)] }}>
                            {v.pulse || '—'}
                          </td>
                          <td style={{ color: STATUS_COLORS[getStatus('temperature', v.temperature)] }}>
                            {v.temperature ? `${v.temperature}°` : '—'}
                          </td>
                          <td style={{ color: STATUS_COLORS[getStatus('spo2', v.spo2)] }}>
                            {v.spo2 ? `${v.spo2}%` : '—'}
                          </td>
                          <td style={{ color: STATUS_COLORS[getStatus('rbs', v.rbs)] }}>
                            {v.rbs || '—'}
                          </td>
                          <td>{v.weight ? `${v.weight}kg` : '—'}</td>
                          <td>{v.respiratoryRate || '—'}</td>
                          <td className="text-muted">{v.recordedByName || '—'}</td>
                          <td className="no-print">
                            <button className="btn btn-ghost btn-icon btn-sm"
                              onClick={() => handleDelete(v._id)}>
                              <MdDelete size={13} style={{ color: 'var(--danger)' }} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Cross-admission comparison ── */}
          {admissions.length > 1 && (
            <div className="card no-print" style={{ marginTop: 16 }}>
              <div style={{ fontWeight: 700, marginBottom: 12 }}>Admission History</div>
              {admissions.map(a => (
                <div key={a._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-light)', fontSize: 13 }}>
                  <div>
                    <span style={{ fontWeight: 700 }}>{a.admissionNumber}</span>
                    <span className="text-muted"> · {fmtDate(a.admittedAt)}</span>
                    {a.dischargedAt && <span className="text-muted"> → {fmtDate(a.dischargedAt)}</span>}
                    {a.admissionDiagnosis && <span className="text-muted"> · {a.admissionDiagnosis}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ background: a.status === 'Active' ? '#d1fae5' : '#e0e7ff', color: a.status === 'Active' ? '#10b981' : '#6366f1', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
                      {a.status}
                    </span>
                    <button className="btn btn-secondary btn-sm" style={{ fontSize: 11 }}
                      onClick={() => setFilterAdm(a._id)}>
                      View Vitals
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Record modal */}
      {recordModal && (
        <RecordModal
          patientId={patient._id}
          patientName={patient.name}
          admissionId={admissionId}
          onClose={() => setRecordModal(false)}
          onRecorded={() => { setRecordModal(false); fetch(); }}
        />
      )}

      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
}

/* ════════════════════════════════
   MAIN PAGE
════════════════════════════════ */
export default function VitalSigns() {
  const [patients,    setPatients]    = useState([]);
  const [stats,       setStats]       = useState({});
  const [critAlerts,  setCritAlerts]  = useState([]);
  const [search,      setSearch]      = useState('');
  const [loading,     setLoading]     = useState(false);
  const [selectedPat, setSelectedPat] = useState(null);
  const [recordModal, setRecordModal] = useState(false);
  const [quickPat,    setQuickPat]    = useState(null);

  const { on } = useSocket() || {};

  const fetchStats = useCallback(async () => {
    try {
      const [statsRes, alertsRes] = await Promise.all([
        API.get('/vitals/stats'),
        API.get('/vitals/critical-alerts'),
      ]);
      setStats(statsRes.data.stats || {});
      setCritAlerts(alertsRes.data.alerts || []);
    } catch {}
  }, []);

  const searchPatients = useCallback(async () => {
    if (search.length < 2) { setPatients([]); return; }
    setLoading(true);
    try {
      const { data } = await API.get('/patients', { params: { search, limit: 10 } });
      setPatients(data.patients || []);
    } catch {}
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { searchPatients(); }, [searchPatients]);

  useEffect(() => {
    if (!on) return;
    const unsub = on('vitals:critical', (data) => {
      toast.error(
        `🚨 Critical vitals — ${data.patientName}: ${data.alerts.join(', ')}`,
        { duration: 10000 }
      );
      fetchStats();
    });
    return () => unsub && unsub();
  }, [on, fetchStats]);

  if (selectedPat) {
    return (
      <PatientVitalsDetail
        patient={selectedPat}
        onBack={() => { setSelectedPat(null); fetchStats(); }}
      />
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>Vital Signs Monitoring</h1>
          <p>
            {stats.todayCount || 0} readings today ·
            {stats.criticalCount > 0 && (
              <span style={{ color: '#ef4444', fontWeight: 700 }}> {stats.criticalCount} critical in 24h</span>
            )}
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={fetchStats}><MdRefresh /></button>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom: 20 }}>
        {[
          { label: 'Today Readings',    value: stats.todayCount  || 0, color: '#0ea5e9', icon: '❤️'  },
          { label: 'Critical (24h)',    value: stats.criticalCount||0, color: '#ef4444', icon: '🚨' },
          { label: 'Total Readings',    value: stats.totalCount  || 0, color: '#10b981', icon: '📊' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background: s.color + '20', fontSize: 22 }}>{s.icon}</div>
            <div>
              <div className="stat-value" style={{ color: s.color, fontSize: 24 }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Critical alerts panel */}
      {critAlerts.length > 0 && (
        <div className="card" style={{ marginBottom: 20, border: '1px solid #fca5a5', background: '#fff5f5' }}>
          <div style={{ fontWeight: 800, color: '#dc2626', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <MdWarning size={20} /> Critical Alerts (Last 24 hours)
          </div>
          {critAlerts.slice(0, 5).map(a => (
            <div key={a._id}
              onClick={() => setSelectedPat(a.patient)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: '#fee2e2', borderRadius: 8, marginBottom: 6, cursor: 'pointer' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{a.patientName}</div>
                <div style={{ fontSize: 12, color: '#dc2626' }}>
                  {a.alerts?.filter(x => x.severity === 'Critical').map(x => x.message).join(' · ')}
                </div>
                <div className="text-muted" style={{ fontSize: 11 }}>{fmtDT(a.recordedAt)} · by {a.recordedByName}</div>
              </div>
              <span style={{ color: '#ef4444', fontSize: 12 }}>View →</span>
            </div>
          ))}
        </div>
      )}

      {/* Patient search */}
      <div className="card">
        <div style={{ fontWeight: 700, marginBottom: 12 }}>Search Patient to View / Record Vitals</div>
        <div className="search-box">
          <MdSearch className="search-icon" />
          <input placeholder="Type patient name or ID to search..." value={search}
            onChange={e => setSearch(e.target.value)} autoFocus />
        </div>

        {loading && <div className="text-muted text-sm" style={{ marginTop: 10 }}>Searching...</div>}

        {patients.length > 0 && (
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {patients.map(p => (
              <div key={p._id}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: 12, border: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{p.name}</div>
                  <div className="text-muted text-sm">{p.patientId} · {p.age}y · {p.gender} · {p.bloodGroup}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-secondary btn-sm"
                    onClick={() => { setQuickPat(p); setRecordModal(true); }}>
                    <MdAdd /> Record
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={() => setSelectedPat(p)}>
                    View Charts
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {search.length >= 2 && patients.length === 0 && !loading && (
          <div className="text-muted text-sm" style={{ marginTop: 10 }}>
            No patients found for "{search}"
          </div>
        )}

        {search.length < 2 && (
          <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)' }}>
            <MdPerson size={48} style={{ opacity: 0.2, display: 'block', margin: '0 auto 10px' }} />
            <div>Search for a patient to record or view vital signs trends</div>
          </div>
        )}
      </div>

      {/* Quick record modal */}
      {recordModal && quickPat && (
        <RecordModal
          patientId={quickPat._id}
          patientName={quickPat.name}
          onClose={() => { setRecordModal(false); setQuickPat(null); }}
          onRecorded={() => { setRecordModal(false); setQuickPat(null); fetchStats(); }}
        />
      )}
    </div>
  );
}