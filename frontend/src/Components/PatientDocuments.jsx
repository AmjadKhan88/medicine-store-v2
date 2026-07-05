import { useState, useEffect } from 'react';
import { MdUploadFile, MdOpenInNew, MdDelete, MdFolderOpen, MdPictureAsPdf, MdImage, MdInsertDriveFile } from 'react-icons/md';
import toast from 'react-hot-toast';
import API from '../utils/api';

const fmtDate  = (d) => d ? new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtBytes = (b) => !b ? '—' : b < 1048576 ? `${(b/1024).toFixed(1)} KB` : `${(b/1048576).toFixed(1)} MB`;

const PATIENT_CATS = ['ID Card','Previous Prescription','Test Result','Insurance Card','Discharge Summary','Referral Letter','Consent Form','Other'];

const FileIcon = ({ mimetype }) => {
  if (mimetype === 'application/pdf')  return <MdPictureAsPdf size={18} style={{ color: '#ef4444' }} />;
  if (mimetype?.startsWith('image/'))  return <MdImage         size={18} style={{ color: '#0ea5e9' }} />;
  return <MdInsertDriveFile size={18} style={{ color: '#94a3b8' }} />;
};

export default function PatientDocuments({ patientId, patientName }) {
  const [docs, setDocs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [file, setFile]       = useState(null);
  const [form, setForm]       = useState({ title: '', category: 'ID Card', notes: '' });
  const [uploading, setUploading] = useState(false);

  const fetch = async () => {
    setLoading(true);
    try {
      const { data } = await API.get(`/documents/patient/${patientId}`);
      setDocs(data.documents);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { if (patientId) fetch(); }, [patientId]);

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) { toast.error('Max 10MB'); return; }
    setFile(f);
    if (!form.title) setForm(p => ({ ...p, title: f.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ') }));
  };

  const handleUpload = async () => {
    if (!file || !form.title) { toast.error('Select file and enter title'); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('entityType', 'patient');
      fd.append('entityId', patientId);
      fd.append('entityName', patientName);
      fd.append('title', form.title);
      fd.append('category', form.category);
      fd.append('notes', form.notes);
      fd.append('tags', JSON.stringify([]));
      await API.post('/documents', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Document uploaded!');
      setShowUpload(false); setFile(null);
      setForm({ title: '', category: 'ID Card', notes: '' });
      fetch();
    } catch (err) { toast.error(err.response?.data?.message || 'Upload failed'); }
    finally { setUploading(false); }
  };

  const handleDelete = async (doc) => {
    if (!confirm(`Delete "${doc.title}"?`)) return;
    try {
      await API.delete(`/documents/${doc._id}`);
      toast.success('Deleted');
      fetch();
    } catch { toast.error('Failed'); }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>Documents ({docs.length})</div>
        <button className="btn btn-secondary btn-sm" onClick={() => setShowUpload(p => !p)}>
          <MdUploadFile size={14} /> Upload
        </button>
      </div>

      {/* Inline upload form */}
      {showUpload && (
        <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 14, background: 'var(--bg-tertiary)' }}>
          <div style={{ border: '2px dashed var(--border)', borderRadius: 8, padding: 16, textAlign: 'center', marginBottom: 12, cursor: 'pointer' }}
            onClick={() => document.getElementById(`pdoc-${patientId}`).click()}>
            <input id={`pdoc-${patientId}`} type="file" style={{ display: 'none' }}
              accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={handleFile} />
            {file ? (
              <div style={{ fontSize: 13, fontWeight: 600 }}>{file.name} · {fmtBytes(file.size)}</div>
            ) : (
              <div className="text-muted text-sm"><MdUploadFile /> Click to select file</div>
            )}
          </div>
          <div className="form-row">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label required">Title</label>
              <input className="form-control" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Category</label>
              <select className="form-control" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                {PATIENT_CATS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2" style={{ marginTop: 10, justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => { setShowUpload(false); setFile(null); }}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={handleUpload} disabled={uploading || !file || !form.title}>
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </div>
      )}

      {/* Document list */}
      {loading ? (
        <div className="text-muted text-sm" style={{ padding: '12px 0' }}>Loading...</div>
      ) : docs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)' }}>
          <MdFolderOpen size={32} style={{ opacity: 0.4, display: 'block', margin: '0 auto 6px' }} />
          <div className="text-sm">No documents uploaded yet</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {docs.map(doc => (
            <div key={doc._id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--bg-secondary)', borderRadius: 10, border: '1px solid var(--border-light)' }}>
              <div style={{ flexShrink: 0 }}><FileIcon mimetype={doc.file.mimetype} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.title}</div>
                <div className="text-muted" style={{ fontSize: 11 }}>{doc.category} · {fmtDate(doc.createdAt)} · {fmtBytes(doc.file.size)}</div>
              </div>
              <button
                onClick={() => window.open(doc.file.url, '_blank', 'noopener,noreferrer')}
                className="btn btn-secondary btn-sm btn-icon" title="Open"
              ><MdOpenInNew size={14} /></button>
              <button
                onClick={() => handleDelete(doc)}
                className="btn btn-danger btn-sm btn-icon" title="Delete"
              ><MdDelete size={14} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}