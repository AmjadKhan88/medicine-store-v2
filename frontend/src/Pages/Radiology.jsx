import { useState, useEffect, useCallback } from 'react';
import {
  MdAdd, MdClose, MdSearch, MdRefresh,
  MdShare, MdDelete, MdUpload, MdCheck,
  MdArrowBack, MdWarning, MdImage,
  MdZoomIn, MdBarChart,
} from 'react-icons/md';
import toast from 'react-hot-toast';
import API from '../utils/api';
import { useSocket } from '../context/SocketContext';

/* ── helpers ── */
const fmtDate  = d => d ? new Date(d).toLocaleDateString('en-PK', { day:'2-digit', month:'short', year:'numeric' }) : '—';
const fmtTime  = d => d ? new Date(d).toLocaleTimeString('en-PK', { hour:'2-digit', minute:'2-digit' }) : '—';
const todayISO = () => new Date().toISOString().slice(0,10);

const MODALITIES = ['X-Ray','Ultrasound','CT Scan','MRI','Mammography','Fluoroscopy','Nuclear Medicine','Angiography','Echocardiography','Doppler','DEXA Scan','Other'];
const PRIORITIES = ['Routine','Urgent','STAT','Emergency'];
const LATERALS   = ['Left','Right','Bilateral','N/A'];

const MODALITY_ICONS = {
  'X-Ray':'🩻','Ultrasound':'🔊','CT Scan':'🖥','MRI':'🧲',
  'Mammography':'🎀','Fluoroscopy':'💡','Angiography':'❤️‍🩹',
  'Echocardiography':'💓','Doppler':'🌊','DEXA Scan':'🦴','Other':'📋',
};

const STATUS_CFG = {
  'Ordered':         { bg:'#dbeafe', color:'#3b82f6' },
  'In Progress':     { bg:'#fef3c7', color:'#f59e0b' },
  'Images Uploaded': { bg:'#e0e7ff', color:'#6366f1' },
  'Reported':        { bg:'#d1fae5', color:'#10b981' },
  'Verified':        { bg:'#bbf7d0', color:'#16a34a' },
  'Cancelled':       { bg:'#f3f4f6', color:'#6b7280' },
};

const PRIORITY_CFG = {
  Routine:   { color:'#64748b', bg:'#f1f5f9' },
  Urgent:    { color:'#f59e0b', bg:'#fef3c7' },
  STAT:      { color:'#ef4444', bg:'#fee2e2' },
  Emergency: { color:'#dc2626', bg:'#fecaca' },
};

/* ════════════════════════════════
   ORDER STUDY MODAL
════════════════════════════════ */
function OrderModal({ onClose, onOrdered }) {
  const [patients, setPatients] = useState([]);
  const [pSearch,  setPSearch]  = useState('');
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({
    modality: 'X-Ray', studyType: '', bodyPart: '',
    laterality: 'N/A', contrast: false, contrastAgent: '',
    clinicalHistory: '', referredBy: '', priority: 'Routine',
    studyDate: todayISO(), radiologist: '', notes: '', cost: '',
  });
  const [saving, setSaving] = useState(false);
  const fld = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const STUDY_SUGGESTIONS = {
    'X-Ray':          ['Chest PA View','Chest Lateral','Abdomen Erect','KUB','Spine Lumbar','Wrist AP/Lat','Knee AP/Lat','Hip AP','Skull AP/Lat','Hand AP'],
    'Ultrasound':     ['USG Abdomen','USG Pelvis','USG Thyroid','USG Liver','USG Kidney','USG Breast','USG Scrotum','USG Obstetric'],
    'CT Scan':        ['CT Brain Plain','CT Brain Contrast','CT Chest','CT Abdomen Pelvis','CT Spine','CT KUB','CT Angiography'],
    'MRI':            ['MRI Brain','MRI Spine Lumbar','MRI Spine Cervical','MRI Knee','MRI Shoulder','MRI Abdomen'],
    'Echocardiography':['2D Echo','Doppler Echo','Trans-oesophageal Echo'],
    'Doppler':        ['Carotid Doppler','Lower Limb Venous Doppler','Renal Doppler'],
    'Mammography':    ['Bilateral Mammography','Unilateral Mammography'],
    'Other':          [],
  };

  useEffect(() => {
    if (pSearch.length < 2) { setPatients([]); return; }
    API.get('/patients', { params: { search: pSearch, limit: 6 } })
      .then(({ data }) => setPatients(data.patients || []))
      .catch(() => {});
  }, [pSearch]);

  const suggestions = STUDY_SUGGESTIONS[form.modality] || [];

  const handleOrder = async () => {
    if (!selected || !form.studyType) { toast.error('Patient and study type required'); return; }
    setSaving(true);
    try {
      await API.post('/radiology', { ...form, patientId: selected._id, contrast: !!form.contrast, cost: Number(form.cost || 0) });
      toast.success(`${form.modality} study ordered!`);
      onOrdered();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <div className="modal-title">Order Radiology Study</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><MdClose /></button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Left */}
          <div>
            {/* Patient */}
            <div className="form-group">
              <label className="form-label required">Patient</label>
              {selected ? (
                <div style={{ background: 'var(--bg-tertiary)', borderRadius: 10, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{selected.name}</div>
                    <div className="text-muted text-sm">{selected.patientId} · Age {selected.age}</div>
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={() => { setSelected(null); setPSearch(''); }}>Change</button>
                </div>
              ) : (
                <div style={{ position: 'relative' }}>
                  <div className="input-group">
                    <MdSearch className="input-icon" />
                    <input className="form-control" placeholder="Search patient..." value={pSearch} onChange={e => setPSearch(e.target.value)} autoFocus />
                  </div>
                  {patients.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 10, zIndex: 100, boxShadow: 'var(--shadow-lg)', marginTop: 4 }}>
                      {patients.map(p => (
                        <div key={p._id} style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border-light)' }}
                          onMouseDown={() => { setSelected(p); setPSearch(''); setPatients([]); }}>
                          <div style={{ fontWeight: 600 }}>{p.name}</div>
                          <div className="text-muted text-sm">{p.patientId} · {p.age}y · {p.gender}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modality */}
            <div className="form-group">
              <label className="form-label required">Modality</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
                {MODALITIES.slice(0, 8).map(m => (
                  <button key={m}
                    onClick={() => setForm(p => ({ ...p, modality: m, studyType: '' }))}
                    style={{
                      padding: '8px 4px', borderRadius: 10, cursor: 'pointer', fontSize: 11,
                      background: form.modality === m ? 'var(--accent)' : 'var(--bg-tertiary)',
                      color:      form.modality === m ? '#fff' : 'var(--text-primary)',
                      border: `2px solid ${form.modality === m ? 'var(--accent)' : 'var(--border)'}`,
                      fontWeight: 600, textAlign: 'center',
                    }}>
                    <div style={{ fontSize: 18, marginBottom: 2 }}>{MODALITY_ICONS[m]}</div>
                    {m}
                  </button>
                ))}
              </div>
              {/* Remaining modalities dropdown */}
              <select className="form-control" style={{ marginTop: 8 }}
                value={MODALITIES.slice(8).includes(form.modality) ? form.modality : ''}
                onChange={e => e.target.value && setForm(p => ({ ...p, modality: e.target.value, studyType: '' }))}>
                <option value="">More modalities...</option>
                {MODALITIES.slice(8).map(m => <option key={m}>{m}</option>)}
              </select>
            </div>

            {/* Study type */}
            <div className="form-group">
              <label className="form-label required">Study Type</label>
              <input className="form-control" value={form.studyType} onChange={fld('studyType')} placeholder="e.g. Chest PA View" list="study-suggestions" />
              <datalist id="study-suggestions">
                {suggestions.map(s => <option key={s} value={s} />)}
              </datalist>
              {suggestions.length > 0 && (
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                  {suggestions.slice(0, 5).map(s => (
                    <button key={s} className="pill" style={{ fontSize: 11 }}
                      onClick={() => setForm(p => ({ ...p, studyType: s }))}>
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Body Part</label>
                <input className="form-control" value={form.bodyPart} onChange={fld('bodyPart')} placeholder="Chest, Abdomen..." />
              </div>
              <div className="form-group">
                <label className="form-label">Laterality</label>
                <select className="form-control" value={form.laterality} onChange={fld('laterality')}>
                  {LATERALS.map(l => <option key={l}>{l}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Right */}
          <div>
            {/* Priority */}
            <div className="form-group">
              <label className="form-label">Priority</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {PRIORITIES.map(p => {
                  const cfg = PRIORITY_CFG[p];
                  return (
                    <button key={p}
                      onClick={() => setForm(f => ({ ...f, priority: p }))}
                      style={{
                        flex: 1, padding: '8px 0', borderRadius: 10, cursor: 'pointer',
                        background: form.priority === p ? cfg.color : cfg.bg,
                        color:      form.priority === p ? '#fff' : cfg.color,
                        border: `2px solid ${cfg.color}`,
                        fontWeight: 700, fontSize: 11,
                      }}>
                      {p === 'STAT' ? '🚨' : p === 'Emergency' ? '🚑' : p === 'Urgent' ? '⚡' : ''} {p}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Study Date</label>
              <input className="form-control" type="date" value={form.studyDate} onChange={fld('studyDate')} />
            </div>

            <div className="form-group">
              <label className="form-label">Referred By (Doctor)</label>
              <input className="form-control" value={form.referredBy} onChange={fld('referredBy')} placeholder="Dr. Ahmed Khan" />
            </div>

            <div className="form-group">
              <label className="form-label">Clinical History / Indication</label>
              <textarea className="form-control" rows={3} value={form.clinicalHistory} onChange={fld('clinicalHistory')}
                placeholder="Reason for study, relevant symptoms, previous findings..." />
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, marginBottom: 12 }}>
              <input type="checkbox" checked={form.contrast} onChange={e => setForm(p => ({ ...p, contrast: e.target.checked }))} />
              <span style={{ fontWeight: 600 }}>Contrast study</span>
            </label>

            {form.contrast && (
              <div className="form-group">
                <label className="form-label">Contrast Agent</label>
                <input className="form-control" value={form.contrastAgent} onChange={fld('contrastAgent')} placeholder="Omnipaque 300..." />
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Radiologist</label>
                <input className="form-control" value={form.radiologist} onChange={fld('radiologist')} placeholder="Dr. Radiologist" />
              </div>
              <div className="form-group">
                <label className="form-label">Cost (₨)</label>
                <input className="form-control" type="number" value={form.cost} onChange={fld('cost')} placeholder="0" />
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleOrder} disabled={saving || !selected || !form.studyType}>
            {saving ? 'Ordering...' : <><MdAdd /> Order Study</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════
   UPLOAD IMAGES MODAL
════════════════════════════════ */
function UploadModal({ study, onClose, onUploaded }) {
  const [files,   setFiles]   = useState([]);
  const [previews,setPreviews]= useState([]);
  const [titles,  setTitles]  = useState([]);
  const [descs,   setDescs]   = useState([]);
  const [uploading,setUploading]=useState(false);

  const handleFiles = e => {
    const selected = Array.from(e.target.files);
    if (selected.length + files.length > 10) { toast.error('Max 10 images per upload'); return; }
    const oversized = selected.filter(f => f.size > 20 * 1024 * 1024);
    if (oversized.length) { toast.error('Each file must be under 20MB'); return; }

    const newPreviews = selected.map(f => {
      if (f.type.startsWith('image/')) {
        return URL.createObjectURL(f);
      }
      return null;
    });

    setFiles(p => [...p, ...selected]);
    setPreviews(p => [...p, ...newPreviews]);
    setTitles(p => [...p, ...selected.map((f, i) => `Image ${files.length + i + 1}`)]);
    setDescs(p =>  [...p, ...selected.map(() => '')]);
  };

  const removeFile = idx => {
    setFiles(p    => p.filter((_,i) => i !== idx));
    setPreviews(p => p.filter((_,i) => i !== idx));
    setTitles(p   => p.filter((_,i) => i !== idx));
    setDescs(p    => p.filter((_,i) => i !== idx));
  };

  const handleUpload = async () => {
    if (!files.length) { toast.error('Select at least one image'); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      files.forEach(f => fd.append('files', f));
      fd.append('titles', JSON.stringify(titles));
      fd.append('descs',  JSON.stringify(descs));
      await API.post(`/radiology/${study._id}/images`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(`${files.length} image(s) uploaded!`);
      onUploaded();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally { setUploading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <div>
            <div className="modal-title">Upload Images</div>
            <div className="text-muted text-sm">{study.studyNumber} · {study.modality} — {study.studyType}</div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><MdClose /></button>
        </div>

        {/* Drop zone */}
        <div
          style={{ border: '2px dashed var(--border)', borderRadius: 12, padding: 24, textAlign: 'center', cursor: 'pointer', marginBottom: 16 }}
          onClick={() => document.getElementById('radiology-files').click()}>
          <input id="radiology-files" type="file" multiple accept="image/*,.pdf,.dcm"
            style={{ display: 'none' }} onChange={handleFiles} />
          <MdImage size={40} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Click to select images</div>
          <div className="text-muted text-sm">JPG, PNG, DICOM, PDF · Max 20MB each · Up to 10 files</div>
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16, maxHeight: 300, overflowY: 'auto' }}>
            {files.map((file, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg-tertiary)', borderRadius: 10, padding: '10px 14px' }}>
                {/* Preview */}
                <div style={{ width: 52, height: 52, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {previews[i]
                    ? <img src={previews[i]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontSize: 22 }}>📄</span>}
                </div>
                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <label className="form-label" style={{ fontSize: 10 }}>View Title</label>
                    <input className="form-control" style={{ fontSize: 12 }}
                      value={titles[i]} onChange={e => setTitles(p => p.map((v, j) => j === i ? e.target.value : v))} />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: 10 }}>Description</label>
                    <input className="form-control" style={{ fontSize: 12 }}
                      value={descs[i]} onChange={e => setDescs(p => p.map((v, j) => j === i ? e.target.value : v))}
                      placeholder="AP view, post-op..." />
                  </div>
                </div>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => removeFile(i)}>
                  <MdDelete size={15} style={{ color: 'var(--danger)' }} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleUpload} disabled={uploading || !files.length}>
            {uploading ? `Uploading ${files.length} file(s)...` : <><MdUpload /> Upload {files.length} Image(s)</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════
   REPORT MODAL
════════════════════════════════ */
function ReportModal({ study, onClose, onReported }) {
  const existing = study.report || {};
  const [form, setForm] = useState({
    technique:      existing.technique      || '',
    findings:       existing.findings       || '',
    impression:     existing.impression     || '',
    recommendation: existing.recommendation || '',
    isNormal:       existing.isNormal       !== false,
    isCritical:     existing.isCritical     || false,
    criticalAlert:  existing.criticalAlert  || '',
    radiologist:    study.radiologist       || '',
  });
  const [saving, setSaving] = useState(false);
  const fld = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const chk = k => e => setForm(p => ({ ...p, [k]: e.target.checked }));

  const handleSubmit = async () => {
    if (!form.findings || !form.impression) { toast.error('Findings and impression required'); return; }
    setSaving(true);
    try {
      await API.post(`/radiology/${study._id}/report`, form);
      toast.success('Report submitted!');
      onReported();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg" style={{ maxHeight: '88vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <div>
            <div className="modal-title">Submit Radiology Report</div>
            <div className="text-muted text-sm">{study.studyNumber} · {study.patientName} · {study.modality}</div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><MdClose /></button>
        </div>

        <div className="form-group">
          <label className="form-label">Radiologist Name</label>
          <input className="form-control" value={form.radiologist} onChange={fld('radiologist')} placeholder="Dr. Radiologist Name" />
        </div>

        <div className="form-group">
          <label className="form-label">Technique</label>
          <input className="form-control" value={form.technique} onChange={fld('technique')}
            placeholder="e.g. PA and lateral views obtained in full inspiration..." />
        </div>

        <div className="form-group">
          <label className="form-label required">Findings</label>
          <textarea className="form-control" rows={5} value={form.findings} onChange={fld('findings')}
            placeholder="Detailed radiological findings — describe what is seen systematically..." />
        </div>

        <div className="form-group">
          <label className="form-label required">Impression / Conclusion</label>
          <textarea className="form-control" rows={3} value={form.impression} onChange={fld('impression')}
            placeholder="Summary conclusion and diagnosis..." />
        </div>

        <div className="form-group">
          <label className="form-label">Recommendation</label>
          <textarea className="form-control" rows={2} value={form.recommendation} onChange={fld('recommendation')}
            placeholder="Follow-up imaging, clinical correlation, biopsy, etc." />
        </div>

        {/* Normal / Critical toggles */}
        <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
            <input type="checkbox" checked={form.isNormal} onChange={chk('isNormal')} />
            <span style={{ fontWeight: 600, color: form.isNormal ? '#10b981' : 'inherit' }}>
              ✓ Normal Study
            </span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
            <input type="checkbox" checked={form.isCritical} onChange={e => setForm(p => ({ ...p, isCritical: e.target.checked, isNormal: e.target.checked ? false : p.isNormal }))} />
            <span style={{ fontWeight: 700, color: form.isCritical ? '#ef4444' : 'inherit' }}>
              🚨 Critical Finding — Alert Immediately
            </span>
          </label>
        </div>

        {form.isCritical && (
          <div className="form-group" style={{ background: '#fff5f5', border: '1px solid #fca5a5', borderRadius: 10, padding: 14 }}>
            <label className="form-label" style={{ color: '#ef4444' }}>Critical Finding Description</label>
            <input className="form-control" value={form.criticalAlert} onChange={fld('criticalAlert')}
              placeholder="e.g. Tension pneumothorax right side — immediate clinical attention required" />
            <div className="form-hint" style={{ color: '#ef4444' }}>
              This will trigger an instant push notification to all doctors.
            </div>
          </div>
        )}

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit}
            disabled={saving || !form.findings || !form.impression}>
            {saving ? 'Submitting...' : <><MdCheck /> Submit Report</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════
   SHARE LINK MODAL
════════════════════════════════ */
function ShareModal({ study, onClose, onShared }) {
  const [expiryDays, setExpiryDays] = useState(7);
  const [shareUrl,   setShareUrl]   = useState(study.shareEnabled ? `${window.location.origin}/radiology/${study.shareToken}` : '');
  const [loading,    setLoading]    = useState(false);
  const [copied,     setCopied]     = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const { data } = await API.post(`/radiology/${study._id}/share`, { expiryDays });
      const url = `${window.location.origin}/radiology/${data.shareToken}`;
      setShareUrl(url);
      toast.success('Share link generated!');
      onShared();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setLoading(false); }
  };

  const revoke = async () => {
    if (!confirm('Revoke share link? The referring doctor will no longer be able to access this report.')) return;
    setLoading(true);
    try {
      await API.delete(`/radiology/${study._id}/share`);
      setShareUrl('');
      toast.success('Share link revoked');
      onShared();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setLoading(false); }
  };

  const copy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Link copied!');
  };

  const openWhatsApp = () => {
    const msg = encodeURIComponent(`Radiology Report: ${study.modality} — ${study.studyType}\nPatient: ${study.patientName}\nView: ${shareUrl}`);
    window.open(`https://wa.me/?text=${msg}`, '_blank', 'noopener');
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <div>
            <div className="modal-title">Share Radiology Report</div>
            <div className="text-muted text-sm">{study.studyNumber} · {study.patientName}</div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><MdClose /></button>
        </div>

        <div style={{ background: 'var(--bg-tertiary)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>🔗 Secure Share Link</div>
          <div className="text-muted text-sm" style={{ lineHeight: 1.7 }}>
            Generate a read-only link that any doctor can open — no login required.
            The link shows the report and all uploaded images. You can revoke it at any time.
          </div>
        </div>

        {!shareUrl ? (
          <>
            <div className="form-group">
              <label className="form-label">Link Valid For</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[1, 3, 7, 14, 30].map(d => (
                  <button key={d}
                    onClick={() => setExpiryDays(d)}
                    className={`pill${expiryDays === d ? ' active' : ''}`}
                    style={{ flex: 1 }}>
                    {d}d
                  </button>
                ))}
              </div>
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }}
              onClick={generate} disabled={loading}>
              {loading ? 'Generating...' : <><MdShare /> Generate Share Link</>}
            </button>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input className="form-control" value={shareUrl} readOnly style={{ flex: 1, fontSize: 12 }} />
              <button className="btn btn-primary" onClick={copy}>
                {copied ? '✓ Copied!' : 'Copy'}
              </button>
            </div>
            {study.shareExpiresAt && (
              <div className="text-muted text-sm" style={{ marginBottom: 12 }}>
                ⏳ Expires: {fmtDate(study.shareExpiresAt)}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={openWhatsApp}>
                💬 Share via WhatsApp
              </button>
              <button className="btn btn-secondary" style={{ flex: 1 }}
                onClick={() => window.open(shareUrl, '_blank', 'noopener')}>
                🔗 Preview
              </button>
            </div>
            <button className="btn btn-danger btn-sm" style={{ marginTop: 12 }}
              onClick={revoke} disabled={loading}>
              Revoke Link
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════
   STUDY DETAIL
════════════════════════════════ */
function StudyDetail({ studyId, onBack, onRefresh }) {
  const [study,    setStudy]    = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [activeImg,setActiveImg]= useState(0);
  const [activeTab,setTab]      = useState('overview');
  const [uploadModal,  setUploadModal]  = useState(false);
  const [reportModal,  setReportModal]  = useState(false);
  const [shareModal,   setShareModal]   = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await API.get(`/radiology/${studyId}`);
      setStudy(data.study);
    } catch { toast.error('Failed to load study'); }
    finally { setLoading(false); }
  }, [studyId]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleVerify = async () => {
    try {
      await API.patch(`/radiology/${studyId}/verify`);
      toast.success('Study verified!');
      fetch();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleStatusChange = async (status) => {
    try {
      await API.patch(`/radiology/${studyId}/status`, { status });
      toast.success(`Status → ${status}`);
      fetch();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleDeleteImage = async (imageId) => {
    if (!confirm('Delete this image?')) return;
    try {
      await API.delete(`/radiology/${studyId}/images/${imageId}`);
      toast.success('Image deleted');
      fetch();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  if (loading) return <div className="flex-center" style={{ height: 300 }}><div className="text-muted">Loading...</div></div>;
  if (!study)  return null;

  const sc     = STATUS_CFG[study.status] || STATUS_CFG.Ordered;
  const pc     = PRIORITY_CFG[study.priority] || PRIORITY_CFG.Routine;
  const imgs   = study.images || [];
  const curImg = imgs[activeImg];
  const isPDF  = curImg?.file?.mimetype === 'application/pdf';

  const TABS = [
    { id: 'overview', label: 'Overview'                               },
    { id: 'images',   label: `Images (${imgs.length})`               },
    { id: 'report',   label: study.report?.findings ? 'Report ✓' : 'Report' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost btn-icon" onClick={onBack}><MdArrowBack /></button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 24 }}>{MODALITY_ICONS[study.modality] || '📋'}</span>
              <h2 style={{ margin: 0 }}>{study.modality} — {study.studyType}</h2>
              <span style={{ background: sc.bg, color: sc.color, padding: '3px 12px', borderRadius: 99, fontSize: 12, fontWeight: 700 }}>{study.status}</span>
              {study.priority !== 'Routine' && (
                <span style={{ background: pc.bg, color: pc.color, padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
                  {study.priority === 'STAT' ? '🚨' : '⚡'} {study.priority}
                </span>
              )}
            </div>
            <div className="text-muted text-sm">
              {study.studyNumber} · {study.patientName} · {fmtDate(study.studyDate)}
              {study.bodyPart && ` · ${study.bodyPart}`}
              {study.laterality !== 'N/A' && ` (${study.laterality})`}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {study.status === 'In Progress' || study.status === 'Ordered' ? (
            <button className="btn btn-secondary" onClick={() => setUploadModal(true)}>
              <MdUpload /> Upload Images
            </button>
          ) : null}
          {study.status === 'Images Uploaded' && (
            <button className="btn btn-secondary" onClick={() => setUploadModal(true)}>
              <MdUpload /> Add More Images
            </button>
          )}
          {['Images Uploaded', 'Reported'].includes(study.status) && (
            <button className="btn btn-primary" onClick={() => setReportModal(true)}>
              <MdCheck /> {study.report?.findings ? 'Edit Report' : 'Submit Report'}
            </button>
          )}
          {study.status === 'Reported' && (
            <button className="btn btn-success" onClick={handleVerify}>
              <MdCheck /> Verify
            </button>
          )}
          {['Reported', 'Verified'].includes(study.status) && (
            <button className="btn btn-secondary" onClick={() => setShareModal(true)}>
              <MdShare /> {study.shareEnabled ? 'Manage Share' : 'Share'}
            </button>
          )}
          <button className="btn btn-secondary btn-sm" onClick={fetch}><MdRefresh /></button>
        </div>
      </div>

      {/* Critical alert banner */}
      {study.report?.isCritical && (
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 12, padding: '12px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <MdWarning size={24} style={{ color: '#ef4444', flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 800, color: '#dc2626' }}>🚨 CRITICAL FINDING</div>
            <div style={{ fontSize: 13, color: '#991b1b' }}>{study.report.criticalAlert}</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: '10px 16px', background: 'none', border: 'none', borderBottom: activeTab === t.id ? '2px solid var(--accent)' : '2px solid transparent', color: activeTab === t.id ? 'var(--accent)' : 'var(--text-muted)', fontWeight: activeTab === t.id ? 700 : 500, cursor: 'pointer', fontSize: 14, fontFamily: 'var(--font-main)' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="card">
            <div style={{ fontWeight: 700, marginBottom: 12 }}>Patient</div>
            {[
              ['Name',       study.patientName],
              ['Patient ID', study.patient?.patientId],
              ['Age',        study.patient?.age ? `${study.patient.age} years` : null],
              ['Gender',     study.patient?.gender],
              ['Phone',      study.patient?.phone],
            ].filter(([,v]) => v).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-light)', fontSize: 13 }}>
                <span className="text-muted">{k}</span>
                <span style={{ fontWeight: 600 }}>{v}</span>
              </div>
            ))}
          </div>

          <div className="card">
            <div style={{ fontWeight: 700, marginBottom: 12 }}>Study Info</div>
            {[
              ['Modality',         study.modality],
              ['Study Type',       study.studyType],
              ['Body Part',        study.bodyPart],
              ['Laterality',       study.laterality !== 'N/A' ? study.laterality : null],
              ['Contrast',         study.contrast ? `Yes — ${study.contrastAgent || ''}` : 'No'],
              ['Study Date',       fmtDate(study.studyDate)],
              ['Referred By',      study.referredBy],
              ['Radiologist',      study.radiologist],
              ['Cost',             study.cost ? `₨${study.cost.toLocaleString()}` : null],
            ].filter(([,v]) => v).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-light)', fontSize: 13 }}>
                <span className="text-muted">{k}</span>
                <span style={{ fontWeight: 600 }}>{v}</span>
              </div>
            ))}
          </div>

          {study.clinicalHistory && (
            <div className="card">
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Clinical History</div>
              <div style={{ fontSize: 14, lineHeight: 1.7 }}>{study.clinicalHistory}</div>
            </div>
          )}

          {/* Share status */}
          {study.shareEnabled && (
            <div className="card" style={{ background: '#f0fdf4', border: '1px solid #86efac' }}>
              <div style={{ fontWeight: 700, color: '#16a34a', marginBottom: 8 }}>🔗 Shared Report</div>
              <div style={{ fontSize: 13, color: '#166534' }}>
                This report is currently shared via a secure link.
                {study.shareExpiresAt && ` Expires: ${fmtDate(study.shareExpiresAt)}`}
              </div>
              <button className="btn btn-secondary btn-sm" style={{ marginTop: 10 }}
                onClick={() => setShareModal(true)}>
                Manage Share Link
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── IMAGES ── */}
      {activeTab === 'images' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontWeight: 700 }}>{imgs.length} image(s)</div>
            <button className="btn btn-primary btn-sm" onClick={() => setUploadModal(true)}>
              <MdUpload /> Upload More
            </button>
          </div>

          {imgs.length === 0 ? (
            <div className="empty-state">
              <MdImage size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
              <h3>No images uploaded yet</h3>
              <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setUploadModal(true)}>
                <MdUpload /> Upload Images
              </button>
            </div>
          ) : (
            <div>
              {/* Main viewer */}
              <div style={{ background: '#000', borderRadius: 16, overflow: 'hidden', marginBottom: 12, minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                {isPDF ? (
                  <div style={{ textAlign: 'center', color: '#fff' }}>
                    <div style={{ fontSize: 64, marginBottom: 16 }}>📄</div>
                    <a href={curImg.file.url} target="_blank" rel="noopener noreferrer"
                      style={{ background: '#0ea5e9', color: '#fff', padding: '12px 28px', borderRadius: 10, textDecoration: 'none', fontWeight: 700 }}>
                      Open PDF
                    </a>
                  </div>
                ) : curImg ? (
                  <img src={curImg.file.url} alt={curImg.title}
                    style={{ maxWidth: '100%', maxHeight: '60vh', objectFit: 'contain' }} />
                ) : null}

                {/* Fullscreen btn */}
                {curImg && !isPDF && (
                  <a href={curImg.file.url} target="_blank" rel="noopener noreferrer"
                    style={{ position: 'absolute', bottom: 12, right: 12, background: 'rgba(255,255,255,0.2)', color: '#fff', padding: '6px 14px', borderRadius: 8, textDecoration: 'none', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <MdZoomIn size={16} /> Full Size
                  </a>
                )}
              </div>

              {/* Image info */}
              {curImg && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, padding: '8px 12px', background: 'var(--bg-tertiary)', borderRadius: 10 }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{curImg.title}</div>
                    {curImg.description && <div className="text-muted text-sm">{curImg.description}</div>}
                  </div>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDeleteImage(curImg._id)}>
                    <MdDelete size={15} style={{ color: 'var(--danger)' }} />
                  </button>
                </div>
              )}

              {/* Thumbnails */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px,1fr))', gap: 8 }}>
                {imgs.map((img, i) => (
                  <div key={img._id} onClick={() => setActiveImg(i)}
                    style={{ height: 80, borderRadius: 10, overflow: 'hidden', cursor: 'pointer', border: `3px solid ${activeImg === i ? 'var(--accent)' : 'transparent'}`, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {img.file.mimetype === 'application/pdf'
                      ? <div style={{ color: '#fff', fontSize: 24 }}>📄</div>
                      : <img src={img.file.url} alt={img.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── REPORT ── */}
      {activeTab === 'report' && (
        <div>
          {!study.report?.findings ? (
            <div className="empty-state">
              <MdCheck size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
              <h3>No report submitted yet</h3>
              {imgs.length > 0 && (
                <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setReportModal(true)}>
                  Submit Report
                </button>
              )}
              {imgs.length === 0 && <p>Upload images first before submitting a report.</p>}
            </div>
          ) : (
            <div className="card" style={{ maxWidth: 760 }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800 }}>Radiology Report</div>
                  <div className="text-muted text-sm">{study.studyNumber} · {fmtDate(study.reportDate)}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                  <span style={{ background: study.report.isNormal ? '#d1fae5' : '#fee2e2', color: study.report.isNormal ? '#10b981' : '#ef4444', padding: '4px 14px', borderRadius: 99, fontSize: 12, fontWeight: 700 }}>
                    {study.report.isNormal ? '✓ Normal' : '⚠ Abnormal'}
                  </span>
                  {study.status === 'Verified' && (
                    <span style={{ background: '#bbf7d0', color: '#16a34a', padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>✓ Verified</span>
                  )}
                </div>
              </div>

              {study.report.isCritical && (
                <div style={{ background: '#fee2e2', border: '1px solid #ef4444', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
                  <div style={{ fontWeight: 800, color: '#ef4444' }}>🚨 CRITICAL FINDING</div>
                  <div style={{ fontSize: 13, color: '#dc2626', marginTop: 4 }}>{study.report.criticalAlert}</div>
                </div>
              )}

              {[
                { title: 'Technique',       value: study.report.technique       },
                { title: 'Findings',        value: study.report.findings        },
                { title: 'Impression',      value: study.report.impression      },
                { title: 'Recommendation',  value: study.report.recommendation  },
              ].filter(s => s.value).map(({ title, value }) => (
                <div key={title} style={{ marginBottom: 20 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', marginBottom: 8 }}>{title}</div>
                  <div style={{ fontSize: 14, lineHeight: 1.8, whiteSpace: 'pre-wrap', background: 'var(--bg-tertiary)', padding: '12px 16px', borderRadius: 10 }}>{value}</div>
                </div>
              ))}

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, fontSize: 13, color: 'var(--text-muted)' }}>
                Reported by: <strong>{study.radiologist || study.reportedBy?.name || '—'}</strong>
                {study.reportDate && ` · ${fmtDate(study.reportDate)} at ${fmtTime(study.reportDate)}`}
                {study.verifiedBy && ` · Verified by ${study.verifiedBy.name}`}
              </div>

              <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setReportModal(true)}>
                  <MdCheck /> Edit Report
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => setShareModal(true)}>
                  <MdShare /> Share with Referring Doctor
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {uploadModal && (
        <UploadModal study={study} onClose={() => setUploadModal(false)}
          onUploaded={() => { setUploadModal(false); fetch(); onRefresh(); }} />
      )}
      {reportModal && (
        <ReportModal study={study} onClose={() => setReportModal(false)}
          onReported={() => { setReportModal(false); fetch(); onRefresh(); }} />
      )}
      {shareModal && (
        <ShareModal study={study} onClose={() => setShareModal(false)}
          onShared={() => { setShareModal(false); fetch(); }} />
      )}
    </div>
  );
}

/* ════════════════════════════════
   MAIN PAGE
════════════════════════════════ */
export default function Radiology() {
  const [studies,    setStudies]    = useState([]);
  const [stats,      setStats]      = useState({});
  const [total,      setTotal]      = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page,       setPage]       = useState(1);
  const [loading,    setLoading]    = useState(true);

  const [statusFilter,   setStatusFilter]   = useState('');
  const [modalityFilter, setModalityFilter] = useState('');
  const [search,         setSearch]         = useState('');
  const [detailId,       setDetailId]       = useState(null);
  const [orderModal,     setOrderModal]      = useState(false);

  const { on } = useSocket() || {};

  const fetchStudies = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (statusFilter)   params.status   = statusFilter;
      if (modalityFilter) params.modality = modalityFilter;
      if (search)         params.search   = search;
      const { data } = await API.get('/radiology', { params });
      setStudies(data.studies);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch { toast.error('Failed to load studies'); }
    finally { setLoading(false); }
  }, [statusFilter, modalityFilter, search, page]);

  const fetchStats = useCallback(() => {
    API.get('/radiology/stats').then(({ data }) => setStats(data.stats)).catch(() => {});
  }, []);

  useEffect(() => { fetchStudies(); fetchStats(); }, [fetchStudies]);
  useEffect(() => { setPage(1); }, [statusFilter, modalityFilter, search]);

  useEffect(() => {
    if (!on) return;
    const unsubs = [
      on('radiology:urgent', (data) => {
        toast.error(`🚨 STAT Radiology: ${data.studyType} — ${data.patientName}`, { duration: 8000 });
        fetchStudies(); fetchStats();
      }),
      on('radiology:imagesUploaded', (data) => {
        toast.success(`🖼 Images uploaded for ${data.patientName} (${data.modality})`);
        fetchStudies(); fetchStats();
      }),
      on('radiology:critical', (data) => {
        toast.error(`🚨 CRITICAL FINDING: ${data.studyType} — ${data.patientName}\n${data.criticalAlert}`, { duration: 10000 });
        fetchStudies(); fetchStats();
      }),
    ];
    return () => unsubs.forEach(u => u && u());
  }, [on, fetchStudies, fetchStats]);

  if (detailId) {
    return (
      <StudyDetail
        studyId={detailId}
        onBack={() => setDetailId(null)}
        onRefresh={() => { fetchStudies(); fetchStats(); }}
      />
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>Radiology (PACS-lite)</h1>
          <p>{stats.today || 0} today · {stats.criticalPending || 0} critical pending · {stats.totalStudies || 0} total</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => { fetchStudies(); fetchStats(); }}><MdRefresh /></button>
          <button className="btn btn-primary" onClick={() => setOrderModal(true)}>
            <MdAdd /> Order Study
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom: 20 }}>
        {[
          { label: 'Ordered',         value: stats.ordered         || 0, color: '#3b82f6', icon: '📋' },
          { label: 'Images Uploaded', value: stats.imagesUploaded  || 0, color: '#6366f1', icon: '🖼' },
          { label: 'Reported',        value: stats.reported        || 0, color: '#10b981', icon: '✅' },
          { label: 'Verified',        value: stats.verified        || 0, color: '#16a34a', icon: '✓' },
          { label: 'Critical Pending',value: stats.criticalPending || 0, color: '#ef4444', icon: '🚨' },
          { label: 'Today',           value: stats.today           || 0, color: '#f59e0b', icon: '📅' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background: s.color + '20', fontSize: 20 }}>{s.icon}</div>
            <div>
              <div className="stat-value" style={{ color: s.color, fontSize: 24 }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Modality breakdown */}
      {stats.byModality?.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>By Modality:</span>
            {stats.byModality.map(m => (
              <button key={m._id}
                className={`pill${modalityFilter === m._id ? ' active' : ''}`}
                onClick={() => setModalityFilter(modalityFilter === m._id ? '' : m._id)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                {MODALITY_ICONS[m._id]} {m._id} ({m.count})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-box" style={{ flex: 1, minWidth: 200 }}>
            <MdSearch className="search-icon" />
            <input placeholder="Search patient, study type, radiologist, study number..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="form-control" style={{ width: 180 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            {Object.keys(STATUS_CFG).map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Studies list */}
      {loading ? (
        <div className="flex-center" style={{ height: 200 }}><div className="text-muted">Loading...</div></div>
      ) : studies.length === 0 ? (
        <div className="empty-state">
          <MdImage size={52} style={{ opacity: 0.3, marginBottom: 16 }} />
          <h3>No radiology studies found</h3>
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setOrderModal(true)}>
            <MdAdd /> Order First Study
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {studies.map(s => {
            const sc  = STATUS_CFG[s.status]   || STATUS_CFG.Ordered;
            const pc  = PRIORITY_CFG[s.priority]|| PRIORITY_CFG.Routine;
            const isCritical = s.report?.isCritical && s.status === 'Reported';

            return (
              <div key={s._id}
                onClick={() => setDetailId(s._id)}
                style={{
                  border:       `1px solid ${isCritical ? '#fca5a5' : 'var(--border)'}`,
                  borderLeft:   `5px solid ${isCritical ? '#ef4444' : sc.color}`,
                  borderRadius: 14,
                  padding:      '14px 18px',
                  background:   isCritical ? '#fff9f9' : 'var(--card-bg)',
                  cursor:       'pointer',
                  transition:   'transform 0.15s',
                  display:      'grid',
                  gridTemplateColumns: '60px 1fr auto',
                  gap:          16,
                  alignItems:   'center',
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateX(4px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'none'}
              >
                {/* Modality icon */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 32 }}>{MODALITY_ICONS[s.modality] || '📋'}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, fontWeight: 600 }}>{s.modality}</div>
                </div>

                {/* Info */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                    <span style={{ fontWeight: 800, fontSize: 15 }}>{s.studyType}</span>
                    <span style={{ background: sc.bg, color: sc.color, padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>{s.status}</span>
                    {s.priority !== 'Routine' && (
                      <span style={{ background: pc.bg, color: pc.color, padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
                        {s.priority === 'STAT' ? '🚨' : '⚡'} {s.priority}
                      </span>
                    )}
                    {isCritical && (
                      <span style={{ background: '#fee2e2', color: '#ef4444', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 800 }}>
                        🚨 CRITICAL
                      </span>
                    )}
                    {s.shareEnabled && (
                      <span style={{ background: '#d1fae5', color: '#10b981', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
                        🔗 Shared
                      </span>
                    )}
                    <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{s.studyNumber}</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                    <span><strong>👤</strong> {s.patientName}</span>
                    <span><strong>📅</strong> {fmtDate(s.studyDate)}</span>
                    {s.bodyPart && <span><strong>📍</strong> {s.bodyPart}{s.laterality !== 'N/A' ? ` (${s.laterality})` : ''}</span>}
                    {s.referredBy && <span><strong>👨‍⚕️</strong> Dr. {s.referredBy}</span>}
                    {s.radiologist && <span><strong>🔬</strong> {s.radiologist}</span>}
                    <span><strong>🖼</strong> {s.imageCount || 0} images</span>
                  </div>
                </div>

                {/* Right */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  {s.cost > 0 && <div style={{ fontWeight: 700, color: 'var(--accent)' }}>₨{s.cost.toLocaleString()}</div>}
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>View →</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination" style={{ marginTop: 16 }}>
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} className={page === p ? 'active' : ''} onClick={() => setPage(p)}>{p}</button>
          ))}
          <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</button>
        </div>
      )}

      {/* Order modal */}
      {orderModal && (
        <OrderModal
          onClose={() => setOrderModal(false)}
          onOrdered={() => { setOrderModal(false); fetchStudies(); fetchStats(); }}
        />
      )}
    </div>
  );
}