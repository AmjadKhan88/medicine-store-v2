import { useState, useEffect, useCallback } from 'react';
import {
  MdUpload, MdDelete, MdSearch, MdRefresh,
  MdAdd, MdClose
} from 'react-icons/md';
import toast from 'react-hot-toast';
import API from '../utils/api';
import ShortLoader from '../Components/ShortLoader';

const fmtDate   = d => d ? new Date(d).toLocaleDateString('en-PK', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '—';
const fmtSize   = b => b > 1024*1024 ? `${(b/1024/1024).toFixed(1)} MB` : `${Math.round(b/1024)} KB`;

const CATEGORIES = [
  { value:'medicine',  label:'💊 Medicine Info',       desc:'Drug information, uses, dosage, interactions' },
  { value:'service',   label:'🏥 Services',            desc:'Clinic/hospital service descriptions' },
  { value:'protocol',  label:'📋 Clinical Protocols',  desc:'Treatment protocols and clinical guidelines' },
  { value:'guideline', label:'📖 Guidelines',          desc:'WHO, DRAP, BNF, NICE guidelines' },
  { value:'formulary', label:'💉 Formulary',           desc:'Drug formulary and essential medicines list' },
  { value:'general',   label:'📄 General',             desc:'Other reference material' },
];

const STATUS_CFG = {
  processing: { bg:'#fef3c7', color:'#f59e0b', label:'Processing...' },
  ready:      { bg:'#d1fae5', color:'#10b981', label:'✓ Ready'       },
  failed:     { bg:'#fee2e2', color:'#ef4444', label:'✗ Failed'      },
};

/* ── Upload File Modal ── */
function UploadModal({ onClose, onUploaded }) {
  const [mode, setMode]   = useState('file'); // 'file' | 'text'
  const [form, setForm]   = useState({
    documentName: '', category: 'medicine', medicineName: '',
    source: '', tags: '', description: '', text: '',
  });
  const [file,    setFile]    = useState(null);
  const [saving,  setSaving]  = useState(false);
  const fld = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) { setFile(f); if (!form.documentName) setForm(p => ({ ...p, documentName: f.name.replace(/\.[^.]+$/, '') })); }
  };

  const handle = async () => {
    if (!form.documentName.trim()) { toast.error('Document name required'); return; }
    if (mode === 'file' && !file)  { toast.error('Please select a file');   return; }
    if (mode === 'text' && !form.text.trim()) { toast.error('Text content required'); return; }

    setSaving(true);
    try {
      if (mode === 'file') {
        const fd = new FormData();
        fd.append('file', file);
        Object.entries(form).forEach(([k, v]) => { if (k !== 'text') fd.append(k, v); });
        await API.post('/rag/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        await API.post('/rag/upload-text', form);
      }
      toast.success(`Document uploaded! Processing in background...`);
      onUploaded();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg" style={{ maxHeight:'88vh', overflowY:'auto' }}>
        <div className="modal-header">
          <div className="modal-title">Add Knowledge Document</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><MdClose /></button>
        </div>

        {/* Mode switch */}
        <div style={{ display:'flex', gap:8, marginBottom:16 }}>
          {[['file','📎 Upload File'],['text','✍️ Paste Text']].map(([m, label]) => (
            <button key={m} onClick={() => setMode(m)}
              style={{
                flex:1, padding:'10px', borderRadius:10, cursor:'pointer', fontWeight:700, fontSize:14,
                background: mode===m ? 'var(--accent)' : 'var(--bg-tertiary)',
                color:      mode===m ? '#fff'          : 'var(--text-muted)',
                border:     `2px solid ${mode===m ? 'var(--accent)' : 'var(--border)'}`,
              }}>
              {label}
            </button>
          ))}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
          <div>
            <div className="form-group">
              <label className="form-label required">Document Name</label>
              <input className="form-control" value={form.documentName} onChange={fld('documentName')}
                placeholder="e.g. Panadol Complete Drug Information" autoFocus />
            </div>

            <div className="form-group">
              <label className="form-label required">Category</label>
              <select className="form-control" value={form.category} onChange={fld('category')}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              <div className="form-hint">{CATEGORIES.find(c=>c.value===form.category)?.desc}</div>
            </div>

            {form.category === 'medicine' && (
              <div className="form-group">
                <label className="form-label">Medicine Name (for targeted retrieval)</label>
                <input className="form-control" value={form.medicineName} onChange={fld('medicineName')}
                  placeholder="e.g. paracetamol, metformin, amoxicillin" />
                <div className="form-hint">Lowercase. Enables medicine-specific vector filtering.</div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Source / Reference</label>
              <input className="form-control" value={form.source} onChange={fld('source')}
                placeholder="e.g. BNF 2024, WHO Essential Medicines, DRAP Guidelines" />
            </div>

            <div className="form-group">
              <label className="form-label">Tags (comma-separated)</label>
              <input className="form-control" value={form.tags} onChange={fld('tags')}
                placeholder="e.g. antibiotic, analgesic, pakistan, otc" />
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-control" rows={2} value={form.description} onChange={fld('description')}
                placeholder="Brief description of this document..." />
            </div>
          </div>

          <div>
            {mode === 'file' ? (
              <div>
                <label className="form-label">File</label>
                <div
                  onDragOver={e => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('rag-file-input').click()}
                  style={{
                    border:       '2px dashed var(--border)',
                    borderRadius: 14, padding:      '32px 20px',
                    textAlign:    'center', cursor: 'pointer',
                    background:   file ? 'var(--accent-light)' : 'var(--bg-tertiary)',
                    transition:   'all 0.2s',
                    marginBottom: 12,
                  }}
                >
                  <input id="rag-file-input" type="file" style={{ display:'none' }}
                    accept=".pdf,.docx,.txt,.md,.json"
                    onChange={e => {
                      const f = e.target.files[0];
                      if (f) { setFile(f); if (!form.documentName) setForm(p => ({ ...p, documentName: f.name.replace(/\.[^.]+$/, '') })); }
                    }} />
                  {file ? (
                    <>
                      <div style={{ fontSize:36, marginBottom:8 }}>📄</div>
                      <div style={{ fontWeight:700, color:'var(--accent)' }}>{file.name}</div>
                      <div className="text-muted text-sm">{fmtSize(file.size)}</div>
                      <button className="btn btn-ghost btn-sm" style={{ marginTop:8 }}
                        onClick={e => { e.stopPropagation(); setFile(null); }}>
                        Remove
                      </button>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize:36, marginBottom:8 }}>📁</div>
                      <div style={{ fontWeight:600, marginBottom:4 }}>Drop file here or click to browse</div>
                      <div className="text-muted text-sm">PDF, DOCX, TXT, MD, JSON — Max 20MB</div>
                    </>
                  )}
                </div>

                {/* Tips */}
                <div style={{ background:'var(--bg-tertiary)', borderRadius:10, padding:'12px 14px', fontSize:12, color:'var(--text-muted)', lineHeight:1.7 }}>
                  <div style={{ fontWeight:700, marginBottom:4 }}>💡 Best practices:</div>
                  <div>• PDF: Drug package inserts, clinical monographs</div>
                  <div>• DOCX: Formatted guidelines and protocols</div>
                  <div>• TXT/MD: Structured medicine info, Q&A format</div>
                  <div>• JSON: Structured drug databases</div>
                </div>
              </div>
            ) : (
              <div className="form-group" style={{ height:'100%' }}>
                <label className="form-label required">Text Content</label>
                <textarea className="form-control" rows={16} value={form.text} onChange={fld('text')}
                  placeholder={`Paste your text here. Example:\n\nMEDICINE: Paracetamol (Panadol)\n\nINDICATIONS:\n- Mild to moderate pain\n- Fever reduction\n- Headache, toothache, backache\n\nDOSAGE:\n- Adults: 500mg-1g every 4-6 hours\n- Maximum: 4g per day\n\nCONTRAINDICATIONS:\n- Severe hepatic impairment\n- Allergy to paracetamol\n\nSIDE EFFECTS:\n- Rare at therapeutic doses\n- Hepatotoxicity in overdose`}
                  style={{ minHeight:300 }} />
                <div className="form-hint">{form.text.length.toLocaleString()} characters · ~{Math.ceil(form.text.length / 600)} chunks estimated</div>
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handle} disabled={saving}>
            {saving ? '⏳ Processing...' : <><MdUpload /> Upload & Vectorize</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Test Query Panel ── */
function TestQuery() {
  const [query,   setQuery]   = useState('');
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [mode,    setMode]    = useState('search'); // 'search' | 'medicine'
  const [medicine,setMedicine]= useState('');

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      if (mode === 'medicine') {
        const { data } = await API.get(`/rag/medicine/${encodeURIComponent(medicine.trim())}`, { params: { query: query.trim() } });
        setResult(data);
      } else {
        const { data } = await API.post('/rag/search', { query: query.trim(), limit: 5 });
        setResult(data);
      }
    } catch (err) { toast.error(err.response?.data?.message || 'Search failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="card">
      <div style={{ fontWeight:700, fontSize:15, marginBottom:14 }}>🧪 Test RAG Query</div>

      <div style={{ display:'flex', gap:8, marginBottom:12 }}>
        {[['search','General Search'],['medicine','Medicine-Specific']].map(([m,l]) => (
          <button key={m} onClick={() => setMode(m)}
            style={{
              padding:'7px 16px', borderRadius:10, cursor:'pointer', fontWeight:700, fontSize:13,
              background: mode===m ? 'var(--accent)' : 'var(--bg-tertiary)',
              color:      mode===m ? '#fff'          : 'var(--text-muted)',
              border:     `2px solid ${mode===m ? 'var(--accent)' : 'var(--border)'}`,
            }}>
            {l}
          </button>
        ))}
      </div>

      {mode === 'medicine' && (
        <div className="form-group">
          <label className="form-label">Medicine Name</label>
          <input className="form-control" value={medicine} onChange={e => setMedicine(e.target.value)}
            placeholder="e.g. paracetamol, metformin, amoxicillin" />
        </div>
      )}

      <div style={{ display:'flex', gap:8 }}>
        <input className="form-control" value={query} onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder={mode === 'medicine' ? 'e.g. side effects, dosage, drug interactions' : 'Ask anything about your knowledge base...'} />
        <button className="btn btn-primary" onClick={handleSearch} disabled={loading || !query.trim()}>
          {loading ? '⏳' : <MdSearch />}
        </button>
      </div>

      {result && (
        <div style={{ marginTop:16 }}>
          {/* Answer */}
          {result.answer && (
            <div style={{ background:'var(--bg-tertiary)', borderRadius:12, padding:'16px 18px', marginBottom:12 }}>
              <div style={{ fontWeight:700, marginBottom:8, color:'var(--accent)', fontSize:13 }}>
                🤖 AI Answer (via {result.model})
              </div>
              <div style={{ fontSize:14, lineHeight:1.8, whiteSpace:'pre-wrap' }}>
                {result.answer}
              </div>
            </div>
          )}

          {/* Sources */}
          {result.sources?.length > 0 && (
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:10 }}>
              <span style={{ fontSize:12, color:'var(--text-muted)' }}>Sources:</span>
              {result.sources.map(s => (
                <span key={s} style={{ background:'var(--accent-light)', color:'var(--accent)', fontSize:11, padding:'2px 10px', borderRadius:99, fontWeight:600 }}>
                  📄 {s}
                </span>
              ))}
            </div>
          )}

          {/* Chunks */}
          {result.rawChunks?.length > 0 && (
            <details style={{ marginTop:8 }}>
              <summary style={{ cursor:'pointer', fontSize:12, color:'var(--text-muted)', fontWeight:600 }}>
                Show {result.rawChunks.length} retrieved chunks
              </summary>
              <div style={{ marginTop:8, display:'flex', flexDirection:'column', gap:6 }}>
                {result.rawChunks.map((c, i) => (
                  <div key={i} style={{ background:'var(--bg-tertiary)', borderRadius:8, padding:'10px 12px', fontSize:12 }}>
                    <div style={{ fontWeight:600, marginBottom:4, display:'flex', justifyContent:'space-between' }}>
                      <span>{c.documentName} — chunk {c.chunkIndex + 1}</span>
                      <span style={{ color:'var(--accent)' }}>Score: {c.score?.toFixed(3)}</span>
                    </div>
                    <div style={{ lineHeight:1.6, color:'var(--text-muted)' }}>{c.text}</div>
                  </div>
                ))}
              </div>
            </details>
          )}

          {!result.found && (
            <div style={{ color:'var(--text-muted)', fontSize:13, textAlign:'center', padding:'12px 0' }}>
              No relevant content found in knowledge base.
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
export default function RAGAdmin() {
  const [documents, setDocuments] = useState([]);
  const [stats,     setStats]     = useState([]);
  const [totalVecs, setTotalVecs] = useState(0);
  const [loading,   setLoading]   = useState(true);
  const [modal,     setModal]     = useState(false);
  const [search,    setSearch]    = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [activeTab, setActiveTab] = useState('documents');

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/rag/documents', {
        params: { search: search || undefined, category: catFilter || undefined },
      });
      setDocuments(data.documents || []);
      setStats(data.stats || []);
      setTotalVecs(data.totalVectors || 0);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load documents');
    } finally { setLoading(false); }
  }, [search, catFilter]);

  useEffect(() => { fetch(); }, [fetch]);

  // Auto-refresh every 5 seconds if any document is processing
  useEffect(() => {
    const hasProcessing = documents.some(d => d.status === 'processing');
    if (!hasProcessing) return;
    const timer = setInterval(fetch, 5000);
    return () => clearInterval(timer);
  }, [documents, fetch]);

  const handleDelete = async (doc) => {
    if (!confirm(`Delete "${doc.documentName}"? This will remove ${doc.vectorCount} vectors from Qdrant.`)) return;
    try {
      await API.delete(`/rag/documents/${doc._id}`);
      toast.success(`"${doc.documentName}" deleted`);
      fetch();
    } catch (err) { toast.error(err.response?.data?.message || 'Delete failed'); }
  };

  const statusSummary = {
    ready:      stats.find(s => s._id === 'ready')?.count || 0,
    processing: stats.find(s => s._id === 'processing')?.count || 0,
    failed:     stats.find(s => s._id === 'failed')?.count || 0,
    totalVecs,
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>🧠 RAG Knowledge Base</h1>
          <p>Upload medicine info, guidelines and protocols — AI retrieves relevant context for doctors and pharmacists</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-secondary btn-sm" onClick={fetch}><MdRefresh /></button>
          <button className="btn btn-primary" onClick={() => setModal(true)}>
            <MdAdd /> Add Document
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom:20 }}>
        {[
          { label:'Total Documents',  value:documents.length,          color:'#0ea5e9', icon:'📄' },
          { label:'Ready',            value:statusSummary.ready,        color:'#10b981', icon:'✅' },
          { label:'Processing',       value:statusSummary.processing,   color:'#f59e0b', icon:'⏳' },
          { label:'Total Vectors',    value:totalVecs.toLocaleString(), color:'#8b5cf6', icon:'🔢' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background:s.color+'20', fontSize:20 }}>{s.icon}</div>
            <div>
              <div className="stat-value" style={{ color:s.color, fontSize:typeof s.value === 'string' ? 18 : 24 }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* How it works banner */}
      <div style={{ background:'linear-gradient(135deg, #f0f9ff, #e0f2fe)', border:'1px solid #bae6fd', borderRadius:14, padding:'16px 20px', marginBottom:20 }}>
        <div style={{ fontWeight:700, marginBottom:8, color:'#0369a1' }}>⚡ How RAG Works</div>
        <div style={{ display:'flex', gap:0, alignItems:'center', flexWrap:'wrap', fontSize:13, color:'#0369a1' }}>
          {[
            'Upload document (PDF/DOCX/TXT)',
            'Auto-chunked into ~600 char pieces',
            'Each chunk → Gemini text-embedding-004 (768-dim)',
            'Stored in Qdrant Cloud',
            'Doctor queries "Panadol" → vector search → top 5 chunks → Groq Llama generates answer',
          ].map((step, i) => (
            <span key={i} style={{ display:'flex', alignItems:'center', gap:4 }}>
              <span style={{ background:'#0ea5e9', color:'#fff', borderRadius:'50%', width:20, height:20, fontSize:11, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                {i+1}
              </span>
              <span>{step}</span>
              {i < 4 && <span style={{ margin:'0 8px', color:'#7dd3fc' }}>→</span>}
            </span>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:20, borderBottom:'1px solid var(--border)' }}>
        {[['documents','📄 Documents'], ['test','🧪 Test Query']].map(([id, label]) => (
          <button key={id} onClick={() => setActiveTab(id)}
            style={{ padding:'10px 16px', background:'none', border:'none', borderBottom: activeTab===id?'2px solid var(--accent)':'2px solid transparent', color: activeTab===id?'var(--accent)':'var(--text-muted)', fontWeight: activeTab===id?700:500, cursor:'pointer', fontSize:14, fontFamily:'var(--font-main)' }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Documents Tab ── */}
      {activeTab === 'documents' && (
        <div>
          {/* Filters */}
          <div className="card" style={{ marginBottom:14 }}>
            <div style={{ display:'flex', gap:10 }}>
              <div className="search-box" style={{ flex:1 }}>
                <MdSearch className="search-icon" />
                <input placeholder="Search by name, medicine or tag..."
                  value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <select className="form-control" style={{ width:200 }} value={catFilter} onChange={e => setCatFilter(e.target.value)}>
                <option value="">All Categories</option>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex-center" style={{ height:200 }}><ShortLoader/></div>
          ) : documents.length === 0 ? (
            <div className="empty-state">
              <span style={{ fontSize:56, opacity:0.3 }}>🧠</span>
              <h3>No documents in knowledge base</h3>
              <p>Upload medicine info, clinical guidelines or service descriptions to enable AI-powered retrieval.</p>
              <button className="btn btn-primary" style={{ marginTop:14 }} onClick={() => setModal(true)}>
                <MdAdd /> Add First Document
              </button>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {documents.map(doc => {
                const sc = STATUS_CFG[doc.status] || STATUS_CFG.ready;
                const cat = CATEGORIES.find(c => c.value === doc.category);
                return (
                  <div key={doc._id} style={{ border:'1px solid var(--border)', borderRadius:12, padding:'14px 18px', background:'var(--card-bg)', display:'grid', gridTemplateColumns:'auto 1fr auto auto', gap:14, alignItems:'center' }}>
                    {/* Icon */}
                    <div style={{ width:44, height:44, borderRadius:10, background:'var(--bg-tertiary)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>
                      {cat?.label.split(' ')[0]}
                    </div>

                    {/* Info */}
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontWeight:700, fontSize:15 }}>{doc.documentName}</div>
                      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:4 }}>
                        <span style={{ fontSize:11, background:'var(--bg-tertiary)', padding:'2px 8px', borderRadius:6, color:'var(--text-muted)' }}>
                          {cat?.label.split(' ').slice(1).join(' ')}
                        </span>
                        {doc.medicineName && (
                          <span style={{ fontSize:11, background:'#dbeafe', color:'#1d4ed8', padding:'2px 8px', borderRadius:6 }}>
                            💊 {doc.medicineName}
                          </span>
                        )}
                        {doc.source && (
                          <span style={{ fontSize:11, color:'var(--text-muted)' }}>📚 {doc.source}</span>
                        )}
                        {doc.tags?.slice(0,3).map(tag => (
                          <span key={tag} style={{ fontSize:10, background:'var(--bg-tertiary)', color:'var(--text-muted)', padding:'1px 7px', borderRadius:99 }}>
                            #{tag}
                          </span>
                        ))}
                      </div>
                      <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:3 }}>
                        {doc.vectorCount > 0 && `${doc.vectorCount} vectors · ${doc.chunkCount} chunks · `}
                        {doc.fileSize && `${fmtSize(doc.fileSize)} · `}
                        Uploaded {fmtDate(doc.createdAt)} by {doc.uploadedByName}
                        {doc.errorMessage && <span style={{ color:'#ef4444', marginLeft:6 }}> — {doc.errorMessage}</span>}
                      </div>
                    </div>

                    {/* Status */}
                    <span style={{ background:sc.bg, color:sc.color, padding:'4px 12px', borderRadius:99, fontSize:12, fontWeight:700, flexShrink:0 }}>
                      {doc.status === 'processing' && <span style={{ marginRight:4 }}>⏳</span>}
                      {sc.label}
                    </span>

                    {/* Actions */}
                    <button className="btn btn-ghost btn-sm btn-icon" onClick={() => handleDelete(doc)}
                      title="Delete document and its vectors">
                      <MdDelete size={16} style={{ color:'var(--danger)' }} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Test Tab ── */}
      {activeTab === 'test' && <TestQuery />}

      {/* Modal */}
      {modal && (
        <UploadModal
          onClose={() => setModal(false)}
          onUploaded={() => { setModal(false); fetch(); }}
        />
      )}
    </div>
  );
}