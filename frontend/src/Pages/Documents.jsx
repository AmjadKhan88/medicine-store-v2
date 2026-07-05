import { useState, useEffect, useCallback } from 'react';
import {
  MdUploadFile, MdSearch, MdDelete, MdArchive,
  MdUnarchive, MdOpenInNew, MdEdit, MdFolderOpen,
  MdPictureAsPdf, MdImage, MdInsertDriveFile,
  MdPerson, MdMedicalServices, MdStore, MdLocalShipping,
} from 'react-icons/md';
import toast from 'react-hot-toast';
import API from '../utils/api';

/* ── helpers ── */
const fmtDate  = (d) => d ? new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtBytes = (b) => !b ? '—' : b < 1024 ? `${b} B` : b < 1048576 ? `${(b/1024).toFixed(1)} KB` : `${(b/1048576).toFixed(1)} MB`;

const ENTITY_TYPES = [
  { id: 'patient',  label: 'Patient',  icon: <MdPerson />,         color: '#0ea5e9' },
  { id: 'medicine', label: 'Medicine', icon: <MdMedicalServices />, color: '#8b5cf6' },
  { id: 'store',    label: 'Store',    icon: <MdStore />,           color: '#10b981' },
  { id: 'supplier', label: 'Supplier', icon: <MdLocalShipping />,   color: '#f59e0b' },
];

const CATEGORIES_BY_TYPE = {
  patient:  ['ID Card','Previous Prescription','Test Result','Insurance Card','Discharge Summary','Referral Letter','Consent Form','Other'],
  medicine: ['Batch Certificate','Import License','Quality Report','Drug Registration','Other'],
  store:    ['Drug License','Tax Certificate','Inspection Report','Supplier Agreement','Other'],
  supplier: ['Supplier Agreement','Tax Certificate','Other'],
};

const FILE_ICON = (mimetype) => {
  if (!mimetype) return <MdInsertDriveFile size={22} style={{ color: '#94a3b8' }} />;
  if (mimetype === 'application/pdf')    return <MdPictureAsPdf size={22} style={{ color: '#ef4444' }} />;
  if (mimetype.startsWith('image/'))     return <MdImage         size={22} style={{ color: '#0ea5e9' }} />;
  return <MdInsertDriveFile size={22} style={{ color: '#94a3b8' }} />;
};

/* ═══════════════════════════════════════════
   UPLOAD MODAL
═══════════════════════════════════════════ */
function UploadModal({ onClose, onUploaded, defaultEntityType, defaultEntityId, defaultEntityName }) {
  const [file, setFile]             = useState(null);
  const [preview, setPreview]       = useState(null);
  const [entityType, setEntityType] = useState(defaultEntityType || 'patient');
  const [form, setForm] = useState({
    title:      '',
    category:   'Other',
    notes:      '',
    tags:       '',
    entityId:   defaultEntityId   || '',
    entityName: defaultEntityName || '',
  });

  const [searchQ, setSearchQ]   = useState('');
  const [searchRes, setSearchRes] = useState([]);
  const [uploading, setUploading] = useState(false);

  // Search for entity
  useEffect(() => {
    if (form.entityId || searchQ.length < 2) { setSearchRes([]); return; }
    const endpoint = entityType === 'patient' ? '/patients' : entityType === 'medicine' ? '/medicines' : entityType === 'supplier' ? '/suppliers' : null;
    if (!endpoint) return;
    API.get(endpoint, { params: { search: searchQ, limit: 6 } })
      .then(({ data }) => {
        const items = data.patients || data.medicines || data.suppliers || [];
        setSearchRes(items.map(i => ({ _id: i._id, name: i.name || i.storeName })));
      })
      .catch(() => {});
  }, [searchQ, entityType, form.entityId]);

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) { toast.error('File must be under 10MB'); return; }
    setFile(f);
    if (f.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = ev => setPreview(ev.target.result);
      reader.readAsDataURL(f);
    } else { setPreview(null); }
    // Auto-fill title from filename
    if (!form.title) {
      setForm(p => ({ ...p, title: f.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ') }));
    }
  };

  const fld = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleUpload = async () => {
    if (!file)           { toast.error('Select a file'); return; }
    if (!form.title)     { toast.error('Enter a title'); return; }
    if (!form.entityId)  { toast.error('Select a patient / medicine / supplier'); return; }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      Object.entries(form).forEach(([k, v]) => fd.append(k, k === 'tags' ? JSON.stringify(v.split(',').map(t => t.trim()).filter(Boolean)) : v));
      fd.append('entityType', entityType);
      await API.post('/documents', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(`"${form.title}" uploaded!`);
      onUploaded();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally { setUploading(false); }
  };

  const cats = CATEGORIES_BY_TYPE[entityType] || ['Other'];

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <div className="modal-title">Upload Document</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>

        {/* Entity type selector */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {ENTITY_TYPES.map(et => (
            <button key={et.id}
              className={`pill${entityType === et.id ? ' active' : ''}`}
              onClick={() => { setEntityType(et.id); setForm(p => ({ ...p, entityId: '', entityName: '', category: 'Other' })); setSearchQ(''); }}
              disabled={!!defaultEntityType}
            >
              {et.icon} {et.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Left: file + entity */}
          <div>
            {/* File drop zone */}
            <div
              style={{ border: '2px dashed var(--border)', borderRadius: 12, padding: 20, textAlign: 'center', marginBottom: 14, cursor: 'pointer', position: 'relative' }}
              onClick={() => document.getElementById('doc-file-input').click()}
            >
              <input id="doc-file-input" type="file" style={{ display: 'none' }}
                accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.doc,.docx"
                onChange={handleFile} />
              {preview ? (
                <img src={preview} alt="preview" style={{ maxHeight: 160, maxWidth: '100%', borderRadius: 8 }} />
              ) : file ? (
                <div>
                  {FILE_ICON(file.type)}
                  <div style={{ fontWeight: 700, marginTop: 8 }}>{file.name}</div>
                  <div className="text-muted text-sm">{fmtBytes(file.size)}</div>
                </div>
              ) : (
                <>
                  <MdUploadFile size={36} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
                  <div style={{ fontWeight: 600 }}>Click to select file</div>
                  <div className="text-muted text-sm">PDF, JPG, PNG, WebP · Max 10MB</div>
                </>
              )}
            </div>

            {/* Entity search */}
            {!defaultEntityId && (
              <div className="form-group">
                <label className="form-label required">
                  {ENTITY_TYPES.find(e => e.id === entityType)?.label}
                </label>
                {form.entityId ? (
                  <div className="flex-between" style={{ background: 'var(--bg-tertiary)', borderRadius: 10, padding: '10px 14px' }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{form.entityName}</div>
                    <button className="btn btn-secondary btn-sm" onClick={() => setForm(p => ({ ...p, entityId: '', entityName: '' }))}>
                      Change
                    </button>
                  </div>
                ) : (
                  <div style={{ position: 'relative' }}>
                    <div className="input-group">
                      <MdSearch className="input-icon" />
                      <input className="form-control" placeholder={`Search ${entityType}...`}
                        value={searchQ} onChange={e => setSearchQ(e.target.value)} />
                    </div>
                    {searchRes.length > 0 && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 10, zIndex: 100, boxShadow: 'var(--shadow-lg)', marginTop: 4 }}>
                        {searchRes.map(r => (
                          <div key={r._id} style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border-light)' }}
                            onMouseDown={() => { setForm(p => ({ ...p, entityId: r._id, entityName: r.name })); setSearchQ(''); setSearchRes([]); }}>
                            {r.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: metadata */}
          <div>
            <div className="form-group">
              <label className="form-label required">Document Title</label>
              <input className="form-control" value={form.title} onChange={fld('title')} placeholder="e.g. National ID Card" />
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-control" value={form.category} onChange={fld('category')}>
                {cats.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="form-control" rows={2} value={form.notes} onChange={fld('notes')} placeholder="Any relevant notes..." />
            </div>
            <div className="form-group">
              <label className="form-label">Tags</label>
              <input className="form-control" value={form.tags} onChange={fld('tags')} placeholder="cnic, 2024, expired — comma separated" />
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleUpload} disabled={uploading || !file || !form.title || !form.entityId}>
            <MdUploadFile /> {uploading ? 'Uploading...' : 'Upload Document'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   EDIT MODAL
═══════════════════════════════════════════ */
function EditModal({ doc, onClose, onSaved }) {
  const [form, setForm] = useState({
    title:    doc.title    || '',
    category: doc.category || 'Other',
    notes:    doc.notes    || '',
    tags:     (doc.tags || []).join(', '),
  });
  const [saving, setSaving] = useState(false);
  const fld = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));
  const cats = CATEGORIES_BY_TYPE[doc.entityType] || ['Other'];

  const handleSave = async () => {
    setSaving(true);
    try {
      await API.put(`/documents/${doc._id}`, {
        ...form,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      });
      toast.success('Document updated!');
      onSaved();
    } catch { toast.error('Failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <div className="modal-title">Edit Document</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="form-group">
          <label className="form-label required">Title</label>
          <input className="form-control" value={form.title} onChange={fld('title')} />
        </div>
        <div className="form-group">
          <label className="form-label">Category</label>
          <select className="form-control" value={form.category} onChange={fld('category')}>
            {cats.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Notes</label>
          <textarea className="form-control" rows={2} value={form.notes} onChange={fld('notes')} />
        </div>
        <div className="form-group">
          <label className="form-label">Tags</label>
          <input className="form-control" value={form.tags} onChange={fld('tags')} placeholder="comma separated" />
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════ */
export default function Documents() {
  const [docs, setDocs]         = useState([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading]   = useState(true);
  const [stats, setStats]       = useState({});

  const [search, setSearch]     = useState('');
  const [entityType, setEntityType] = useState('');
  const [category, setCategory] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  const [uploadModal, setUploadModal] = useState(false);
  const [editDoc, setEditDoc]     = useState(null);

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 16, archived: showArchived };
      if (search)     params.search     = search;
      if (entityType) params.entityType = entityType;
      if (category)   params.category   = category;
      const { data } = await API.get('/documents', { params });
      setDocs(data.documents);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch { toast.error('Failed to load documents'); }
    finally { setLoading(false); }
  }, [page, search, entityType, category, showArchived]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);
  useEffect(() => {
    API.get('/documents/stats')
      .then(({ data }) => setStats(data.stats))
      .catch(() => {});
  }, []);
  useEffect(() => { setPage(1); }, [search, entityType, category, showArchived]);

  const handleDelete = async (doc) => {
    if (!confirm(`Permanently delete "${doc.title}"? This cannot be undone.`)) return;
    try {
      await API.delete(`/documents/${doc._id}`);
      toast.success('Document deleted');
      fetchDocs();
    } catch { toast.error('Failed'); }
  };

  const handleArchive = async (doc) => {
    try {
      await API.patch(`/documents/${doc._id}/archive`);
      toast.success(doc.isArchived ? 'Document restored' : 'Document archived');
      fetchDocs();
    } catch { toast.error('Failed'); }
  };

  const afterSave = () => {
    setUploadModal(false); setEditDoc(null);
    fetchDocs();
    API.get('/documents/stats').then(({ data }) => setStats(data.stats)).catch(() => {});
  };

  // Stats
  const typeMap  = Object.fromEntries((stats.byType || []).map(t => [t._id, t]));
  const totalSz  = fmtBytes(stats.totalSize || 0);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Document Storage</h1>
          <p>{total} documents · {totalSz} used</p>
        </div>
        <button className="btn btn-primary" onClick={() => setUploadModal(true)}>
          <MdUploadFile /> Upload Document
        </button>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom: 20 }}>
        {ENTITY_TYPES.map(et => {
          const t = typeMap[et.id] || {};
          return (
            <div key={et.id} className="stat-card" style={{ cursor: 'pointer', border: entityType === et.id ? `2px solid ${et.color}` : '1px solid var(--border)' }}
              onClick={() => setEntityType(entityType === et.id ? '' : et.id)}>
              <div className="stat-icon" style={{ background: et.color + '20', color: et.color }}>{et.icon}</div>
              <div>
                <div className="stat-value" style={{ fontSize: 22 }}>{t.count || 0}</div>
                <div className="stat-label">{et.label} Docs</div>
                {t.totalSize > 0 && <div className="text-muted" style={{ fontSize: 10 }}>{fmtBytes(t.totalSize)}</div>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="toolbar" style={{ marginBottom: 10 }}>
          <div className="search-box">
            <MdSearch className="search-icon" />
            <input placeholder="Search by title, entity name, notes, tags..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="form-control" style={{ width: 160 }} value={category}
            onChange={e => setCategory(e.target.value)}>
            <option value="">All Categories</option>
            {[...new Set(Object.values(CATEGORIES_BY_TYPE).flat())].sort().map(c => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
            <input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} />
            Show archived
          </label>
        </div>

        {/* Entity type filter pills */}
        <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
          <button className={`pill${entityType === '' ? ' active' : ''}`} onClick={() => setEntityType('')}>All</button>
          {ENTITY_TYPES.map(et => (
            <button key={et.id} className={`pill${entityType === et.id ? ' active' : ''}`}
              onClick={() => setEntityType(entityType === et.id ? '' : et.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              {et.icon} {et.label}
            </button>
          ))}
        </div>
      </div>

      {/* Documents grid */}
      {loading ? (
        <div className="flex-center" style={{ height: 200 }}><div className="text-muted">Loading...</div></div>
      ) : docs.length === 0 ? (
        <div className="empty-state">
          <MdFolderOpen size={52} style={{ opacity: 0.3, marginBottom: 16 }} />
          <h3>No documents found</h3>
          <p>Upload patient IDs, prescriptions, test results and more</p>
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setUploadModal(true)}>
            <MdUploadFile /> Upload First Document
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {docs.map(doc => {
            const et = ENTITY_TYPES.find(e => e.id === doc.entityType) || ENTITY_TYPES[0];
            return (
              <div key={doc._id} style={{
                border:       '1px solid var(--border)',
                borderRadius: 14,
                overflow:     'hidden',
                background:   'var(--card-bg)',
                opacity:      doc.isArchived ? 0.65 : 1,
                transition:   'var(--transition)',
              }}>
                {/* File preview */}
                <div style={{
                  height:      100,
                  background:  'var(--bg-tertiary)',
                  display:     'flex',
                  alignItems:  'center',
                  justifyContent: 'center',
                  position:    'relative',
                  cursor:      'pointer',
                  overflow:    'hidden',
                }}
                  onClick={() => window.open(doc.file.url, '_blank', 'noopener,noreferrer')}
                >
                  {doc.file.mimetype?.startsWith('image/') ? (
                    <img src={doc.file.url} alt={doc.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ textAlign: 'center' }}>
                      {FILE_ICON(doc.file.mimetype)}
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, textTransform: 'uppercase', fontWeight: 700 }}>
                        {doc.file.format || doc.file.mimetype?.split('/')[1] || 'FILE'}
                      </div>
                    </div>
                  )}

                  {/* Hover overlay */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'rgba(0,0,0,0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: 0, transition: 'opacity 0.2s',
                  }}
                    onMouseEnter={e => e.currentTarget.style.opacity = 1}
                    onMouseLeave={e => e.currentTarget.style.opacity = 0}
                  >
                    <MdOpenInNew size={28} style={{ color: '#fff' }} />
                  </div>

                  {/* Entity type badge */}
                  <div style={{
                    position: 'absolute', top: 8, left: 8,
                    background: et.color, color: '#fff',
                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    {et.icon} {et.label}
                  </div>

                  {/* Archived badge */}
                  {doc.isArchived && (
                    <div style={{ position: 'absolute', top: 8, right: 8, background: '#f59e0b', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99 }}>
                      Archived
                    </div>
                  )}
                </div>

                {/* Info */}
                <div style={{ padding: '12px 14px' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {doc.title}
                  </div>
                  <div className="text-muted text-sm" style={{ marginBottom: 6 }}>
                    {doc.entityName || '—'} · {doc.category}
                  </div>

                  {/* Tags */}
                  {doc.tags?.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                      {doc.tags.slice(0, 3).map(tag => (
                        <span key={tag} style={{ fontSize: 10, fontWeight: 600, background: 'var(--bg-tertiary)', color: 'var(--text-muted)', padding: '2px 7px', borderRadius: 99 }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)' }}>
                    <span>{fmtDate(doc.createdAt)} · {fmtBytes(doc.file.size)}</span>
                    <span>{doc.uploadedBy?.name || '—'}</span>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', borderTop: '1px solid var(--border-light)' }}>
                  <button
                    onClick={() => window.open(doc.file.url, '_blank', 'noopener,noreferrer')}
                    style={{ flex: 1, padding: '9px 0', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontFamily: 'var(--font-main)' }}
                  >
                    <MdOpenInNew size={14} /> Open
                  </button>
                  <div style={{ width: 1, background: 'var(--border-light)' }} />
                  <button
                    onClick={() => setEditDoc(doc)}
                    style={{ flex: 1, padding: '9px 0', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontFamily: 'var(--font-main)' }}
                  >
                    <MdEdit size={14} /> Edit
                  </button>
                  <div style={{ width: 1, background: 'var(--border-light)' }} />
                  <button
                    onClick={() => handleArchive(doc)}
                    style={{ flex: 1, padding: '9px 0', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontFamily: 'var(--font-main)' }}
                  >
                    {doc.isArchived ? <><MdUnarchive size={14} /> Restore</> : <><MdArchive size={14} /> Archive</>}
                  </button>
                  <div style={{ width: 1, background: 'var(--border-light)' }} />
                  <button
                    onClick={() => handleDelete(doc)}
                    style={{ flex: 1, padding: '9px 0', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontFamily: 'var(--font-main)' }}
                  >
                    <MdDelete size={14} /> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination" style={{ marginTop: 20 }}>
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} className={page === p ? 'active' : ''} onClick={() => setPage(p)}>{p}</button>
          ))}
          <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</button>
        </div>
      )}

      {/* Modals */}
      {uploadModal && (
        <UploadModal
          onClose={() => setUploadModal(false)}
          onUploaded={afterSave}
        />
      )}

      {editDoc && (
        <EditModal
          doc={editDoc}
          onClose={() => setEditDoc(null)}
          onSaved={afterSave}
        />
      )}
    </div>
  );
}