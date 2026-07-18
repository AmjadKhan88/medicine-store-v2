import { useState, useEffect, useCallback, useRef } from 'react';
import {
  MdSearch, MdAdd, MdClose, MdEdit, MdDelete,
  MdPrint, MdRefresh, MdPerson, MdArrowBack,
  MdWarning, MdHistory, MdMedicalServices,
  MdFamilyRestroom, MdSmokingRooms, MdScience,
} from 'react-icons/md';
import toast from 'react-hot-toast';
import API from '../utils/api';

/* ── helpers ── */
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-PK', { day:'2-digit', month:'short', year:'numeric' }) : '—';
const fmtDT   = d => d ? `${fmtDate(d)} ${new Date(d).toLocaleTimeString('en-PK',{hour:'2-digit',minute:'2-digit'})}` : '—';

const PROBLEM_STATUS_CFG = {
  Active:    { bg:'#fee2e2', color:'#ef4444' },
  Resolved:  { bg:'#d1fae5', color:'#10b981' },
  Inactive:  { bg:'#f3f4f6', color:'#6b7280' },
  Suspected: { bg:'#fef3c7', color:'#f59e0b' },
};

const TIMELINE_CFG = {
  bill:        { icon:'🧾', color:'#0ea5e9', label:'Bill'         },
  prescription:{ icon:'💊', color:'#8b5cf6', label:'Prescription' },
  labTest:     { icon:'🔬', color:'#10b981', label:'Lab Test'     },
  appointment: { icon:'📅', color:'#f59e0b', label:'Appointment'  },
  admission:   { icon:'🏥', color:'#ef4444', label:'Admission'    },
  discharge:   { icon:'✅', color:'#16a34a', label:'Discharge'    },
  vitals:      { icon:'❤️', color:'#ec4899', label:'Vitals'       },
};

/* ════════════════════════════════
   ADD PROBLEM MODAL
════════════════════════════════ */
function AddProblemModal({ patientId, existing, onClose, onSaved }) {
  const [form, setForm] = useState({
    condition:  existing?.condition  || '',
    icdCode:    existing?.icdCode    || '',
    status:     existing?.status     || 'Active',
    severity:   existing?.severity   || '',
    onsetDate:  existing?.onsetDate  ? new Date(existing.onsetDate).toISOString().slice(0,10) : '',
    notes:      existing?.notes      || '',
  });
  const [saving, setSaving] = useState(false);
  const fld = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const COMMON = ['Hypertension','Type 2 Diabetes Mellitus','Coronary Artery Disease','Asthma','COPD','CKD','Hypothyroidism','Hyperthyroidism','Dyslipidemia','Osteoarthritis','Anxiety Disorder','Depression','Epilepsy','Atrial Fibrillation','Heart Failure','Obesity','Gout','Peptic Ulcer Disease'];

  const handle = async () => {
    if (!form.condition.trim()) { toast.error('Condition required'); return; }
    setSaving(true);
    try {
      if (existing) {
        await API.put(`/emr/${patientId}/problems/${existing._id}`, form);
        toast.success('Problem updated');
      } else {
        await API.post(`/emr/${patientId}/problems`, form);
        toast.success(`"${form.condition}" added to problem list`);
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <div className="modal-title">{existing ? 'Edit Problem' : 'Add Problem'}</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><MdClose /></button>
        </div>

        <div className="form-group">
          <label className="form-label required">Condition / Diagnosis</label>
          <input className="form-control" value={form.condition} onChange={fld('condition')}
            placeholder="e.g. Type 2 Diabetes Mellitus" autoFocus list="conditions-list" />
          <datalist id="conditions-list">
            {COMMON.map(c => <option key={c} value={c} />)}
          </datalist>
          {/* Quick add pills */}
          <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginTop:6 }}>
            {COMMON.slice(0,6).map(c => (
              <button key={c} className="pill" style={{ fontSize:10 }}
                onClick={() => setForm(p => ({ ...p, condition:c }))}>
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-control" value={form.status} onChange={fld('status')}>
              {['Active','Resolved','Inactive','Suspected'].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Severity</label>
            <select className="form-control" value={form.severity} onChange={fld('severity')}>
              <option value="">— Not set —</option>
              {['Mild','Moderate','Severe'].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">ICD-10 Code</label>
            <input className="form-control" value={form.icdCode} onChange={fld('icdCode')} placeholder="e.g. E11" />
          </div>
          <div className="form-group">
            <label className="form-label">Onset Date</label>
            <input className="form-control" type="date" value={form.onsetDate} onChange={fld('onsetDate')} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Notes</label>
          <textarea className="form-control" rows={2} value={form.notes} onChange={fld('notes')} placeholder="Additional notes..." />
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handle} disabled={saving || !form.condition.trim()}>
            {saving ? 'Saving...' : existing ? 'Update' : 'Add Problem'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════
   SOCIAL HISTORY FORM
════════════════════════════════ */
function SocialHistoryForm({ data, patientId, onSaved }) {
  const [form, setForm] = useState({
    smokingStatus:    data?.smokingStatus    || '',
    smokingPackYears: data?.smokingPackYears || '',
    alcoholUse:       data?.alcoholUse       || '',
    substanceUse:     data?.substanceUse     || '',
    occupation:       data?.occupation       || '',
    maritalStatus:    data?.maritalStatus    || '',
    educationLevel:   data?.educationLevel   || '',
    exerciseFrequency:data?.exerciseFrequency|| '',
    diet:             data?.diet             || '',
    livingStatus:     data?.livingStatus     || '',
    notes:            data?.notes            || '',
  });
  const [saving, setSaving] = useState(false);
  const fld = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await API.put(`/emr/${patientId}`, { socialHistory: form });
      toast.success('Social history saved');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <div className="form-group">
          <label className="form-label">Smoking Status</label>
          <select className="form-control" value={form.smokingStatus} onChange={fld('smokingStatus')}>
            <option value="">— Select —</option>
            {['Never','Current','Former'].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        {form.smokingStatus !== 'Never' && form.smokingStatus && (
          <div className="form-group">
            <label className="form-label">Pack Years</label>
            <input className="form-control" type="number" value={form.smokingPackYears} onChange={fld('smokingPackYears')} placeholder="e.g. 10" />
          </div>
        )}
        <div className="form-group">
          <label className="form-label">Alcohol Use</label>
          <select className="form-control" value={form.alcoholUse} onChange={fld('alcoholUse')}>
            <option value="">— Select —</option>
            {['None','Occasional','Moderate','Heavy','Former'].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Occupation</label>
          <input className="form-control" value={form.occupation} onChange={fld('occupation')} placeholder="e.g. Teacher, Farmer" />
        </div>
        <div className="form-group">
          <label className="form-label">Marital Status</label>
          <select className="form-control" value={form.maritalStatus} onChange={fld('maritalStatus')}>
            <option value="">— Select —</option>
            {['Single','Married','Divorced','Widowed'].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Exercise</label>
          <select className="form-control" value={form.exerciseFrequency} onChange={fld('exerciseFrequency')}>
            <option value="">— Select —</option>
            {['None','Rarely','1-2x/week','3-4x/week','Daily'].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Diet</label>
          <input className="form-control" value={form.diet} onChange={fld('diet')} placeholder="e.g. Diabetic diet, Vegetarian" />
        </div>
        <div className="form-group">
          <label className="form-label">Living Status</label>
          <input className="form-control" value={form.livingStatus} onChange={fld('livingStatus')} placeholder="e.g. With family, Alone" />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Substance Use / Other</label>
        <input className="form-control" value={form.substanceUse} onChange={fld('substanceUse')} placeholder="Any other substance use..." />
      </div>
      <div className="form-group">
        <label className="form-label">Notes</label>
        <textarea className="form-control" rows={2} value={form.notes} onChange={fld('notes')} />
      </div>
      <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
        {saving ? 'Saving...' : 'Save Social History'}
      </button>
    </div>
  );
}

/* ════════════════════════════════
   EMR DETAIL
════════════════════════════════ */
function EMRDetail({ patient, onBack }) {
  const [emr,       setEMR]       = useState(null);
  const [timeline,  setTimeline]  = useState([]);
  const [counts,    setCounts]    = useState({});
  const [loading,   setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [problemModal,  setProblemModal]   = useState(null); // null | 'new' | existing
  const [editSection,   setEditSection]    = useState(null);
  const [filterType,    setFilterType]     = useState('');
  const [timelineLoad,  setTimelineLoad]   = useState(false);
  const printRef = useRef(null);

  const fetchEMR = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await API.get(`/emr/${patient._id}`);
      setEMR(data.emr);
    } catch { toast.error('Failed to load EMR'); }
    finally { setLoading(false); }
  }, [patient._id]);

  const fetchTimeline = useCallback(async () => {
    setTimelineLoad(true);
    try {
      const { data } = await API.get(`/emr/${patient._id}/timeline`, { params: { limit: 300 } });
      setTimeline(data.timeline);
      setCounts(data.counts);
    } catch {}
    finally { setTimelineLoad(false); }
  }, [patient._id]);

  useEffect(() => { fetchEMR(); fetchTimeline(); }, [fetchEMR, fetchTimeline]);

  const handleDeleteProblem = async (problemId, name) => {
    if (!confirm(`Remove "${name}" from problem list?`)) return;
    try {
      await API.delete(`/emr/${patient._id}/problems/${problemId}`);
      toast.success('Problem removed');
      fetchEMR();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleSaveField = async (field, value) => {
    try {
      await API.put(`/emr/${patient._id}`, { [field]: value });
      toast.success('Saved');
      fetchEMR();
      setEditSection(null);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handlePrint = () => window.print();

  // Group timeline by month
  const grouped = {};
  const filtered = filterType ? timeline.filter(e => e.type === filterType) : timeline;
  filtered.forEach(e => {
    const key = e.date ? new Date(e.date).toLocaleDateString('en-PK', { month:'long', year:'numeric' }) : 'Unknown';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(e);
  });

  const TABS = [
    { id:'overview',  label:'Overview'                   },
    { id:'problems',  label:`Problems (${emr?.problemList?.length || 0})` },
    { id:'timeline',  label:`Timeline (${counts.total || 0})` },
    { id:'history',   label:'History'                    },
    { id:'social',    label:'Social'                     },
  ];

  return (
    <div ref={printRef}>
      {/* Header */}
      <div className="page-header no-print">
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <button className="btn btn-ghost btn-icon" onClick={onBack}><MdArrowBack /></button>
          <div>
            <h2 style={{ margin:0 }}>EMR — {patient.name}</h2>
            <div className="text-muted text-sm">
              {patient.patientId} · {patient.age}y · {patient.gender} · {patient.bloodGroup}
              {emr?.lastUpdatedByName && ` · Updated by ${emr.lastUpdatedByName}`}
            </div>
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-secondary btn-sm" onClick={handlePrint}><MdPrint /> Print EMR</button>
          <button className="btn btn-secondary btn-sm" onClick={() => { fetchEMR(); fetchTimeline(); }}><MdRefresh /></button>
        </div>
      </div>

      {/* Print header — shown only when printing */}
      <div className="print-only" style={{ display:'none', padding:'20px 0', borderBottom:'2px solid #000', marginBottom:20 }}>
        <h2 style={{ margin:0, fontSize:20 }}>Electronic Medical Record</h2>
        <div style={{ fontSize:14, marginTop:4 }}>
          <strong>Patient:</strong> {patient.name} · <strong>ID:</strong> {patient.patientId} ·
          <strong> Age:</strong> {patient.age}y · <strong>Gender:</strong> {patient.gender} ·
          <strong> Blood Group:</strong> {patient.bloodGroup}
        </div>
        <div style={{ fontSize:12, color:'#666', marginTop:4 }}>
          Generated: {fmtDT(new Date())}
        </div>
      </div>

      {/* Allergies banner */}
      {patient.allergies?.length > 0 && (
        <div style={{ background:'#fee2e2', border:'2px solid #ef4444', borderRadius:12, padding:'12px 16px', marginBottom:16, display:'flex', alignItems:'center', gap:12 }}>
          <MdWarning size={22} style={{ color:'#ef4444', flexShrink:0 }} />
          <div>
            <div style={{ fontWeight:800, color:'#dc2626', fontSize:13 }}>⚠️ KNOWN ALLERGIES</div>
            <div style={{ display:'flex', gap:6, marginTop:4, flexWrap:'wrap' }}>
              {patient.allergies.map(a => (
                <span key={a} style={{ background:'#ef4444', color:'#fff', padding:'3px 12px', borderRadius:99, fontSize:13, fontWeight:700 }}>{a}</span>
              ))}
            </div>
            {emr?.allergyDetails?.map(ad => (
              <div key={ad._id} style={{ fontSize:11, color:'#dc2626', marginTop:3 }}>
                {ad.allergen}: {ad.reaction} ({ad.severity})
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active problems strip */}
      {emr?.problemList?.filter(p => p.status === 'Active').length > 0 && (
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:16 }}>
          <span style={{ fontSize:12, color:'var(--text-muted)', alignSelf:'center' }}>Active conditions:</span>
          {emr.problemList.filter(p => p.status === 'Active').map(p => (
            <span key={p._id} style={{ background:'#fee2e2', color:'#ef4444', padding:'4px 12px', borderRadius:99, fontSize:12, fontWeight:700 }}>
              {p.condition}{p.severity ? ` (${p.severity})` : ''}
            </span>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:20, borderBottom:'1px solid var(--border)' }} className="no-print">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{ padding:'10px 16px', background:'none', border:'none', borderBottom: activeTab===t.id?'2px solid var(--accent)':'2px solid transparent', color: activeTab===t.id?'var(--accent)':'var(--text-muted)', fontWeight: activeTab===t.id?700:500, cursor:'pointer', fontSize:14, fontFamily:'var(--font-main)' }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex-center" style={{ height:200 }}><div className="text-muted">Loading EMR...</div></div>
      ) : (
        <>
          {/* ── OVERVIEW ── */}
          {activeTab === 'overview' && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              {/* Patient info */}
              <div className="card">
                <div style={{ fontWeight:700, marginBottom:12 }}>Patient Information</div>
                {[
                  ['Name',          patient.name],
                  ['Patient ID',    patient.patientId],
                  ['Age',           patient.age ? `${patient.age} years` : null],
                  ['Gender',        patient.gender],
                  ['Blood Group',   patient.bloodGroup],
                  ['Phone',         patient.phone],
                  ['Email',         patient.email],
                  ['Address',       patient.address],
                  ['City',          patient.city],
                  ['Doctor',        patient.doctor],
                ].filter(([,v])=>v).map(([k,v])=>(
                  <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid var(--border-light)', fontSize:13 }}>
                    <span className="text-muted">{k}</span>
                    <span style={{ fontWeight:600, textAlign:'right', maxWidth:'60%' }}>{v}</span>
                  </div>
                ))}
              </div>

              {/* Quick stats */}
              <div className="card">
                <div style={{ fontWeight:700, marginBottom:12 }}>Medical Summary</div>
                {[
                  { icon:'📋', label:'Active Problems',   value: emr?.problemList?.filter(p=>p.status==='Active').length || 0, color:'#ef4444' },
                  { icon:'🧾', label:'Total Bills',       value: counts.bills          || 0, color:'#0ea5e9' },
                  { icon:'💊', label:'Prescriptions',     value: counts.prescriptions  || 0, color:'#8b5cf6' },
                  { icon:'🔬', label:'Lab Tests',         value: counts.labTests       || 0, color:'#10b981' },
                  { icon:'📅', label:'Appointments',      value: counts.appointments   || 0, color:'#f59e0b' },
                  { icon:'🏥', label:'IPD Admissions',    value: counts.admissions     || 0, color:'#dc2626' },
                  { icon:'💰', label:'Total Billed',      value: `₨${(patient.totalBilled||0).toLocaleString()}`, color:'#0ea5e9' },
                  { icon:'💳', label:'Balance Due',       value: `₨${(patient.remainingBalance||0).toLocaleString()}`, color: patient.remainingBalance > 0 ? '#ef4444' : '#10b981' },
                ].map(s=>(
                  <div key={s.label} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid var(--border-light)', fontSize:13 }}>
                    <span className="text-muted">{s.icon} {s.label}</span>
                    <span style={{ fontWeight:700, color:s.color }}>{s.value}</span>
                  </div>
                ))}
              </div>

              {/* Clinical summary */}
              <div className="card">
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                  <div style={{ fontWeight:700 }}>Clinical Summary</div>
                  <button className="btn btn-secondary btn-sm no-print" onClick={() => setEditSection('clinical')}>
                    <MdEdit size={13} /> Edit
                  </button>
                </div>
                {editSection === 'clinical' ? (
                  <div>
                    <textarea className="form-control" rows={4} defaultValue={emr?.clinicalSummary || ''}
                      id="clinical-summary-input"
                      placeholder="Overall clinical summary, key diagnoses, management plan..." />
                    <div className="flex gap-2" style={{ marginTop:8 }}>
                      <button className="btn btn-primary btn-sm"
                        onClick={() => handleSaveField('clinicalSummary', document.getElementById('clinical-summary-input').value)}>
                        Save
                      </button>
                      <button className="btn btn-secondary btn-sm" onClick={() => setEditSection(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize:14, lineHeight:1.7, color: emr?.clinicalSummary ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    {emr?.clinicalSummary || 'No clinical summary yet. Click Edit to add.'}
                  </div>
                )}
              </div>

              {/* Past medical history */}
              <div className="card">
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                  <div style={{ fontWeight:700 }}>Past Medical History</div>
                  <button className="btn btn-secondary btn-sm no-print" onClick={() => setEditSection('pmh')}>
                    <MdEdit size={13} /> Edit
                  </button>
                </div>
                {editSection === 'pmh' ? (
                  <div>
                    <textarea className="form-control" rows={4} defaultValue={emr?.pastMedicalHistory || ''}
                      id="pmh-input" placeholder="Previous illnesses, hospitalizations, significant medical events..." />
                    <div className="flex gap-2" style={{ marginTop:8 }}>
                      <button className="btn btn-primary btn-sm"
                        onClick={() => handleSaveField('pastMedicalHistory', document.getElementById('pmh-input').value)}>
                        Save
                      </button>
                      <button className="btn btn-secondary btn-sm" onClick={() => setEditSection(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize:14, lineHeight:1.7, color: emr?.pastMedicalHistory ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    {emr?.pastMedicalHistory || 'No past medical history recorded.'}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── PROBLEMS ── */}
          {activeTab === 'problems' && (
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}>
                <div>
                  <div style={{ fontWeight:700 }}>Problem List</div>
                  <div className="text-muted text-sm">{emr?.problemList?.filter(p=>p.status==='Active').length||0} active · {emr?.problemList?.filter(p=>p.status==='Resolved').length||0} resolved</div>
                </div>
                <button className="btn btn-primary btn-sm no-print" onClick={() => setProblemModal('new')}>
                  <MdAdd /> Add Problem
                </button>
              </div>

              {!emr?.problemList?.length ? (
                <div className="empty-state">
                  <MdMedicalServices size={48} style={{ opacity:0.3, marginBottom:12 }} />
                  <h3>No problems recorded</h3>
                  <button className="btn btn-primary" style={{ marginTop:12 }} onClick={() => setProblemModal('new')}>
                    <MdAdd /> Add First Problem
                  </button>
                </div>
              ) : (
                <div>
                  {/* Active */}
                  {emr.problemList.filter(p=>p.status==='Active').length > 0 && (
                    <div style={{ marginBottom:20 }}>
                      <div style={{ fontWeight:700, color:'#ef4444', marginBottom:8, fontSize:12, textTransform:'uppercase', letterSpacing:1 }}>
                        Active ({emr.problemList.filter(p=>p.status==='Active').length})
                      </div>
                      {emr.problemList.filter(p=>p.status==='Active').map(p => <ProblemRow key={p._id} problem={p} onEdit={()=>setProblemModal(p)} onDelete={()=>handleDeleteProblem(p._id,p.condition)} />)}
                    </div>
                  )}

                  {/* Other statuses */}
                  {['Suspected','Inactive','Resolved'].map(status => {
                    const items = emr.problemList.filter(p=>p.status===status);
                    if (!items.length) return null;
                    return (
                      <div key={status} style={{ marginBottom:16 }}>
                        <div style={{ fontWeight:700, color: PROBLEM_STATUS_CFG[status].color, marginBottom:8, fontSize:12, textTransform:'uppercase', letterSpacing:1 }}>
                          {status} ({items.length})
                        </div>
                        {items.map(p => <ProblemRow key={p._id} problem={p} onEdit={()=>setProblemModal(p)} onDelete={()=>handleDeleteProblem(p._id,p.condition)} />)}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── TIMELINE ── */}
          {activeTab === 'timeline' && (
            <div>
              {/* Filter pills */}
              <div style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap' }}>
                <button className={`pill${filterType===''?' active':''}`} onClick={()=>setFilterType('')}>
                  All ({counts.total||0})
                </button>
                {Object.entries(TIMELINE_CFG).map(([type, cfg]) => {
                  const key = type === 'discharge' ? 'admissions' : type === 'admission' ? 'admissions' : type+'s';
                  const count = type === 'vitals' ? counts.vitals : type === 'bill' ? counts.bills : type === 'prescription' ? counts.prescriptions : type === 'labTest' ? counts.labTests : type === 'appointment' ? counts.appointments : counts.admissions;
                  if (!count) return null;
                  return (
                    <button key={type} className={`pill${filterType===type?' active':''}`}
                      onClick={()=>setFilterType(filterType===type?'':type)}
                      style={{ fontSize:11 }}>
                      {cfg.icon} {cfg.label} ({count})
                    </button>
                  );
                })}
              </div>

              {timelineLoad ? (
                <div className="flex-center" style={{ height:150 }}><div className="text-muted">Loading timeline...</div></div>
              ) : Object.keys(grouped).length === 0 ? (
                <div className="empty-state">
                  <MdHistory size={48} style={{ opacity:0.3, marginBottom:12 }} />
                  <h3>No history yet</h3>
                </div>
              ) : (
                Object.entries(grouped).map(([month, events]) => (
                  <div key={month} style={{ marginBottom:24 }}>
                    {/* Month header */}
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                      <div style={{ fontWeight:800, fontSize:13, color:'var(--text-muted)' }}>{month}</div>
                      <div style={{ flex:1, height:1, background:'var(--border)' }} />
                      <div className="text-muted" style={{ fontSize:11 }}>{events.length} events</div>
                    </div>

                    {/* Events */}
                    <div style={{ display:'flex', flexDirection:'column', gap:6, paddingLeft:16, borderLeft:'2px solid var(--border)' }}>
                      {events.map((e, i) => {
                        const cfg = TIMELINE_CFG[e.type] || { icon:'📋', color:'#64748b' };
                        return (
                          <div key={`${e.id}-${i}`} style={{ display:'flex', alignItems:'flex-start', gap:12, position:'relative' }}>
                            {/* Dot */}
                            <div style={{ position:'absolute', left:-20, top:8, width:10, height:10, borderRadius:'50%', background: cfg.color, border:'2px solid var(--card-bg)', flexShrink:0 }} />

                            <div style={{ flex:1, background:'var(--card-bg)', border:'1px solid var(--border)', borderLeft:`4px solid ${cfg.color}`, borderRadius:10, padding:'10px 14px' }}>
                              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                                <span style={{ fontSize:16 }}>{cfg.icon}</span>
                                <span style={{ fontWeight:600, fontSize:13 }}>{e.summary}</span>
                              </div>
                              <div className="text-muted" style={{ fontSize:11 }}>{fmtDT(e.date)}</div>

                              {/* Expanded detail */}
                              {e.type === 'appointment' && e.detail.visitNotes && (
                                <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:4, fontStyle:'italic' }}>
                                  Notes: {e.detail.visitNotes.slice(0,120)}{e.detail.visitNotes.length>120?'...':''}
                                </div>
                              )}
                              {e.type === 'vitals' && e.detail.hasCriticalAlert && (
                                <div style={{ fontSize:11, color:'#ef4444', fontWeight:700, marginTop:3 }}>
                                  🚨 {e.detail.alerts?.filter(a=>a.severity==='Critical').map(a=>a.message).join(', ')}
                                </div>
                              )}
                              {e.type === 'prescription' && e.detail.items?.length > 0 && (
                                <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:3 }}>
                                  Medicines: {e.detail.items.slice(0,3).map(i=>i.medicineName).join(', ')}{e.detail.items.length>3?'...':''}
                                </div>
                              )}
                              {e.type === 'labTest' && e.detail.result?.interpretation && (
                                <div style={{ fontSize:11, color: e.detail.result.interpretation==='Critical'?'#ef4444':'var(--text-muted)', marginTop:3, fontWeight: e.detail.result.interpretation==='Critical'?700:400 }}>
                                  Result: {e.detail.result.interpretation}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── HISTORY (Surgical + Family + Immunizations) ── */}
          {activeTab === 'history' && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              {/* Surgical history */}
              <div className="card">
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                  <div style={{ fontWeight:700 }}>🔪 Surgical History</div>
                  <button className="btn btn-secondary btn-sm no-print" onClick={() => setEditSection('surgical')}>
                    <MdEdit size={13} /> Edit
                  </button>
                </div>
                {editSection === 'surgical' ? (
                  <SurgicalHistoryEditor
                    data={emr?.surgicalHistory || []}
                    onSave={data => handleSaveField('surgicalHistory', data)}
                    onCancel={() => setEditSection(null)}
                  />
                ) : !emr?.surgicalHistory?.length ? (
                  <div className="text-muted text-sm">No surgical history recorded</div>
                ) : (
                  emr.surgicalHistory.map((s, i) => (
                    <div key={i} style={{ padding:'8px 0', borderBottom:'1px solid var(--border-light)', fontSize:13 }}>
                      <div style={{ fontWeight:700 }}>{s.procedure}</div>
                      <div className="text-muted">{fmtDate(s.date)}{s.surgeon ? ` · Dr. ${s.surgeon}` : ''}{s.hospital ? ` · ${s.hospital}` : ''}</div>
                      {s.complications && <div style={{ color:'#f59e0b', fontSize:11 }}>⚠️ {s.complications}</div>}
                    </div>
                  ))
                )}
              </div>

              {/* Family history */}
              <div className="card">
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                  <div style={{ fontWeight:700 }}>👨‍👩‍👧 Family History</div>
                  <button className="btn btn-secondary btn-sm no-print" onClick={() => setEditSection('family')}>
                    <MdEdit size={13} /> Edit
                  </button>
                </div>
                {editSection === 'family' ? (
                  <FamilyHistoryEditor
                    data={emr?.familyHistory || []}
                    onSave={data => handleSaveField('familyHistory', data)}
                    onCancel={() => setEditSection(null)}
                  />
                ) : !emr?.familyHistory?.length ? (
                  <div className="text-muted text-sm">No family history recorded</div>
                ) : (
                  emr.familyHistory.map((f, i) => (
                    <div key={i} style={{ padding:'8px 0', borderBottom:'1px solid var(--border-light)', fontSize:13 }}>
                      <div style={{ display:'flex', gap:8 }}>
                        <span style={{ fontWeight:700 }}>{f.relation}:</span>
                        <span>{f.condition}</span>
                        {f.status === 'Deceased' && <span style={{ color:'var(--text-muted)', fontSize:11 }}>(deceased)</span>}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Immunizations */}
              <div className="card">
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                  <div style={{ fontWeight:700 }}>💉 Immunizations</div>
                  <button className="btn btn-secondary btn-sm no-print" onClick={() => setEditSection('immunizations')}>
                    <MdEdit size={13} /> Edit
                  </button>
                </div>
                {editSection === 'immunizations' ? (
                  <ImmunizationEditor
                    data={emr?.immunizations || []}
                    onSave={data => handleSaveField('immunizations', data)}
                    onCancel={() => setEditSection(null)}
                  />
                ) : !emr?.immunizations?.length ? (
                  <div className="text-muted text-sm">No immunizations recorded</div>
                ) : (
                  emr.immunizations.map((imm, i) => (
                    <div key={i} style={{ padding:'8px 0', borderBottom:'1px solid var(--border-light)', fontSize:13 }}>
                      <div style={{ fontWeight:700 }}>{imm.vaccine}</div>
                      <div className="text-muted">{fmtDate(imm.date)}{imm.dose ? ` · ${imm.dose}` : ''}{imm.manufacturer ? ` · ${imm.manufacturer}` : ''}</div>
                    </div>
                  ))
                )}
              </div>

              {/* Current medications */}
              <div className="card">
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                  <div style={{ fontWeight:700 }}>💊 Current Medications</div>
                  <button className="btn btn-secondary btn-sm no-print" onClick={() => setEditSection('meds')}>
                    <MdEdit size={13} /> Edit
                  </button>
                </div>
                {editSection === 'meds' ? (
                  <MedListEditor
                    data={emr?.currentMedications || []}
                    onSave={data => handleSaveField('currentMedications', data)}
                    onCancel={() => setEditSection(null)}
                  />
                ) : !emr?.currentMedications?.filter(m=>m.isActive).length ? (
                  <div className="text-muted text-sm">No current medications recorded</div>
                ) : (
                  emr.currentMedications.filter(m=>m.isActive).map((m, i) => (
                    <div key={i} style={{ padding:'8px 0', borderBottom:'1px solid var(--border-light)', fontSize:13 }}>
                      <div style={{ fontWeight:700 }}>{m.name}</div>
                      <div className="text-muted">{m.dose}{m.frequency ? ` · ${m.frequency}` : ''}{m.route ? ` · ${m.route}` : ''}</div>
                      {m.indication && <div style={{ fontSize:11, color:'var(--text-muted)' }}>For: {m.indication}</div>}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ── SOCIAL ── */}
          {activeTab === 'social' && (
            <div className="card" style={{ maxWidth:700 }}>
              <div style={{ fontWeight:700, marginBottom:16 }}>Social & Lifestyle History</div>
              <SocialHistoryForm
                data={emr?.socialHistory}
                patientId={patient._id}
                onSaved={fetchEMR}
              />
            </div>
          )}
        </>
      )}

      {/* Problem modal */}
      {problemModal && (
        <AddProblemModal
          patientId={patient._id}
          existing={problemModal !== 'new' ? problemModal : null}
          onClose={() => setProblemModal(null)}
          onSaved={() => { setProblemModal(null); fetchEMR(); }}
        />
      )}

      <style>{`
        @media print {
          .no-print { display:none !important; }
          .print-only { display:block !important; }
          body { background:white !important; }
        }
      `}</style>
    </div>
  );
}

/* ── Problem row ── */
function ProblemRow({ problem, onEdit, onDelete }) {
  const cfg = PROBLEM_STATUS_CFG[problem.status] || PROBLEM_STATUS_CFG.Active;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', background:'var(--card-bg)', border:`1px solid var(--border)`, borderLeft:`4px solid ${cfg.color}`, borderRadius:10, marginBottom:6 }}>
      <div style={{ flex:1 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontWeight:700, fontSize:14 }}>{problem.condition}</span>
          {problem.icdCode && <span style={{ fontSize:11, color:'var(--text-muted)' }}>({problem.icdCode})</span>}
          <span style={{ background:cfg.bg, color:cfg.color, padding:'2px 8px', borderRadius:99, fontSize:11, fontWeight:700 }}>{problem.status}</span>
          {problem.severity && <span className="text-muted" style={{ fontSize:11 }}>{problem.severity}</span>}
        </div>
        <div className="text-muted" style={{ fontSize:11, marginTop:2 }}>
          {problem.onsetDate && `Since: ${fmtDate(problem.onsetDate)}`}
          {problem.onsetDate && problem.notes && ' · '}
          {problem.notes}
        </div>
      </div>
      <div style={{ display:'flex', gap:4 }} className="no-print">
        <button className="btn btn-secondary btn-sm btn-icon" onClick={onEdit}><MdEdit size={13} /></button>
        <button className="btn btn-ghost btn-sm btn-icon" onClick={onDelete}><MdDelete size={13} style={{ color:'var(--danger)' }} /></button>
      </div>
    </div>
  );
}

/* ── Simple list editors ── */
function SurgicalHistoryEditor({ data, onSave, onCancel }) {
  const [items, setItems] = useState(data.map(s => ({ ...s, date: s.date ? new Date(s.date).toISOString().slice(0,10) : '' })));
  const blank = { procedure:'', date:'', surgeon:'', hospital:'', anesthesia:'', complications:'', notes:'' };
  return (
    <div>
      {items.map((item, i) => (
        <div key={i} style={{ background:'var(--bg-tertiary)', borderRadius:10, padding:12, marginBottom:8 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {[['procedure','Procedure*'],['date','Date'],['surgeon','Surgeon'],['hospital','Hospital'],['complications','Complications'],['notes','Notes']].map(([k,l])=>(
              <div key={k} className="form-group" style={{ marginBottom:0 }}>
                <label className="form-label" style={{ fontSize:10 }}>{l}</label>
                <input className="form-control" style={{ fontSize:12 }} value={item[k]||''} onChange={e=>setItems(p=>p.map((x,j)=>j===i?{...x,[k]:e.target.value}:x))} />
              </div>
            ))}
          </div>
          <button className="btn btn-danger btn-sm" style={{ marginTop:6 }} onClick={()=>setItems(p=>p.filter((_,j)=>j!==i))}>Remove</button>
        </div>
      ))}
      <button className="btn btn-secondary btn-sm" style={{ marginBottom:10 }} onClick={()=>setItems(p=>[...p,{...blank}])}><MdAdd size={14}/> Add Surgery</button>
      <div style={{ display:'flex', gap:8 }}>
        <button className="btn btn-primary btn-sm" onClick={()=>onSave(items)}>Save</button>
        <button className="btn btn-secondary btn-sm" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function FamilyHistoryEditor({ data, onSave, onCancel }) {
  const [items, setItems] = useState([...data]);
  const blank = { relation:'Father', condition:'', status:'Unknown', notes:'' };
  return (
    <div>
      {items.map((item,i)=>(
        <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 2fr 1fr auto', gap:8, alignItems:'end', marginBottom:8 }}>
          <div>
            <label className="form-label" style={{ fontSize:10 }}>Relation</label>
            <select className="form-control" style={{ fontSize:12 }} value={item.relation||'Father'} onChange={e=>setItems(p=>p.map((x,j)=>j===i?{...x,relation:e.target.value}:x))}>
              {['Father','Mother','Brother','Sister','Grandfather','Grandmother','Uncle','Aunt','Son','Daughter','Other'].map(r=><option key={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label" style={{ fontSize:10 }}>Condition</label>
            <input className="form-control" style={{ fontSize:12 }} value={item.condition||''} onChange={e=>setItems(p=>p.map((x,j)=>j===i?{...x,condition:e.target.value}:x))} placeholder="e.g. Hypertension" />
          </div>
          <div>
            <label className="form-label" style={{ fontSize:10 }}>Status</label>
            <select className="form-control" style={{ fontSize:12 }} value={item.status||'Unknown'} onChange={e=>setItems(p=>p.map((x,j)=>j===i?{...x,status:e.target.value}:x))}>
              {['Living','Deceased','Unknown'].map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
          <button className="btn btn-danger btn-sm btn-icon" onClick={()=>setItems(p=>p.filter((_,j)=>j!==i))}><MdDelete size={13}/></button>
        </div>
      ))}
      <button className="btn btn-secondary btn-sm" style={{ marginBottom:10 }} onClick={()=>setItems(p=>[...p,{...blank}])}><MdAdd size={14}/> Add</button>
      <div style={{ display:'flex', gap:8 }}>
        <button className="btn btn-primary btn-sm" onClick={()=>onSave(items)}>Save</button>
        <button className="btn btn-secondary btn-sm" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function ImmunizationEditor({ data, onSave, onCancel }) {
  const [items, setItems] = useState(data.map(d=>({...d, date: d.date ? new Date(d.date).toISOString().slice(0,10) : ''})));
  const blank = { vaccine:'', date:'', dose:'', manufacturer:'', notes:'' };
  const COMMON_VACCINES = ['COVID-19 (Sinopharm)','COVID-19 (Pfizer)','Hepatitis B','Polio (OPV)','MMR','BCG','Tetanus','Influenza','Typhoid','Meningococcal'];
  return (
    <div>
      {items.map((item,i)=>(
        <div key={i} style={{ background:'var(--bg-tertiary)', borderRadius:10, padding:10, marginBottom:8 }}>
          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr auto', gap:8, alignItems:'end' }}>
            <div>
              <label className="form-label" style={{ fontSize:10 }}>Vaccine</label>
              <input className="form-control" style={{ fontSize:12 }} value={item.vaccine||''} onChange={e=>setItems(p=>p.map((x,j)=>j===i?{...x,vaccine:e.target.value}:x))} list="vaccines-list" />
              <datalist id="vaccines-list">{COMMON_VACCINES.map(v=><option key={v} value={v}/>)}</datalist>
            </div>
            <div>
              <label className="form-label" style={{ fontSize:10 }}>Date</label>
              <input className="form-control" type="date" style={{ fontSize:12 }} value={item.date||''} onChange={e=>setItems(p=>p.map((x,j)=>j===i?{...x,date:e.target.value}:x))} />
            </div>
            <div>
              <label className="form-label" style={{ fontSize:10 }}>Dose</label>
              <input className="form-control" style={{ fontSize:12 }} value={item.dose||''} onChange={e=>setItems(p=>p.map((x,j)=>j===i?{...x,dose:e.target.value}:x))} placeholder="1st, Booster" />
            </div>
            <button className="btn btn-danger btn-sm btn-icon" style={{ alignSelf:'flex-end' }} onClick={()=>setItems(p=>p.filter((_,j)=>j!==i))}><MdDelete size={13}/></button>
          </div>
        </div>
      ))}
      <button className="btn btn-secondary btn-sm" style={{ marginBottom:10 }} onClick={()=>setItems(p=>[...p,{...blank}])}><MdAdd size={14}/> Add Vaccine</button>
      <div style={{ display:'flex', gap:8 }}>
        <button className="btn btn-primary btn-sm" onClick={()=>onSave(items)}>Save</button>
        <button className="btn btn-secondary btn-sm" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function MedListEditor({ data, onSave, onCancel }) {
  const [items, setItems] = useState([...data]);
  const blank = { name:'', dose:'', frequency:'', route:'Oral', indication:'', isActive:true };
  return (
    <div>
      {items.map((item,i)=>(
        <div key={i} style={{ background:'var(--bg-tertiary)', borderRadius:10, padding:10, marginBottom:8 }}>
          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr', gap:8 }}>
            {[['name','Medicine Name'],['dose','Dose'],['frequency','Frequency'],['route','Route'],['indication','Indication']].map(([k,l])=>(
              <div key={k} className="form-group" style={{ marginBottom:0 }}>
                <label className="form-label" style={{ fontSize:10 }}>{l}</label>
                <input className="form-control" style={{ fontSize:12 }} value={item[k]||''} onChange={e=>setItems(p=>p.map((x,j)=>j===i?{...x,[k]:e.target.value}:x))} />
              </div>
            ))}
          </div>
          <div style={{ marginTop:6, display:'flex', justifyContent:'space-between' }}>
            <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, cursor:'pointer' }}>
              <input type="checkbox" checked={item.isActive} onChange={e=>setItems(p=>p.map((x,j)=>j===i?{...x,isActive:e.target.checked}:x))} />
              Currently taking
            </label>
            <button className="btn btn-danger btn-sm btn-icon" onClick={()=>setItems(p=>p.filter((_,j)=>j!==i))}><MdDelete size={13}/></button>
          </div>
        </div>
      ))}
      <button className="btn btn-secondary btn-sm" style={{ marginBottom:10 }} onClick={()=>setItems(p=>[...p,{...blank}])}><MdAdd size={14}/> Add Medication</button>
      <div style={{ display:'flex', gap:8 }}>
        <button className="btn btn-primary btn-sm" onClick={()=>onSave(items)}>Save</button>
        <button className="btn btn-secondary btn-sm" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

/* ════════════════════════════════
   MAIN PAGE
════════════════════════════════ */
export default function EMRPage() {
  const [search,     setSearch]     = useState('');
  const [patients,   setPatients]   = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [selectedPat,setSelectedPat]= useState(null);

  const searchPatients = useCallback(async () => {
    if (search.length < 2) { setPatients([]); return; }
    setLoading(true);
    try {
      const { data } = await API.get('/patients', { params: { search, limit: 10 } });
      setPatients(data.patients || []);
    } catch {}
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { searchPatients(); }, [searchPatients]);

  if (selectedPat) {
    return (
      <EMRDetail
        patient={selectedPat}
        onBack={() => setSelectedPat(null)}
      />
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Electronic Medical Records</h1>
          <p>Complete medical history, problem list, timeline and referral records</p>
        </div>
      </div>

      <div className="card">
        <div style={{ fontWeight:700, marginBottom:12 }}>Search Patient</div>
        <div className="search-box">
          <MdSearch className="search-icon" />
          <input placeholder="Type patient name, ID or phone to open their EMR..."
            value={search} onChange={e => setSearch(e.target.value)} autoFocus />
        </div>

        {loading && <div className="text-muted text-sm" style={{ marginTop:10 }}>Searching...</div>}

        {patients.length > 0 && (
          <div style={{ marginTop:12, display:'flex', flexDirection:'column', gap:8 }}>
            {patients.map(p => (
              <div key={p._id}
                style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px', background:'var(--bg-secondary)', borderRadius:12, border:'1px solid var(--border)', cursor:'pointer', transition:'all 0.15s' }}
                onMouseEnter={e=>e.currentTarget.style.borderColor='var(--accent)'}
                onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border)'}
                onClick={() => setSelectedPat(p)}>
                <div>
                  <div style={{ fontWeight:700, fontSize:15 }}>{p.name}</div>
                  <div className="text-muted text-sm">
                    {p.patientId} · {p.age}y · {p.gender} · {p.bloodGroup}
                    {p.allergies?.length > 0 && (
                      <span style={{ color:'#ef4444', fontWeight:700, marginLeft:8 }}>
                        ⚠️ {p.allergies.length} allergy
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <span className="text-muted text-sm">Open EMR →</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {search.length >= 2 && !loading && patients.length === 0 && (
          <div className="text-muted text-sm" style={{ marginTop:10 }}>No patients found</div>
        )}

        {search.length < 2 && (
          <div style={{ textAlign:'center', padding:'40px 0', color:'var(--text-muted)' }}>
            <MdPerson size={56} style={{ opacity:0.2, display:'block', margin:'0 auto 12px' }} />
            <div style={{ fontSize:16, fontWeight:600, marginBottom:8 }}>Search for a patient</div>
            <div className="text-muted text-sm">Type at least 2 characters to search</div>
          </div>
        )}
      </div>
    </div>
  );
}