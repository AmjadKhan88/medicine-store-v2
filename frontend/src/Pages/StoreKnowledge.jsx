import { useState, useEffect, useCallback } from 'react';
import {
  MdUpload, MdDelete, MdSearch, MdRefresh,
  MdAdd, MdClose,
} from 'react-icons/md';
import toast from 'react-hot-toast';
import API from '../utils/api';

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-PK',{day:'2-digit',month:'short',year:'numeric'}) : '—';
const fmtSize = b => b > 1024*1024 ? `${(b/1024/1024).toFixed(1)} MB` : `${Math.round(b/1024)} KB`;

const CATEGORIES = [
  { value:'medicine',   label:'💊 Medicine Info',      desc:'Drug info specific to your pharmacy'   },
  { value:'service',    label:'🏥 Our Services',        desc:'Your clinic services & packages'       },
  { value:'protocol',   label:'📋 Our Protocols',       desc:'Your clinic-specific protocols'        },
  { value:'guideline',  label:'📖 Guidelines',          desc:'Clinical guidelines you follow'        },
  { value:'store-info', label:'🏪 Store Information',   desc:'About your pharmacy, FAQs, policies'  },
  { value:'pricing',    label:'💰 Pricing & Packages',  desc:'Your service fees and packages'        },
  { value:'general',    label:'📄 General',             desc:'Other reference material'              },
];

const STATUS_CFG = {
  processing:{ bg:'#fef3c7', color:'#f59e0b', label:'⏳ Processing' },
  ready:     { bg:'#d1fae5', color:'#10b981', label:'✓ Ready'      },
  failed:    { bg:'#fee2e2', color:'#ef4444', label:'✗ Failed'     },
};

const TIER_CFG = {
  store_only:       { bg:'#dbeafe', color:'#1d4ed8', icon:'📋', label:'Your Knowledge' },
  store_and_global: { bg:'#ede9fe', color:'#7c3aed', icon:'📋🌐',label:'Store + Database' },
  global_only:      { bg:'#d1fae5', color:'#065f46', icon:'🌐', label:'Clinical Database' },
  ai_knowledge:     { bg:'#f3f4f6', color:'#374151', icon:'🤖', label:'AI Knowledge'    },
};

/* ── Storage usage bar ── */
function UsageBar({ usage }) {
  if (!usage) return null;
  const pct = usage.usagePercent || 0;
  const color = pct > 85 ? '#ef4444' : pct > 60 ? '#f59e0b' : '#10b981';
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:6 }}>
        <span style={{ fontWeight:700 }}>Storage Used</span>
        <span style={{ color, fontWeight:700 }}>{usage.usedMB} MB / {usage.maxMB} MB</span>
      </div>
      <div style={{ height:8, background:'var(--border)', borderRadius:99, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${Math.min(100,pct)}%`, background:color, borderRadius:99, transition:'width 0.4s' }} />
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginTop:4, color:'var(--text-muted)' }}>
        <span>{usage.docs} / {usage.maxDocs} documents</span>
        <span>{usage.mbRemaining} MB · {usage.docsRemaining} docs remaining</span>
      </div>
    </div>
  );
}

/* ── Upload modal ── */
function UploadModal({ onClose, onUploaded, usage }) {
  const [mode,   setMode]   = useState('file');
  const [form,   setForm]   = useState({ documentName:'', category:'general', medicineName:'', source:'', tags:'', description:'', text:'' });
  const [file,   setFile]   = useState(null);
  const [saving, setSaving] = useState(false);
  const fld = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const handle = async () => {
    if (!form.documentName.trim()) { toast.error('Document name required'); return; }
    if (mode === 'file' && !file)  { toast.error('Select a file'); return; }
    if (mode === 'text' && !form.text.trim()) { toast.error('Paste some text'); return; }

    setSaving(true);
    try {
      if (mode === 'file') {
        const fd = new FormData();
        fd.append('file', file);
        Object.entries(form).forEach(([k,v]) => { if (k !== 'text') fd.append(k, v); });
        const { data } = await API.post('/store-rag/upload', fd, { headers:{ 'Content-Type':'multipart/form-data' } });
        toast.success(data.message);
      } else {
        const { data } = await API.post('/store-rag/upload-text', form);
        toast.success(data.message);
      }
      onUploaded();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally { setSaving(false); }
  };

  const remainingMB = usage ? parseFloat(usage.mbRemaining) : 15;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg" style={{ maxHeight:'90vh', overflowY:'auto' }}>
        <div className="modal-header">
          <div className="modal-title">📤 Add Knowledge Document</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><MdClose /></button>
        </div>

        {/* Storage warning */}
        {usage && usage.docsRemaining <= 5 && (
          <div style={{ background:'#fef3c7', border:'1px solid #fde68a', borderRadius:10, padding:'10px 14px', marginBottom:14, fontSize:13, color:'#92400e' }}>
            ⚠️ {usage.docsRemaining} document slot{usage.docsRemaining !== 1 ? 's' : ''} remaining · {usage.mbRemaining}MB storage left
          </div>
        )}

        {/* Mode toggle */}
        <div style={{ display:'flex', gap:8, marginBottom:16 }}>
          {[['file','📎 Upload File'],['text','✍️ Paste Text']].map(([m,l]) => (
            <button key={m} onClick={() => setMode(m)}
              style={{ flex:1, padding:'10px', borderRadius:10, cursor:'pointer', fontWeight:700, fontSize:13,
                background: mode===m ? 'var(--accent)' : 'var(--bg-tertiary)',
                color:      mode===m ? '#fff' : 'var(--text-muted)',
                border:     `2px solid ${mode===m ? 'var(--accent)' : 'var(--border)'}` }}>
              {l}
            </button>
          ))}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
          <div>
            <div className="form-group">
              <label className="form-label required">Document Name</label>
              <input className="form-control" value={form.documentName} onChange={fld('documentName')}
                placeholder="e.g. Our Consultation Fees 2026" autoFocus />
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
                <label className="form-label">Medicine Name</label>
                <input className="form-control" value={form.medicineName} onChange={fld('medicineName')}
                  placeholder="e.g. paracetamol" />
                <div className="form-hint">Enables medicine-specific retrieval</div>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Tags (comma-separated)</label>
              <input className="form-control" value={form.tags} onChange={fld('tags')}
                placeholder="e.g. pricing, 2026, consultation" />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-control" rows={2} value={form.description} onChange={fld('description')}
                placeholder="Brief description..." />
            </div>
          </div>

          <div>
            {mode === 'file' ? (
              <div>
                <div className="form-label" style={{ marginBottom:6 }}>File <span style={{ color:'var(--text-muted)', fontWeight:400 }}>(max 5MB)</span></div>
                <div
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); const f=e.dataTransfer.files[0]; if(f){setFile(f); if(!form.documentName) setForm(p=>({...p,documentName:f.name.replace(/\.[^.]+$/,'')}))} }}
                  onClick={() => document.getElementById('store-file-input').click()}
                  style={{ border:'2px dashed var(--border)', borderRadius:14, padding:'28px 16px', textAlign:'center', cursor:'pointer', background: file?'var(--accent-light)':'var(--bg-tertiary)', marginBottom:12 }}>
                  <input id="store-file-input" type="file" style={{ display:'none' }}
                    accept=".pdf,.docx,.txt,.md,.json"
                    onChange={e => { const f=e.target.files[0]; if(f){setFile(f); if(!form.documentName) setForm(p=>({...p,documentName:f.name.replace(/\.[^.]+$/,'')}));}}} />
                  {file ? (
                    <>
                      <div style={{ fontSize:32, marginBottom:6 }}>📄</div>
                      <div style={{ fontWeight:700, color:'var(--accent)' }}>{file.name}</div>
                      <div className="text-muted text-sm">{fmtSize(file.size)}</div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize:32, marginBottom:6 }}>📁</div>
                      <div style={{ fontWeight:600, marginBottom:4 }}>Drop or click to browse</div>
                      <div className="text-muted text-sm">PDF, DOCX, TXT, MD, JSON</div>
                    </>
                  )}
                </div>
                <div style={{ background:'var(--bg-tertiary)', borderRadius:10, padding:'12px 14px', fontSize:12, color:'var(--text-muted)', lineHeight:1.8 }}>
                  <div style={{ fontWeight:700, marginBottom:4 }}>💡 What to upload:</div>
                  <div>📋 Your clinic protocols and procedures</div>
                  <div>💰 Service fee schedules</div>
                  <div>🏪 About your pharmacy / FAQs</div>
                  <div>💊 Specific medicine info you stock</div>
                  <div>📖 Treatment guidelines you follow</div>
                </div>
              </div>
            ) : (
              <div className="form-group" style={{ height:'100%' }}>
                <label className="form-label required">Text Content</label>
                <textarea className="form-control" rows={14} value={form.text} onChange={fld('text')}
                  placeholder={`Example:\n\nSERVICE: General Consultation\nFee: Rs. 1,000\nDoctor: Dr. Ahmed Khan\nAvailable: Mon-Sat 9am-5pm\n\nSERVICE: Specialist Referral\nFee: Rs. 500\n\nPHARMACY HOURS:\nMonday-Saturday: 8am - 10pm\nSunday: 9am - 5pm`}
                  style={{ minHeight:280 }} />
                <div className="form-hint">{form.text.length.toLocaleString()} chars · ~{Math.ceil(form.text.length/600)} chunks</div>
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handle} disabled={saving || !form.documentName.trim()}>
            {saving ? '⏳ Processing...' : <><MdUpload /> Upload & Vectorize</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── AI Query Panel ── */
function QueryPanel() {
  const [query,    setQuery]    = useState('');
  const [medicine, setMedicine] = useState('');
  const [result,   setResult]   = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [mode,     setMode]     = useState('general');

  const handleQuery = async () => {
    if (!query.trim()) return;
    setLoading(true); setResult(null);
    try {
      let data;
      if (mode === 'medicine' && medicine.trim()) {
        const res = await API.get(`/store-rag/medicine/${encodeURIComponent(medicine.trim())}`, { params: { query: query.trim() } });
        data = res.data;
      } else {
        const res = await API.post('/store-rag/query', { query: query.trim() });
        data = res.data;
      }
      setResult(data);
    } catch (err) { toast.error(err.response?.data?.message || 'Query failed'); }
    finally { setLoading(false); }
  };

  const tierCfg = result?.sourceTier ? TIER_CFG[result.sourceTier] : null;

  return (
    <div>
      <div className="card" style={{ marginBottom:16 }}>
        <div style={{ fontWeight:700, fontSize:15, marginBottom:14 }}>🔍 Ask AI Assistant</div>

        <div style={{ display:'flex', gap:8, marginBottom:12 }}>
          {[['general','General Query'],['medicine','Medicine Lookup']].map(([m,l]) => (
            <button key={m} onClick={() => setMode(m)}
              style={{ flex:1, padding:'8px', borderRadius:10, cursor:'pointer', fontWeight:700, fontSize:13,
                background: mode===m ? 'var(--accent)' : 'var(--bg-tertiary)',
                color:      mode===m ? '#fff' : 'var(--text-muted)',
                border:     `2px solid ${mode===m ? 'var(--accent)' : 'var(--border)'}` }}>
              {l}
            </button>
          ))}
        </div>

        {mode === 'medicine' && (
          <div className="form-group">
            <label className="form-label">Medicine Name</label>
            <input className="form-control" value={medicine} onChange={e => setMedicine(e.target.value)}
              placeholder="e.g. Panadol, Metformin, Amoxicillin" />
          </div>
        )}

        <div style={{ display:'flex', gap:8 }}>
          <input className="form-control" value={query} onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key==='Enter' && handleQuery()}
            placeholder={mode==='medicine' ? 'e.g. dosage for children, side effects' : 'Ask anything about medicines, services, protocols...'} />
          <button className="btn btn-primary" onClick={handleQuery} disabled={loading || !query.trim()}>
            {loading ? '⏳' : <MdSearch />}
          </button>
        </div>

        {/* Example queries */}
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:10 }}>
          {['What is our consultation fee?','Side effects of Panadol','Metformin dosage for type 2 diabetes','Our pharmacy working hours'].map(q => (
            <button key={q} onClick={() => { setQuery(q); }}
              style={{ background:'var(--bg-tertiary)', border:'1px solid var(--border)', borderRadius:8, padding:'4px 10px', cursor:'pointer', fontSize:11, color:'var(--text-muted)' }}>
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className="card">
          {/* Tier badge */}
          {tierCfg && (
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14, padding:'8px 12px', background:tierCfg.bg, borderRadius:10 }}>
              <span>{tierCfg.icon}</span>
              <span style={{ fontWeight:700, fontSize:13, color:tierCfg.color }}>{tierCfg.label}</span>
              <span style={{ fontSize:12, color:tierCfg.color, opacity:0.8 }}>
                — {result.storeTier || 0} store chunks · {result.globalTier || 0} global chunks
              </span>
            </div>
          )}

          {/* Answer */}
          <div style={{ fontSize:14, lineHeight:1.9, whiteSpace:'pre-wrap', marginBottom:14 }}>
            {result.answer}
          </div>

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

          {/* Retrieved chunks */}
          {result.retrievedChunks?.length > 0 && (
            <details>
              <summary style={{ cursor:'pointer', fontSize:12, color:'var(--text-muted)', fontWeight:600 }}>
                View {result.retrievedChunks.length} retrieved chunks
              </summary>
              <div style={{ marginTop:8, display:'flex', flexDirection:'column', gap:6 }}>
                {result.retrievedChunks.map((c, i) => {
                  const tc = TIER_CFG[c.tier === 'store' ? 'store_only' : 'global_only'];
                  return (
                    <div key={i} style={{ background:'var(--bg-tertiary)', borderRadius:8, padding:'10px 12px', fontSize:12, border:`1px solid ${tc?.bg || 'var(--border)'}` }}>
                      <div style={{ fontWeight:600, marginBottom:4, display:'flex', justifyContent:'space-between' }}>
                        <span>{tc?.icon} {c.documentName}</span>
                        <span style={{ color:'var(--accent)' }}>Score: {c.score?.toFixed(3)}</span>
                      </div>
                      <div style={{ lineHeight:1.6, color:'var(--text-muted)' }}>{c.text}</div>
                    </div>
                  );
                })}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════
   MAIN PAGE
════════════════════════════════ */
export default function StoreKnowledge() {
  const [documents, setDocuments] = useState([]);
  const [usage,     setUsage]     = useState(null);
  const [stats,     setStats]     = useState({});
  const [loading,   setLoading]   = useState(true);
  const [modal,     setModal]     = useState(false);
  const [activeTab, setActiveTab] = useState('documents');
  const [search,    setSearch]    = useState('');
  const [catFilter, setCatFilter] = useState('');

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/store-rag/documents', {
        params: { search: search||undefined, category: catFilter||undefined },
      });
      setDocuments(data.documents || []);
      setUsage(data.usage);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to load'); }
    finally { setLoading(false); }
  }, [search, catFilter]);

  const fetchStats = useCallback(() => {
    API.get('/store-rag/stats').then(({ data }) => setStats(data.stats||{})).catch(()=>{});
  }, []);

  useEffect(() => { fetchDocs(); fetchStats(); }, [fetchDocs, fetchStats]);

  // Auto-refresh while processing
  useEffect(() => {
    const hasProcessing = documents.some(d => d.status === 'processing');
    if (!hasProcessing) return;
    const timer = setInterval(() => { fetchDocs(); }, 5000);
    return () => clearInterval(timer);
  }, [documents, fetchDocs]);

  const handleDelete = async (doc) => {
    if (!confirm(`Delete "${doc.documentName}"? This removes ${doc.vectorCount} vectors.`)) return;
    try {
      await API.delete(`/store-rag/documents/${doc._id}`);
      toast.success(`"${doc.documentName}" deleted`);
      fetchDocs(); fetchStats();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>🧠 Store Knowledge Base</h1>
          <p>Upload your clinic info, protocols and medicine data — AI uses it to answer staff queries</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => { fetchDocs(); fetchStats(); }}><MdRefresh /></button>
          {activeTab === 'documents' && (
            <button className="btn btn-primary" onClick={() => setModal(true)}
              disabled={usage && usage.docsRemaining <= 0}>
              <MdAdd /> Add Document
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom:20 }}>
        {[
          { label:'Documents',    value:stats.readyDocs     ||0, color:'#10b981', icon:'📄' },
          { label:'Processing',   value:stats.processingDocs||0, color:'#f59e0b', icon:'⏳' },
          { label:'Vectors',      value:(stats.vectorCount||0).toLocaleString(), color:'#8b5cf6', icon:'🔢' },
          { label:'Storage Used', value:`${stats.usedMB||0} MB`, color:'#0ea5e9', icon:'💾' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background:s.color+'20', fontSize:20 }}>{s.icon}</div>
            <div>
              <div className="stat-value" style={{ color:s.color, fontSize:typeof s.value==='string'?16:24 }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div style={{ background:'#f0fdf4', border:'1px solid #86efac', borderRadius:14, padding:'14px 18px', marginBottom:20, fontSize:13, color:'#166534' }}>
        <div style={{ fontWeight:700, marginBottom:6 }}>🔍 3-Tier Search — How It Works</div>
        <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
          <span>📋 <strong>1st:</strong> Searches YOUR documents</span>
          <span>→</span>
          <span>🌐 <strong>2nd:</strong> Searches global clinical database</span>
          <span>→</span>
          <span>🤖 <strong>3rd:</strong> AI responds from training knowledge</span>
        </div>
        <div style={{ marginTop:6, fontSize:12, opacity:0.8 }}>
          Your data is completely private — other stores cannot access it.
          Limit: {stats.maxDocs||25} documents · {stats.maxMB||15}MB total storage.
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:20, borderBottom:'1px solid var(--border)' }}>
        {[['documents','📄 My Documents'],['query','🤖 Ask AI']].map(([id,label]) => (
          <button key={id} onClick={() => setActiveTab(id)}
            style={{ padding:'10px 16px', background:'none', border:'none', borderBottom: activeTab===id?'2px solid var(--accent)':'2px solid transparent', color: activeTab===id?'var(--accent)':'var(--text-muted)', fontWeight: activeTab===id?700:500, cursor:'pointer', fontSize:14, fontFamily:'var(--font-main)' }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Documents Tab ── */}
      {activeTab === 'documents' && (
        <div>
          <UsageBar usage={usage} />

          <div className="card" style={{ marginBottom:14 }}>
            <div style={{ display:'flex', gap:10 }}>
              <div className="search-box" style={{ flex:1 }}>
                <MdSearch className="search-icon" />
                <input placeholder="Search documents..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <select className="form-control" style={{ width:180 }} value={catFilter} onChange={e => setCatFilter(e.target.value)}>
                <option value="">All Categories</option>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex-center" style={{ height:180 }}><div className="text-muted">Loading...</div></div>
          ) : documents.length === 0 ? (
            <div className="empty-state">
              <span style={{ fontSize:52, opacity:0.3 }}>🧠</span>
              <h3>No documents yet</h3>
              <p>Upload your clinic info so AI can answer staff queries about your services, protocols and medicines.</p>
              <button className="btn btn-primary" style={{ marginTop:14 }} onClick={() => setModal(true)}>
                <MdAdd /> Add First Document
              </button>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {documents.map(doc => {
                const sc  = STATUS_CFG[doc.status] || STATUS_CFG.ready;
                const cat = CATEGORIES.find(c => c.value === doc.category);
                return (
                  <div key={doc._id} style={{ border:'1px solid var(--border)', borderRadius:12, padding:'12px 16px', background:'var(--card-bg)', display:'grid', gridTemplateColumns:'auto 1fr auto auto', gap:12, alignItems:'center' }}>
                    <div style={{ width:40, height:40, borderRadius:10, background:'var(--bg-tertiary)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>
                      {cat?.label.split(' ')[0]}
                    </div>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontWeight:700, fontSize:14 }}>{doc.documentName}</div>
                      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:3 }}>
                        <span style={{ fontSize:11, background:'var(--bg-tertiary)', padding:'2px 8px', borderRadius:6, color:'var(--text-muted)' }}>
                          {cat?.label.split(' ').slice(1).join(' ')}
                        </span>
                        {doc.medicineName && (
                          <span style={{ fontSize:11, background:'#dbeafe', color:'#1d4ed8', padding:'2px 8px', borderRadius:6 }}>
                            💊 {doc.medicineName}
                          </span>
                        )}
                        {doc.tags?.slice(0,3).map(t => (
                          <span key={t} style={{ fontSize:10, background:'var(--bg-tertiary)', color:'var(--text-muted)', padding:'1px 6px', borderRadius:99 }}>#{t}</span>
                        ))}
                      </div>
                      <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:3 }}>
                        {doc.vectorCount > 0 && `${doc.vectorCount} vectors · `}
                        {doc.fileSize && `${fmtSize(doc.fileSize)} · `}
                        {fmtDate(doc.createdAt)}
                        {doc.errorMessage && <span style={{ color:'#ef4444' }}> — {doc.errorMessage}</span>}
                      </div>
                    </div>
                    <span style={{ background:sc.bg, color:sc.color, padding:'3px 10px', borderRadius:99, fontSize:11, fontWeight:700 }}>
                      {sc.label}
                    </span>
                    <button className="btn btn-ghost btn-sm btn-icon" onClick={() => handleDelete(doc)}>
                      <MdDelete size={15} style={{ color:'var(--danger)' }} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Query Tab ── */}
      {activeTab === 'query' && <QueryPanel />}

      {modal && (
        <UploadModal
          usage={usage}
          onClose={() => setModal(false)}
          onUploaded={() => { setModal(false); fetchDocs(); fetchStats(); }}
        />
      )}
    </div>
  );
}