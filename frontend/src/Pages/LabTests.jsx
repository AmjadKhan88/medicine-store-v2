import { useState, useEffect, useCallback } from 'react';
import {
  MdAdd, MdSearch, MdScience, MdUploadFile,
  MdDownload, MdCancel, MdVisibility,
  MdEdit, MdCheckCircle, MdDelete,
} from 'react-icons/md';
import toast from 'react-hot-toast';
import API from '../utils/api';
import ShortLoader from '../Components/ShortLoader';

/* ── helpers ── */
const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—';

const CATEGORIES = [
  'Blood Test', 'Urine Test', 'Imaging',
  'Microbiology', 'Pathology', 'Cardiac', 'Other',
];

const COMMON_TESTS = {
  'Blood Test': ['CBC (Complete Blood Count)', 'Blood Sugar (Fasting)', 'Blood Sugar (Random)', 'HbA1c', 'Lipid Profile', 'LFT (Liver Function)', 'KFT (Kidney Function)', 'Thyroid Profile (TSH)', 'Uric Acid', 'CRP'],
  'Urine Test': ['Urine R/E (Routine)', 'Urine C/S (Culture)', '24-Hour Urine Protein'],
  'Imaging': ['X-Ray Chest', 'X-Ray KUB', 'Ultrasound Abdomen', 'Ultrasound Pelvis', 'ECG', 'Echo', 'CT Scan', 'MRI'],
  'Microbiology': ['Blood Culture', 'Sputum C/S', 'Stool R/E', 'HCV Antibody', 'HBsAg', 'HIV Test'],
  'Pathology': ['Biopsy', 'FNAC', 'Pap Smear'],
  'Cardiac': ['ECG', 'Troponin', 'CPK-MB', 'BNP'],
  'Other': ['Custom Test'],
};

const CBC_PARAMS = [
  { parameter: 'WBC', unit: '×10³/μL', normalRange: '4.5–11.0' },
  { parameter: 'RBC', unit: '×10⁶/μL', normalRange: '4.5–5.5' },
  { parameter: 'Hemoglobin', unit: 'g/dL', normalRange: '12.0–16.0' },
  { parameter: 'Hematocrit', unit: '%', normalRange: '37–47' },
  { parameter: 'MCV', unit: 'fL', normalRange: '80–100' },
  { parameter: 'MCH', unit: 'pg', normalRange: '27–33' },
  { parameter: 'MCHC', unit: 'g/dL', normalRange: '32–36' },
  { parameter: 'Platelets', unit: '×10³/μL', normalRange: '150–400' },
  { parameter: 'Neutrophils', unit: '%', normalRange: '40–75' },
  { parameter: 'Lymphocytes', unit: '%', normalRange: '20–45' },
];

const STATUS_BADGE = {
  Ordered: 'badge-info',
  'Sample Collected': 'badge-warning',
  'In Progress': 'badge-warning',
  Completed: 'badge-success',
  Cancelled: 'badge-danger',
};

const INTERP_COLOR = {
  Normal: 'var(--success)',
  High: 'var(--danger)',
  Low: 'var(--info)',
  Critical: 'var(--danger)',
  Pending: 'var(--text-muted)',
};

const FLAG_COLOR = { H: 'var(--danger)', L: 'var(--info)', HH: 'var(--danger)', LL: 'var(--info)', '': 'inherit' };
const bytes = (b) => b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`;

/* ═══════════════════════════════════
   ORDER LAB TEST MODAL
═══════════════════════════════════ */
function OrderModal({ onClose, onSaved }) {
  const store = (() => { try { return JSON.parse(localStorage.getItem('medistore_profile')) || {}; } catch { return {}; } })();
  const [patSearch, setPatSearch] = useState('');
  const [patients, setPatients] = useState([]);
  const [showDrop, setShowDrop] = useState(false);
  const [selectedPat, setSelectedPat] = useState(null);
  const [category, setCategory] = useState('Blood Test');
  const [form, setForm] = useState({
    testName: '', orderedBy: store.doctor || '', lab: '', orderedDate: new Date().toISOString().slice(0, 10), notes: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (patSearch.length < 2) { setShowDrop(false); return; }
    API.get('/patients', { params: { search: patSearch, limit: 6 } })
      .then(({ data }) => { setPatients(data.patients); setShowDrop(true); });
  }, [patSearch]);

  const fld = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSave = async () => {
    if (!selectedPat) { toast.error('Select a patient'); return; }
    if (!form.testName) { toast.error('Test name is required'); return; }
    setSaving(true);
    try {
      await API.post('/lab-tests', { patient: selectedPat._id, testCategory: category, ...form });
      toast.success(`Lab test "${form.testName}" ordered!`);
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <div className="modal-title">Order Lab Test</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>

        {/* Patient */}
        <div className="form-group">
          <label className="form-label required">Patient</label>
          {selectedPat ? (
            <div className="flex-between" style={{ background: 'var(--bg-tertiary)', borderRadius: 10, padding: '10px 14px' }}>
              <div>
                <div style={{ fontWeight: 700 }}>{selectedPat.name}</div>
                <div className="text-muted text-sm">{selectedPat.patientId} · Age {selectedPat.age}</div>
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

        {/* Category + Test */}
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Test Category</label>
            <select className="form-control" value={category} onChange={e => { setCategory(e.target.value); setForm(p => ({ ...p, testName: '' })); }}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label required">Test Name</label>
            <input className="form-control" list="test-list" value={form.testName}
              onChange={fld('testName')} placeholder="Select or type test name..." />
            <datalist id="test-list">
              {(COMMON_TESTS[category] || []).map(t => <option key={t} value={t} />)}
            </datalist>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Ordered By (Doctor)</label>
            <input className="form-control" value={form.orderedBy} onChange={fld('orderedBy')} placeholder="Dr. Ahmad" />
          </div>
          <div className="form-group">
            <label className="form-label">Laboratory Name</label>
            <input className="form-control" value={form.lab} onChange={fld('lab')} placeholder="Chughtai Lab, Agha Khan..." />
          </div>
          <div className="form-group">
            <label className="form-label">Order Date</label>
            <input className="form-control" type="date" value={form.orderedDate} onChange={fld('orderedDate')} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Notes</label>
          <textarea className="form-control" rows={2} value={form.notes} onChange={fld('notes')}
            placeholder="Special instructions, fasting required, etc." />
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            <MdScience /> {saving ? 'Ordering...' : 'Order Lab Test'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════
   ENTER RESULT MODAL
═══════════════════════════════════ */
function ResultModal({ test, onClose, onSaved }) {
  const isCBC = test.testName?.toLowerCase().includes('cbc');
  const isPanel = isCBC || test.resultRows?.length > 0;

  const [form, setForm] = useState({
    status: 'Completed',
    resultDate: new Date().toISOString().slice(0, 10),
    result: {
      value: test.result?.value || '',
      unit: test.result?.unit || '',
      normalRange: test.result?.normalRange || '',
      interpretation: test.result?.interpretation || 'Pending',
      notes: test.result?.notes || '',
    },
    resultRows: test.resultRows?.length > 0 ? test.resultRows : isCBC ? CBC_PARAMS.map(p => ({ ...p, value: '', flag: '' })) : [],
    usePanel: isPanel,
  });
  const [saving, setSaving] = useState(false);

  const setResult = (k, v) => setForm(p => ({ ...p, result: { ...p.result, [k]: v } }));

  const setRow = (idx, field, val) =>
    setForm(p => ({
      ...p,
      resultRows: p.resultRows.map((r, i) => i === idx ? { ...r, [field]: val } : r),
    }));

  const addRow = () => setForm(p => ({ ...p, resultRows: [...p.resultRows, { parameter: '', value: '', unit: '', normalRange: '', flag: '' }] }));
  const removeRow = (idx) => setForm(p => ({ ...p, resultRows: p.resultRows.filter((_, i) => i !== idx) }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        status: form.status,
        resultDate: form.resultDate,
        result: form.usePanel ? { interpretation: form.result.interpretation, notes: form.result.notes } : form.result,
        resultRows: form.usePanel ? form.resultRows : [],
      };
      await API.put(`/lab-tests/${test._id}`, payload);
      toast.success('Results saved!');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-xl" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <div>
            <div className="modal-title">Enter Results — {test.testName}</div>
            <div className="text-muted text-sm">{test.patientName}</div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>

        <div className="form-row" style={{ marginBottom: 16 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Result Date</label>
            <input className="form-control" type="date" value={form.resultDate}
              onChange={e => setForm(p => ({ ...p, resultDate: e.target.value }))} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Overall Interpretation</label>
            <select className="form-control" value={form.result.interpretation}
              onChange={e => setResult('interpretation', e.target.value)}>
              {['Normal', 'High', 'Low', 'Critical', 'Pending'].map(i => <option key={i}>{i}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Entry Mode</label>
            <select className="form-control" value={form.usePanel ? 'panel' : 'single'}
              onChange={e => setForm(p => ({ ...p, usePanel: e.target.value === 'panel' }))}>
              <option value="single">Single Result</option>
              <option value="panel">Panel / Multiple Parameters</option>
            </select>
          </div>
        </div>

        {/* Single result */}
        {!form.usePanel && (
          <div className="form-row" style={{ marginBottom: 16 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Result Value</label>
              <input className="form-control" value={form.result.value}
                onChange={e => setResult('value', e.target.value)} placeholder="e.g. 14.5" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Unit</label>
              <input className="form-control" value={form.result.unit}
                onChange={e => setResult('unit', e.target.value)} placeholder="e.g. g/dL" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Normal Range</label>
              <input className="form-control" value={form.result.normalRange}
                onChange={e => setResult('normalRange', e.target.value)} placeholder="e.g. 12–16 g/dL" />
            </div>
          </div>
        )}

        {/* Panel results table */}
        {form.usePanel && (
          <div style={{ marginBottom: 16 }}>
            <div className="flex-between" style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-secondary)' }}>PARAMETERS</div>
              <button className="btn btn-secondary btn-sm" onClick={addRow}><MdAdd /> Add Row</button>
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Parameter</th>
                    <th style={{ textAlign: 'right' }}>Value</th>
                    <th>Unit</th>
                    <th>Normal Range</th>
                    <th>Flag</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {form.resultRows.map((row, idx) => (
                    <tr key={idx}>
                      <td>
                        <input className="form-control" value={row.parameter}
                          onChange={e => setRow(idx, 'parameter', e.target.value)}
                          placeholder="Parameter name" style={{ minWidth: 140 }} />
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <input className="form-control" value={row.value}
                          onChange={e => setRow(idx, 'value', e.target.value)}
                          placeholder="Value" style={{ width: 80, textAlign: 'right', color: FLAG_COLOR[row.flag] || 'inherit' }} />
                      </td>
                      <td>
                        <input className="form-control" value={row.unit}
                          onChange={e => setRow(idx, 'unit', e.target.value)}
                          placeholder="Unit" style={{ width: 80 }} />
                      </td>
                      <td>
                        <input className="form-control" value={row.normalRange}
                          onChange={e => setRow(idx, 'normalRange', e.target.value)}
                          placeholder="e.g. 12–16" style={{ width: 110 }} />
                      </td>
                      <td>
                        <select className="form-control" value={row.flag}
                          onChange={e => setRow(idx, 'flag', e.target.value)}
                          style={{ width: 70, color: FLAG_COLOR[row.flag] || 'inherit', fontWeight: 700 }}>
                          <option value="">—</option>
                          <option value="H" style={{ color: 'var(--danger)' }}>H</option>
                          <option value="L" style={{ color: 'var(--info)' }}>L</option>
                          <option value="HH" style={{ color: 'var(--danger)' }}>HH</option>
                          <option value="LL" style={{ color: 'var(--info)' }}>LL</option>
                        </select>
                      </td>
                      <td>
                        <button className="btn btn-danger btn-sm btn-icon"
                          onClick={() => removeRow(idx)}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Doctor's Notes on Result</label>
          <textarea className="form-control" rows={2} value={form.result.notes}
            onChange={e => setResult('notes', e.target.value)}
            placeholder="Clinical interpretation, follow-up advice..." />
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-success" onClick={handleSave} disabled={saving}>
            <MdCheckCircle /> {saving ? 'Saving...' : 'Save Results'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════
   VIEW TEST MODAL
═══════════════════════════════════ */
function ViewModal({ test, onClose, onEnterResult, onUpload, onDownloadFile, onDeleteFile }) {
  const hasFile = !!test.file?.originalName;
  const hasRows = test.resultRows?.length > 0;
  const hasResult = test.result?.value || hasRows;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <div>
            <div className="modal-title">{test.testName}</div>
            <div className="text-muted text-sm">{test.patientName} · {fmtDate(test.orderedDate)}</div>
          </div>
          <div className="flex gap-2">
            <span className={`badge ${STATUS_BADGE[test.status] || 'badge-default'}`}>{test.status}</span>
            <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Info grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div style={{ background: 'var(--bg-tertiary)', borderRadius: 10, padding: 14 }}>
            <div className="text-muted text-sm" style={{ marginBottom: 4 }}>Patient</div>
            <div style={{ fontWeight: 700 }}>{test.patientName}</div>
            <div className="text-muted text-sm">{test.patient?.patientId} · Age {test.patient?.age}</div>
          </div>
          <div style={{ background: 'var(--bg-tertiary)', borderRadius: 10, padding: 14 }}>
            <div className="text-muted text-sm" style={{ marginBottom: 4 }}>Test Info</div>
            <div style={{ fontWeight: 700 }}>{test.testCategory}</div>
            <div className="text-sm">Dr. {test.orderedBy || '—'} · {test.lab || 'Lab not specified'}</div>
            {test.resultDate && <div className="text-sm text-muted">Result: {fmtDate(test.resultDate)}</div>}
          </div>
        </div>

        {/* Result — single */}
        {test.result?.value && !hasRows && (
          <div style={{ background: 'var(--bg-tertiary)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10 }}>RESULT</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: INTERP_COLOR[test.result.interpretation] }}>
                {test.result.value}
              </div>
              <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>{test.result.unit}</div>
              <div style={{ marginLeft: 'auto' }}>
                <span style={{ background: INTERP_COLOR[test.result.interpretation] + '20', color: INTERP_COLOR[test.result.interpretation], padding: '3px 12px', borderRadius: 99, fontSize: 12, fontWeight: 700 }}>
                  {test.result.interpretation}
                </span>
              </div>
            </div>
            {test.result.normalRange && (
              <div className="text-muted text-sm">Normal Range: {test.result.normalRange}</div>
            )}
            {test.result.notes && (
              <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text-secondary)' }}>{test.result.notes}</div>
            )}
          </div>
        )}

        {/* Result — panel */}
        {hasRows && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-secondary)' }}>RESULTS PANEL</div>
              {test.result?.interpretation && (
                <span style={{ background: INTERP_COLOR[test.result.interpretation] + '20', color: INTERP_COLOR[test.result.interpretation], padding: '3px 12px', borderRadius: 99, fontSize: 12, fontWeight: 700 }}>
                  Overall: {test.result.interpretation}
                </span>
              )}
            </div>
            <div className="table-container">
              <table>
                <thead>
                  <tr><th>Parameter</th><th style={{ textAlign: 'right' }}>Value</th><th>Unit</th><th>Normal Range</th><th>Flag</th></tr>
                </thead>
                <tbody>
                  {test.resultRows.map((r, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{r.parameter}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: FLAG_COLOR[r.flag] || 'inherit' }}>{r.value || '—'}</td>
                      <td className="text-muted text-sm">{r.unit}</td>
                      <td className="text-muted text-sm">{r.normalRange}</td>
                      <td>
                        {r.flag
                          ? <span style={{ color: FLAG_COLOR[r.flag], fontWeight: 800 }}>{r.flag}</span>
                          : <span className="text-muted">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {test.result?.notes && <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text-secondary)', padding: '10px 0' }}>{test.result.notes}</div>}
          </div>
        )}

        {/* Linked records */}
        {(test.linkedPrescription || test.linkedAppointment) && (
          <div className="flex gap-3" style={{ marginBottom: 16 }}>
            {test.linkedPrescription && <span className="badge badge-accent">Rx: {test.linkedPrescription.rxNumber}</span>}
            {test.linkedAppointment && <span className="badge badge-info">Appointment: {fmtDate(test.linkedAppointment.date)}</span>}
          </div>
        )}

        {/* File */}
        {hasFile ? (
          <div style={{ background: 'var(--success-bg)', border: '1px solid var(--success)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--success)' }}>📎 Result File Uploaded</div>
              <div className="text-muted text-sm">
                {test.file.originalName} · {bytes(test.file.size)}
                {test.file.mimetype?.startsWith('image/') && (
                  <img src={test.file.url} alt="result"
                    style={{ display: 'block', maxWidth: '100%', maxHeight: 200, borderRadius: 8, marginTop: 8 }}
                  />
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-secondary btn-sm" onClick={onDownloadFile}>
                <MdDownload /> View / Download
              </button>
              <button className="btn btn-danger btn-sm btn-icon" onClick={onDeleteFile} title="Remove file"><MdDelete /></button>
            </div>
          </div>
        ) : (
          <div style={{ border: '2px dashed var(--border)', borderRadius: 10, padding: '16px', marginBottom: 16, textAlign: 'center' }}>
            <div className="text-muted text-sm" style={{ marginBottom: 8 }}>No result file uploaded yet</div>
            <button className="btn btn-secondary btn-sm" onClick={onUpload}>
              <MdUploadFile /> Upload PDF or Image
            </button>
          </div>
        )}

        <div className="modal-footer">
          {test.status !== 'Cancelled' && test.status !== 'Completed' && (
            <button className="btn btn-success btn-sm" onClick={onEnterResult}>
              <MdEdit /> Enter Results
            </button>
          )}
          {test.status === 'Completed' && (
            <button className="btn btn-secondary btn-sm" onClick={onEnterResult}>
              <MdEdit /> Edit Results
            </button>
          )}
          {!hasFile && test.status !== 'Cancelled' && (
            <button className="btn btn-secondary btn-sm" onClick={onUpload}>
              <MdUploadFile /> Upload File
            </button>
          )}
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════
   UPLOAD FILE MODAL
═══════════════════════════════════ */
function UploadModal({ test, onClose, onUploaded }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { toast.error('File must be under 5MB'); return; }
    setFile(f);
    if (f.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => setPreview(ev.target.result);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  };

  const handleUpload = async () => {
    if (!file) { toast.error('Select a file first'); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await API.post(`/lab-tests/${test._id}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('File uploaded!');
      onUploaded();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally { setUploading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <div>
            <div className="modal-title">Upload Result File</div>
            <div className="text-muted text-sm">{test.testName} · {test.patientName}</div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>

        <div style={{ border: '2px dashed var(--border)', borderRadius: 12, padding: 24, textAlign: 'center', marginBottom: 16, cursor: 'pointer', position: 'relative' }}
          onClick={() => document.getElementById('lab-file-input').click()}>
          <input id="lab-file-input" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp"
            style={{ display: 'none' }} onChange={handleFile} />
          {preview ? (
            <img src={preview} alt="preview" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8 }} />
          ) : file ? (
            <div>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📄</div>
              <div style={{ fontWeight: 700 }}>{file.name}</div>
              <div className="text-muted text-sm">{bytes(file.size)}</div>
            </div>
          ) : (
            <>
              <MdUploadFile size={40} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Click to select file</div>
              <div className="text-muted text-sm">PDF, JPEG, PNG, WebP · Max 5MB</div>
            </>
          )}
        </div>

        {file && (
          <div style={{ background: 'var(--bg-tertiary)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>
            <div style={{ fontWeight: 600 }}>{file.name}</div>
            <div className="text-muted">{bytes(file.size)} · {file.type}</div>
          </div>
        )}

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleUpload} disabled={!file || uploading}>
            <MdUploadFile /> {uploading ? 'Uploading...' : 'Upload File'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════
   MAIN PAGE
═══════════════════════════════════ */
export default function LabTests() {
  const [tests, setTests] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');

  const [orderModal, setOrderModal] = useState(false);
  const [viewTest, setViewTest] = useState(null);
  const [resultModal, setResultModal] = useState(null);
  const [uploadModal, setUploadModal] = useState(null);

  const fetchTests = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      if (status) params.status = status;
      if (category) params.category = category;
      const { data } = await API.get('/lab-tests', { params });
      setTests(data.tests);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch { toast.error('Failed to load lab tests'); }
    finally { setLoading(false); }
  }, [page, search, status, category]);

  useEffect(() => { fetchTests(); }, [fetchTests]);
  useEffect(() => {
    API.get('/lab-tests/stats').then(({ data }) => setStats(data.stats)).catch(() => { });
  }, []);
  useEffect(() => { setPage(1); }, [search, status, category]);

  const openView = async (id) => {
    try {
      const { data } = await API.get(`/lab-tests/${id}`);
      setViewTest(data.test);
    } catch { toast.error('Failed to load'); }
  };

  const handleDownloadFile = () => {
    if (!viewTest?.file?.url) return;
    // Open Cloudinary URL directly in new tab
    window.open(viewTest.file.url, '_blank', 'noopener,noreferrer');
  };

  const handleDeleteFile = async () => {
    if (!confirm('Remove the uploaded file?')) return;
    try {
      await API.delete(`/lab-tests/${viewTest._id}/file`);
      toast.success('File removed');
      afterSave();
    } catch { toast.error('Failed'); }
  };

  const handleCancel = async (id) => {
    if (!confirm('Cancel this lab test?')) return;
    try {
      await API.patch(`/lab-tests/${id}/cancel`);
      toast.success('Test cancelled');
      fetchTests();
      if (viewTest?._id === id) setViewTest(null);
    } catch { toast.error('Failed'); }
  };

  const afterSave = () => {
    setOrderModal(false); setResultModal(null);
    setUploadModal(null); setViewTest(null);
    fetchTests();
    API.get('/lab-tests/stats').then(({ data }) => setStats(data.stats)).catch(() => { });
  };

  const statusTabs = [
    { id: '', label: 'All' },
    { id: 'Ordered', label: 'Ordered' },
    { id: 'Sample Collected', label: 'Sample Collected' },
    { id: 'In Progress', label: 'In Progress' },
    { id: 'Completed', label: 'Completed' },
    { id: 'Cancelled', label: 'Cancelled' },
  ];

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Lab Tests</h1>
          <p>{total} tests total</p>
        </div>
        <button className="btn btn-primary" onClick={() => setOrderModal(true)}>
          <MdAdd /> Order Lab Test
        </button>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom: 20 }}>
        {[
          { label: 'Total Tests', value: stats.total || 0, cls: 'blue' },
          { label: 'Pending', value: stats.ordered || 0, cls: 'yellow' },
          { label: 'Completed', value: stats.completed || 0, cls: 'green' },
          { label: 'Critical', value: stats.critical || 0, cls: 'red' },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <div className={`stat-icon ${s.cls}`}><MdScience /></div>
            <div>
              <div className="stat-value" style={{ fontSize: 24 }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="toolbar" style={{ marginBottom: 10 }}>
          <div className="search-box">
            <MdSearch className="search-icon" />
            <input placeholder="Search by test, patient, doctor, lab..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="form-control" style={{ width: 170 }} value={category}
            onChange={e => setCategory(e.target.value)}>
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
          {statusTabs.map(t => (
            <button key={t.id} className={`pill${status === t.id ? ' active' : ''}`}
              onClick={() => setStatus(t.id)}>{t.label}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card">
        {loading ? (
          <div className="flex-center" style={{ height: 200 }}>
            <ShortLoader/>
          </div>
        ) : tests.length === 0 ? (
          <div className="empty-state">
            <MdScience size={52} style={{ opacity: 0.3, marginBottom: 16 }} />
            <h3>No lab tests found</h3>
            <p>Order your first lab test to get started</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Test</th><th>Patient</th><th>Doctor</th><th>Lab</th>
                  <th>Ordered</th><th>Result</th><th>File</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tests.map(t => (
                  <tr key={t._id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{t.testName}</div>
                      <div className="text-muted text-sm">{t.testCategory}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{t.patientName}</div>
                      <div className="text-muted text-sm">{t.patient?.patientId}</div>
                    </td>
                    <td className="text-sm">{t.orderedBy ? `Dr. ${t.orderedBy}` : '—'}</td>
                    <td className="text-sm">{t.lab || '—'}</td>
                    <td className="text-sm">{fmtDate(t.orderedDate)}</td>
                    <td>
                      {t.result?.interpretation && t.result.interpretation !== 'Pending' ? (
                        <span style={{ color: INTERP_COLOR[t.result.interpretation], fontWeight: 700, fontSize: 13 }}>
                          {t.result.interpretation}
                          {t.result.value ? ` — ${t.result.value} ${t.result.unit || ''}` : ''}
                        </span>
                      ) : t.resultRows?.length > 0 ? (
                        <span className="badge badge-accent">{t.resultRows.length} params</span>
                      ) : (
                        <span className="text-muted text-sm">Pending</span>
                      )}
                    </td>
                    <td>
                      {t.file?.originalName
                        ? <span className="badge badge-success text-sm" style={{ fontSize: 11 }}>📎 {t.file.originalName.slice(0, 12)}...</span>
                        : <span className="text-muted text-sm">—</span>}
                    </td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[t.status] || 'badge-default'}`}>{t.status}</span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button className="btn btn-secondary btn-sm btn-icon"
                          onClick={() => openView(t._id)} title="View"><MdVisibility /></button>
                        {t.status !== 'Cancelled' && (
                          <button className="btn btn-sm btn-icon"
                            style={{ background: 'var(--success-bg)', color: 'var(--success)' }}
                            onClick={() => setResultModal(t)} title="Enter Result"><MdEdit /></button>
                        )}
                        {t.status !== 'Cancelled' && !t.file?.originalName && (
                          <button className="btn btn-secondary btn-sm btn-icon"
                            onClick={() => setUploadModal(t)} title="Upload File"><MdUploadFile /></button>
                        )}
                        {t.status !== 'Cancelled' && t.status !== 'Completed' && (
                          <button className="btn btn-danger btn-sm btn-icon"
                            onClick={() => handleCancel(t._id)} title="Cancel"><MdCancel /></button>
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

      {/* Modals */}
      {orderModal && <OrderModal onClose={() => setOrderModal(false)} onSaved={afterSave} />}

      {resultModal && (
        <ResultModal test={resultModal} onClose={() => setResultModal(null)} onSaved={afterSave} />
      )}

      {uploadModal && (
        <UploadModal test={uploadModal} onClose={() => setUploadModal(null)} onUploaded={afterSave} />
      )}

      {viewTest && (
        <ViewModal
          test={viewTest}
          onClose={() => setViewTest(null)}
          onEnterResult={() => { setResultModal(viewTest); setViewTest(null); }}
          onUpload={() => { setUploadModal(viewTest); setViewTest(null); }}
          onDownloadFile={handleDownloadFile}
          onDeleteFile={handleDeleteFile}
        />
      )}
    </div>
  );
}