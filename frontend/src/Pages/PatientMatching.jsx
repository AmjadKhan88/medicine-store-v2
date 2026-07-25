import { useState, useEffect, useCallback } from 'react';
import {
  MdSearch, MdMergeType, MdRefresh, MdPerson,
  MdWarning, MdCheck, MdClose, MdArrowForward,
} from 'react-icons/md';
import toast from 'react-hot-toast';
import API from '../utils/api';

/* ── helpers ── */
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-PK', { day:'2-digit', month:'short', year:'numeric' }) : '—';
const fmtPKR  = n => `₨${Math.round(Number(n||0)).toLocaleString()}`;

const CONFIDENCE_CFG = {
  High:   { bg:'#fee2e2', color:'#ef4444', border:'#fca5a5' },
  Medium: { bg:'#fef3c7', color:'#f59e0b', border:'#fcd34d' },
  Low:    { bg:'#f3f4f6', color:'#6b7280', border:'#e5e7eb' },
};

/* ════════════════════════════════
   MERGE MODAL
════════════════════════════════ */
function MergeModal({ pair, onClose, onMerged }) {
  const [keepId, setKeepId]       = useState(pair.p1._id);
  const [overrides, setOverrides] = useState({});
  const [saving, setSaving]       = useState(false);

  const keep  = keepId === pair.p1._id ? pair.p1 : pair.p2;
  const discard = keepId === pair.p1._id ? pair.p2 : pair.p1;

  const MERGE_FIELDS = [
    { key:'phone',         label:'Phone'          },
    { key:'cnic',          label:'CNIC'           },
    { key:'age',           label:'Age'            },
    { key:'gender',        label:'Gender'         },
    { key:'city',          label:'City'           },
    { key:'bloodGroup',    label:'Blood Group'    },
    { key:'doctor',        label:'Doctor'         },
    { key:'allergies',     label:'Allergies'      },
    { key:'medicalHistory',label:'Medical History'},
  ];

  const handleMerge = async () => {
    if (!confirm(`Merge ${discard.name} into ${keep.name}? This cannot be undone.`)) return;
    setSaving(true);
    try {
      await API.post('/patient-match/merge', {
        keepId:  keep._id,
        mergeId: discard._id,
        fieldOverrides: overrides,
      });
      toast.success(`Merged! All records moved to ${keep.name}`);
      onMerged();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Merge failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg" style={{ maxHeight:'88vh', overflowY:'auto' }}>
        <div className="modal-header">
          <div className="modal-title">Merge Duplicate Patients</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><MdClose /></button>
        </div>

        {/* Which to keep */}
        <div style={{ marginBottom:16 }}>
          <div style={{ fontWeight:700, marginBottom:10 }}>Which record to keep?</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {[pair.p1, pair.p2].map(p => (
              <button key={p._id}
                onClick={() => setKeepId(p._id)}
                style={{
                  border:  `2px solid ${keepId === p._id ? 'var(--accent)' : 'var(--border)'}`,
                  background: keepId === p._id ? 'var(--accent-light)' : 'var(--bg-tertiary)',
                  borderRadius:12, padding:14, cursor:'pointer', textAlign:'left',
                }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div>
                    <div style={{ fontWeight:700, fontSize:15 }}>{p.name}</div>
                    <div className="text-muted text-sm">{p.patientId}</div>
                    <div className="text-muted text-sm">{p.phone}</div>
                  </div>
                  {keepId === p._id && (
                    <span style={{ background:'var(--accent)', color:'#fff', padding:'2px 10px', borderRadius:99, fontSize:11, fontWeight:700 }}>
                      KEEP
                    </span>
                  )}
                </div>
                <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:6 }}>
                  {fmtPKR(p.totalBilled || 0)} billed · Since {fmtDate(p.createdAt)}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Field-by-field comparison */}
        <div className="card" style={{ marginBottom:14 }}>
          <div style={{ fontWeight:700, marginBottom:10 }}>Field Comparison — choose which value to use</div>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', fontSize:13, borderCollapse:'collapse' }}>
              <thead>
                <tr>
                  <th style={{ padding:'8px 10px', textAlign:'left', color:'var(--text-muted)', fontWeight:600 }}>Field</th>
                  <th style={{ padding:'8px 10px', textAlign:'left', background:'#f0f9ff', color:'#0369a1' }}>
                    Keep: {keep.name}
                  </th>
                  <th style={{ padding:'8px 10px', textAlign:'left', background:'#fff5f5', color:'#dc2626' }}>
                    Discard: {discard.name}
                  </th>
                  <th style={{ padding:'8px 10px', textAlign:'center' }}>Use</th>
                </tr>
              </thead>
              <tbody>
                {MERGE_FIELDS.map(({ key, label }) => {
                  const v1 = Array.isArray(keep[key])    ? keep[key].join(', ')    : keep[key];
                  const v2 = Array.isArray(discard[key]) ? discard[key].join(', ') : discard[key];
                  if (!v1 && !v2) return null;
                  const isDifferent = v1 !== v2;
                  return (
                    <tr key={key} style={{ background: isDifferent?'#fffbeb':'transparent' }}>
                      <td style={{ padding:'8px 10px', fontWeight:600, color:'var(--text-muted)' }}>{label}</td>
                      <td style={{ padding:'8px 10px' }}>{v1 || '—'}</td>
                      <td style={{ padding:'8px 10px', color: isDifferent?'#dc2626':'inherit' }}>{v2 || '—'}</td>
                      <td style={{ padding:'8px 10px', textAlign:'center' }}>
                        {isDifferent && v2 && (
                          <button
                            onClick={() => setOverrides(p => ({ ...p, [key]: overrides[key]==='merge'?undefined:'merge' }))}
                            style={{
                              padding:'3px 10px', borderRadius:8, cursor:'pointer', fontSize:11, fontWeight:700,
                              background: overrides[key]==='merge' ? '#dc2626' : 'var(--bg-tertiary)',
                              color:      overrides[key]==='merge' ? '#fff'    : 'var(--text-muted)',
                              border:    `1px solid ${overrides[key]==='merge' ? '#dc2626' : 'var(--border)'}`,
                            }}>
                            {overrides[key]==='merge' ? '✓ Use other' : 'Use other'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ background:'#fef3c7', border:'1px solid #fcd34d', borderRadius:10, padding:'10px 14px', fontSize:13, marginBottom:14 }}>
          <div style={{ fontWeight:700, marginBottom:4 }}>⚠️ What happens when you merge:</div>
          <div style={{ color:'#78350f', lineHeight:1.7 }}>
            • All bills, prescriptions, lab tests, appointments, IPD records of <strong>{discard.name}</strong> will be moved to <strong>{keep.name}</strong><br/>
            • Financial totals will be combined<br/>
            • <strong>{discard.name}'s</strong> record will be archived (not deleted)<br/>
            • This action cannot be fully reversed
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-danger" onClick={handleMerge} disabled={saving}>
            {saving ? 'Merging...' : <><MdMergeType /> Merge Records</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════
   MAIN PAGE
════════════════════════════════ */
export default function PatientMatching() {
  const [pairs,      setPairs]      = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [total,      setTotal]      = useState(0);
  const [threshold,  setThreshold]  = useState(65);
  const [mergeModal, setMergeModal] = useState(null);
  const [confidence, setConfidence] = useState('');

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/patient-match', { params: { threshold, limit: 100 } });
      setPairs(data.pairs || []);
      setTotal(data.total || 0);
    } catch { toast.error('Failed to scan for duplicates'); }
    finally { setLoading(false); }
  }, [threshold]);

  useEffect(() => { fetch(); }, [fetch]);

  const filtered = confidence ? pairs.filter(p => p.confidence === confidence) : pairs;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>🔍 Smart Patient Matching</h1>
          <p>
            {total} potential duplicate{total !== 1 ? 's' : ''} found ·
            <span style={{ color:'#ef4444', fontWeight:700 }}> {pairs.filter(p=>p.confidence==='High').length} high confidence</span>
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={fetch} disabled={loading}>
          <MdRefresh /> {loading ? 'Scanning...' : 'Rescan'}
        </button>
      </div>

      {/* Settings */}
      <div className="card" style={{ marginBottom:16 }}>
        <div style={{ display:'flex', gap:16, alignItems:'center', flexWrap:'wrap' }}>
          <div className="form-group" style={{ marginBottom:0, minWidth:220 }}>
            <label className="form-label" style={{ fontSize:12 }}>Sensitivity Threshold ({threshold}%)</label>
            <input type="range" min="50" max="90" step="5" value={threshold}
              onChange={e => setThreshold(Number(e.target.value))}
              style={{ width:'100%' }} />
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'var(--text-muted)' }}>
              <span>More results (50%)</span>
              <span>Fewer, high-quality (90%)</span>
            </div>
          </div>
          <div style={{ display:'flex', gap:6 }}>
            {['','High','Medium','Low'].map(c => (
              <button key={c} className={`pill${confidence===c?' active':''}`}
                onClick={() => setConfidence(c)}
                style={{ fontSize:11 }}>
                {c || 'All'} ({c ? pairs.filter(p=>p.confidence===c).length : pairs.length})
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex-center" style={{ height:300, flexDirection:'column', gap:12 }}>
          <div style={{ fontSize:40 }}>🔍</div>
          <div className="text-muted">Scanning {threshold < 70 ? 'broadly' : 'carefully'} for duplicates...</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <MdCheck size={52} style={{ opacity:0.3, marginBottom:12, color:'#10b981' }} />
          <h3>No duplicate patients found</h3>
          <p>Your patient database looks clean! {confidence ? 'Try a different confidence level.' : ''}</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {filtered.map((pair, i) => {
            const cfg = CONFIDENCE_CFG[pair.confidence] || CONFIDENCE_CFG.Low;
            return (
              <div key={i} style={{ border:`1px solid ${cfg.border}`, borderLeft:`5px solid ${cfg.color}`, borderRadius:14, padding:'14px 18px', background:'var(--card-bg)' }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr auto', gap:12, alignItems:'center' }}>
                  {/* Patient 1 */}
                  <div style={{ background:'#f0f9ff', borderRadius:10, padding:'10px 14px' }}>
                    <div style={{ fontWeight:800, fontSize:15 }}>{pair.p1.name}</div>
                    <div className="text-muted text-sm">{pair.p1.patientId} · {pair.p1.phone}</div>
                    <div className="text-muted" style={{ fontSize:11 }}>
                      {pair.p1.age}y {pair.p1.gender} · {pair.p1.city}
                    </div>
                    <div style={{ fontSize:11, color:'#0369a1', marginTop:3 }}>
                      {fmtPKR(pair.p1.totalBilled||0)} billed · Since {fmtDate(pair.p1.createdAt)}
                    </div>
                  </div>

                  {/* Score */}
                  <div style={{ textAlign:'center' }}>
                    <div style={{ fontSize:24, fontWeight:900, color:cfg.color }}>{pair.score}%</div>
                    <div style={{ background:cfg.bg, color:cfg.color, padding:'2px 10px', borderRadius:99, fontSize:11, fontWeight:700 }}>
                      {pair.confidence}
                    </div>
                    <MdArrowForward style={{ color:'var(--text-muted)', marginTop:6 }} size={20} />
                  </div>

                  {/* Patient 2 */}
                  <div style={{ background:'#fff5f5', borderRadius:10, padding:'10px 14px' }}>
                    <div style={{ fontWeight:800, fontSize:15 }}>{pair.p2.name}</div>
                    <div className="text-muted text-sm">{pair.p2.patientId} · {pair.p2.phone}</div>
                    <div className="text-muted" style={{ fontSize:11 }}>
                      {pair.p2.age}y {pair.p2.gender} · {pair.p2.city}
                    </div>
                    <div style={{ fontSize:11, color:'#dc2626', marginTop:3 }}>
                      {fmtPKR(pair.p2.totalBilled||0)} billed · Since {fmtDate(pair.p2.createdAt)}
                    </div>
                  </div>

                  {/* Actions */}
                  <button className="btn btn-danger" onClick={() => setMergeModal(pair)}>
                    <MdMergeType size={16} /> Merge
                  </button>
                </div>

                {/* Reasons */}
                <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:10 }}>
                  {pair.reasons.map((r, j) => (
                    <span key={j} style={{ background:cfg.bg, color:cfg.color, padding:'2px 10px', borderRadius:99, fontSize:11, fontWeight:600 }}>
                      ✓ {r}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {mergeModal && (
        <MergeModal
          pair={mergeModal}
          onClose={() => setMergeModal(null)}
          onMerged={() => { setMergeModal(null); fetch(); }}
        />
      )}
    </div>
  );
}