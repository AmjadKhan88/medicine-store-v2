import { useState, useRef, useCallback } from 'react';
import {
  MdUpload, MdRefresh, MdCheck, MdClose,
  MdAdd, MdCameraAlt, MdContentCopy,
} from 'react-icons/md';
import toast from 'react-hot-toast';
import API from '../utils/api';

export default function PrescriptionOCR() {
  const [image,      setImage]      = useState(null);
  const [preview,    setPreview]    = useState(null);
  const [result,     setResult]     = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [dragOver,   setDragOver]   = useState(false);
  const fileRef = useRef(null);

  const processFile = useCallback((file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please upload an image file'); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error('Image must be under 10MB'); return; }
    setImage(file);
    setPreview(URL.createObjectURL(file));
    setResult(null);
  }, []);

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    processFile(e.dataTransfer.files[0]);
  };

  const handleScan = async () => {
    if (!image) { toast.error('Upload a prescription image first'); return; }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('image', image);
      const { data } = await API.post('/ocr/prescription', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setResult(data.prescription);
      toast.success(`Scanned! Found ${data.prescription.medicines?.length || 0} medicines`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'OCR failed. Try a clearer image.');
    } finally { setLoading(false); }
  };

  const FREQ_MAP = {
    'Once daily':'Once daily','Twice daily':'Twice daily',
    'Three times daily':'Three times daily','Four times daily':'Four times daily',
    'Every 8 hours':'Every 8 hours','As needed':'As needed',
  };

  const copyForBill = () => {
    if (!result?.medicines) return;
    const text = result.medicines.map(m =>
      `${m.name} — ${m.dosage || ''} ${m.frequency || ''} for ${m.duration || ''}`
    ).join('\n');
    navigator.clipboard.writeText(text);
    toast.success('Medicine list copied!');
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>📸 Prescription OCR Scanner</h1>
          <p>Upload a handwritten or printed prescription — Gemini AI extracts medicine details</p>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns: result ? '1fr 1fr' : '1fr', gap:20 }}>
        {/* Upload panel */}
        <div>
          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            style={{
              border:       `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 16, padding: preview ? 0 : 48, cursor:'pointer',
              background:   dragOver ? 'var(--accent-light)' : 'var(--bg-tertiary)',
              textAlign:    'center', overflow:'hidden', transition:'all 0.2s',
              minHeight:    preview ? 0 : 200,
            }}>
            <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }}
              onChange={e => processFile(e.target.files[0])} />

            {preview ? (
              <div style={{ position:'relative' }}>
                <img src={preview} alt="Prescription" style={{ width:'100%', maxHeight:420, objectFit:'contain', display:'block' }} />
                <button
                  onClick={e => { e.stopPropagation(); setImage(null); setPreview(null); setResult(null); }}
                  style={{ position:'absolute', top:8, right:8, background:'rgba(0,0,0,0.6)', color:'#fff', border:'none', borderRadius:'50%', width:28, height:28, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <MdClose size={16} />
                </button>
              </div>
            ) : (
              <>
                <MdCameraAlt size={52} style={{ color:'var(--text-muted)', opacity:0.5, marginBottom:12 }} />
                <div style={{ fontWeight:700, fontSize:16, marginBottom:6 }}>Drop prescription image here</div>
                <div className="text-muted text-sm">or click to upload · JPG, PNG up to 10MB</div>
                <div className="text-muted" style={{ fontSize:11, marginTop:8 }}>
                  Works with handwritten, printed, or photo of prescriptions
                </div>
              </>
            )}
          </div>

          {/* Scan button */}
          <button
            className="btn btn-primary"
            style={{ width:'100%', marginTop:12, padding:'14px', fontSize:16, fontWeight:800 }}
            onClick={handleScan}
            disabled={!image || loading}>
            {loading ? (
              <span>🔍 Gemini AI is reading prescription...</span>
            ) : (
              <><MdUpload size={20} /> Scan with Gemini AI</>
            )}
          </button>

          {loading && (
            <div style={{ textAlign:'center', marginTop:12, color:'var(--text-muted)', fontSize:13 }}>
              ✨ AI is analyzing handwriting and extracting medicine details...
            </div>
          )}
        </div>

        {/* Results panel */}
        {result && (
          <div>
            {/* Header info */}
            <div className="card" style={{ marginBottom:12 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                <div style={{ fontWeight:700 }}>Prescription Details</div>
                <span style={{
                  background: result.confidence === 'high' ? '#d1fae5' : result.confidence === 'medium' ? '#fef3c7' : '#fee2e2',
                  color:      result.confidence === 'high' ? '#10b981' : result.confidence === 'medium' ? '#f59e0b' : '#ef4444',
                  padding:'3px 10px', borderRadius:99, fontSize:11, fontWeight:700, textTransform:'uppercase',
                }}>
                  {result.confidence} confidence
                </span>
              </div>
              {[
                ['Doctor',    result.doctorName],
                ['Patient',   result.patientName],
                ['Date',      result.date],
                ['Diagnosis', result.diagnosis],
              ].filter(([,v])=>v).map(([k,v])=>(
                <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:'1px solid var(--border-light)', fontSize:13 }}>
                  <span className="text-muted">{k}</span>
                  <span style={{ fontWeight:600 }}>{v}</span>
                </div>
              ))}
              {result.instructions && (
                <div style={{ marginTop:8, background:'#f0f9ff', borderRadius:8, padding:'8px 12px', fontSize:13 }}>
                  📋 {result.instructions}
                </div>
              )}
            </div>

            {/* Medicines */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <div style={{ fontWeight:700 }}>Medicines ({result.medicines?.length || 0} found)</div>
              <button className="btn btn-secondary btn-sm" onClick={copyForBill}>
                <MdContentCopy size={13} /> Copy List
              </button>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {(result.medicines || []).map((med, i) => (
                <div key={i} style={{
                  border:`1px solid ${med.foundInInventory ? '#86efac' : 'var(--border)'}`,
                  borderLeft:`4px solid ${med.foundInInventory ? '#10b981' : '#f59e0b'}`,
                  borderRadius:12, padding:'12px 14px',
                  background: med.foundInInventory ? '#f0fdf4' : 'var(--card-bg)',
                }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4 }}>
                    <div style={{ fontWeight:700, fontSize:14 }}>{med.name}</div>
                    <span style={{ fontSize:11, fontWeight:700, background: med.foundInInventory?'#d1fae5':'#fef3c7', color: med.foundInInventory?'#10b981':'#f59e0b', padding:'2px 8px', borderRadius:99, flexShrink:0 }}>
                      {med.foundInInventory ? '✓ In Stock' : '⚠️ Not in inventory'}
                    </span>
                  </div>
                  <div style={{ display:'flex', gap:10, flexWrap:'wrap', fontSize:12, color:'var(--text-muted)' }}>
                    {med.dosage    && <span>💊 {med.dosage}</span>}
                    {med.frequency && <span>🔄 {med.frequency}</span>}
                    {med.duration  && <span>📅 {med.duration}</span>}
                    {med.route     && <span>🛤 {med.route}</span>}
                  </div>
                  {med.notes && <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:4 }}>📝 {med.notes}</div>}

                  {/* Inventory matches */}
                  {med.inventoryMatches?.length > 0 && (
                    <div style={{ marginTop:8, background:'#ecfdf5', borderRadius:8, padding:'6px 10px' }}>
                      <div style={{ fontSize:11, fontWeight:700, color:'#10b981', marginBottom:4 }}>Matched in inventory:</div>
                      {med.inventoryMatches.slice(0,2).map(m => (
                        <div key={m._id} style={{ fontSize:12, color:'#166534' }}>
                          {m.name}{m.genericName ? ` (${m.genericName})` : ''} — Stock: {m.stock} {m.unit} — ₨{m.salePrice}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add to new prescription button */}
            <button className="btn btn-primary" style={{ width:'100%', marginTop:12 }}
              onClick={() => window.location.href = '/app/prescriptions?ocr=1'}>
              <MdAdd /> Create Prescription from This
            </button>
          </div>
        )}
      </div>
    </div>
  );
}