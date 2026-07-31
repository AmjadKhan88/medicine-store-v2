import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  MdAdd, MdRefresh, MdTrendingUp, MdTrendingDown,
  MdWarning, MdCheck, MdShoppingCart,
  MdAutoGraph, MdFilterList,
} from 'react-icons/md';
import toast from 'react-hot-toast';
import API from '../utils/api';
import ShortLoader from '../Components/ShortLoader';

/* ── helpers ── */
const fmtPKR   = n => `₨${Math.round(Number(n||0)).toLocaleString()}`;
const MONTHS   = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const URGENCY_CFG = {
  Critical: { bg:'#fee2e2', color:'#dc2626', border:'#fca5a5', icon:'🔴' },
  High:     { bg:'#fff7ed', color:'#ea580c', border:'#fed7aa', icon:'🟠' },
  Medium:   { bg:'#fef9c3', color:'#ca8a04', border:'#fde047', icon:'🟡' },
  Low:      { bg:'#f0fdf4', color:'#16a34a', border:'#86efac', icon:'🟢' },
};

const TREND_CFG = {
  Rising:   { color:'#10b981', icon: <MdTrendingUp  size={16} />, label:'Rising'   },
  Falling:  { color:'#ef4444', icon: <MdTrendingDown size={16} />, label:'Falling'  },
  Stable:   { color:'#6b7280', icon: '→',                         label:'Stable'   },
  Volatile: { color:'#f59e0b', icon: '↕',                         label:'Volatile' },
};

const CATEGORIES = ['All','Antibiotic','Analgesic','Antiviral','Respiratory','Gastrointestinal','Cardiovascular','Diabetes','Vitamin & Supplement','Dermatological','Other'];

const nextMonthYear = () => {
  const d = new Date();
  const m = d.getMonth() + 2;
  const y = m > 12 ? d.getFullYear() + 1 : d.getFullYear();
  return { month: m > 12 ? 1 : m, year: y };
};

/* ════════════════════════════════
   GENERATE MODAL
════════════════════════════════ */
function GenerateModal({ onClose, onGenerated }) {
  const def = nextMonthYear();
  const [month,  setMonth]  = useState(String(def.month));
  const [year,   setYear]   = useState(String(def.year));
  const [useAI,  setUseAI]  = useState(true);
  const [loading,setLoading]= useState(false);

  const handle = async () => {
    setLoading(true);
    try {
      const { data } = await API.post('/demand/generate', {
        targetMonth: Number(month),
        targetYear:  Number(year),
        useAI,
      });
      toast.success(data.message);
      if (data.aiInsights?.seasonalAlert) {
        toast(`🇵🇰 ${data.aiInsights.seasonalAlert}`, { duration: 6000, icon: '📊' });
      }
      onGenerated(Number(month), Number(year));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Generation failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <div className="modal-title">Generate Demand Predictions</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>

        <div style={{ background:'#f0f9ff', borderRadius:12, padding:'12px 16px', marginBottom:16, fontSize:13, color:'#0369a1' }}>
          📊 Analyzes your last 12 months of sales + Pakistan seasonal patterns to predict next month's demand.
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label required">Month</label>
            <select className="form-control" value={month} onChange={e => setMonth(e.target.value)}>
              {MONTHS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label required">Year</label>
            <select className="form-control" value={year} onChange={e => setYear(e.target.value)}>
              {[0,1].map(i => <option key={i} value={new Date().getFullYear()+i}>{new Date().getFullYear()+i}</option>)}
            </select>
          </div>
        </div>

        <label style={{ display:'flex', alignItems:'center', gap:12, cursor:'pointer', marginBottom:20, background:'var(--bg-tertiary)', padding:'12px 14px', borderRadius:12 }}>
          <input type="checkbox" checked={useAI} onChange={e => setUseAI(e.target.checked)} />
          <div>
            <div style={{ fontWeight:700, fontSize:13 }}>🤖 Use Gemini AI Enhancement</div>
            <div style={{ fontSize:11, color:'var(--text-muted)' }}>
              Adds Pakistan-specific seasonal insights for top 25 medicines. Takes ~15 seconds extra.
            </div>
          </div>
        </label>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handle} disabled={loading}>
            {loading
              ? <span>⏳ Analyzing {useAI?'+ AI...':'sales...'}</span>
              : <><MdAutoGraph /> Generate Predictions</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════
   CREATE PO MODAL
════════════════════════════════ */
function CreatePOModal({ month, year, urgencyFilter, onClose, onCreated }) {
  const [supplier,setSupplier] = useState('');
  const [urgency, setUrgency]  = useState(urgencyFilter || 'High');
  const [saving,  setSaving]   = useState(false);

  const handle = async () => {
    setSaving(true);
    try {
      const { data } = await API.post('/demand/create-po', {
        month, year,
        urgencyFilter: urgency === 'All' ? undefined : urgency,
        supplierName:  supplier.trim() || 'General Supplier',
      });
      toast.success(data.message);
      onCreated(data.po);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <div className="modal-title">Create Purchase Order</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>

        <div className="form-group">
          <label className="form-label">Include Medicines With Urgency</label>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {['All','Critical','High','Medium'].map(u => (
              <button key={u}
                onClick={() => setUrgency(u)}
                style={{
                  flex:1, padding:'8px 0', borderRadius:10, cursor:'pointer', fontWeight:700, fontSize:13,
                  background: urgency===u ? (URGENCY_CFG[u]?.color||'var(--accent)') : 'var(--bg-tertiary)',
                  color:      urgency===u ? '#fff' : 'var(--text-muted)',
                  border:     `2px solid ${urgency===u ? (URGENCY_CFG[u]?.color||'var(--accent)') : 'var(--border)'}`,
                }}>
                {u}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Supplier Name</label>
          <input className="form-control" value={supplier} onChange={e => setSupplier(e.target.value)}
            placeholder="Leave blank for 'General Supplier'" autoFocus />
        </div>

        <div style={{ background:'#f0fdf4', borderRadius:10, padding:'10px 14px', marginBottom:14, fontSize:12, color:'#166534' }}>
          ✅ A purchase order will be created in your Purchases section with AI-predicted quantities. You can adjust before sending.
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handle} disabled={saving}>
            {saving ? 'Creating PO...' : <><MdShoppingCart /> Create Purchase Order</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════
   MAIN PAGE
════════════════════════════════ */
export default function DemandPredictionPage() {
  const def = nextMonthYear();
  const [predictions, setPredictions] = useState([]);
  const [summary,     setSummary]     = useState({});
  const [stats,       setStats]       = useState({});
  const [accuracy,    setAccuracy]    = useState([]);
  const [total,       setTotal]       = useState(0);
  const [totalPages,  setTotalPages]  = useState(1);
  const [page,        setPage]        = useState(1);
  const [loading,     setLoading]     = useState(false);
  const [activeTab,   setActiveTab]   = useState('predictions');

  const [selMonth,   setSelMonth]  = useState(def.month);
  const [selYear,    setSelYear]   = useState(def.year);
  const [urgency,    setUrgency]   = useState('');
  const [category,   setCategory] = useState('');
  const [sortBy,     setSortBy]   = useState('urgency');
  const [genModal,   setGenModal]  = useState(false);
  const [poModal,    setPoModal]   = useState(false);
  const [expanded,   setExpanded]  = useState(null);

  const fetchPredictions = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/demand', {
        params: { month: selMonth, year: selYear, urgency: urgency||undefined, category: category==='All'?undefined:category||undefined, sortBy, page, limit: 30 },
      });
      setPredictions(data.predictions || []);
      setSummary(data.summary || {});
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch {}
    finally { setLoading(false); }
  }, [selMonth, selYear, urgency, category, sortBy, page]);

  const fetchStats = useCallback(() => {
    API.get('/demand/stats').then(({ data }) => setStats(data.stats || {})).catch(() => {});
  }, []);

  const fetchAccuracy = useCallback(() => {
    API.get('/demand/accuracy').then(({ data }) => setAccuracy(data.history || [])).catch(() => {});
  }, []);

  useEffect(() => { fetchStats(); fetchAccuracy(); }, [fetchStats, fetchAccuracy]);
  useEffect(() => { fetchPredictions(); }, [fetchPredictions]);
  useEffect(() => { setPage(1); }, [selMonth, selYear, urgency, category, sortBy]);

  const handleUpdateActuals = async () => {
    if (!confirm(`Update actual sales for ${MONTHS[selMonth-1]} ${selYear}? This scores prediction accuracy.`)) return;
    try {
      const { data } = await API.post('/demand/update-actuals', { month: selMonth, year: selYear });
      toast.success(data.message);
      fetchPredictions(); fetchAccuracy();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const TABS = [
    { id:'predictions', label:'Predictions'     },
    { id:'charts',      label:'Charts'          },
    { id:'accuracy',    label:'Model Accuracy'  },
  ];

  const urgencyCounts = {
    Critical: predictions.filter(p=>p.urgency==='Critical').length,
    High:     predictions.filter(p=>p.urgency==='High').length,
    Medium:   predictions.filter(p=>p.urgency==='Medium').length,
    Low:      predictions.filter(p=>p.urgency==='Low').length,
  };

  /* ── Chart data ── */
  const chartData = predictions
    .slice(0, 20)
    .map(p => ({
      name:      p.medicineName.split(' ').slice(0,2).join(' '),
      Predicted: p.predictedQty,
      Actual:    p.actualQty || 0,
      Stock:     p.currentStock,
      OrderQty:  p.suggestedOrderQty,
    }));

  const trendData = predictions
    .filter(p => p.historicalData?.length >= 3)
    .slice(0, 5)
    .map(p => {
      const base = {};
      (p.historicalData || []).forEach(h => {
        base[`${MONTHS[h.month-1]} ${h.year}`] = h.qty;
      });
      return { name: p.medicineName.split(' ')[0], ...base };
    });

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>📈 Predictive Medicine Demand</h1>
          <p>
            AI-powered demand forecasting · Pakistan seasonal patterns ·
            {stats.avgAccuracy > 0 && <span style={{ color:'#10b981', fontWeight:700 }}> {stats.avgAccuracy}% historical accuracy</span>}
          </p>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <select className="form-control" style={{ width:110 }} value={selMonth} onChange={e => setSelMonth(Number(e.target.value))}>
            {MONTHS.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
          </select>
          <select className="form-control" style={{ width:90 }} value={selYear} onChange={e => setSelYear(Number(e.target.value))}>
            {[0,1].map(i => <option key={i} value={new Date().getFullYear()+i}>{new Date().getFullYear()+i}</option>)}
          </select>
          <button className="btn btn-secondary btn-sm" onClick={() => { fetchPredictions(); fetchStats(); }}>
            <MdRefresh />
          </button>
          {predictions.length > 0 && (
            <button className="btn btn-secondary" onClick={() => setPoModal(true)}>
              <MdShoppingCart /> Create PO
            </button>
          )}
          <button className="btn btn-primary" onClick={() => setGenModal(true)}>
            <MdAutoGraph /> Generate
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom:20 }}>
        {[
          { label:'Predictions Generated', value: total || stats.nextMonthPredictions || 0, color:'#0ea5e9', icon:'📊' },
          { label:'Critical Stock',         value: summary.critical || stats.critical || 0, color:'#dc2626', icon:'🔴' },
          { label:'High Urgency',           value: summary.high     || stats.high     || 0, color:'#ea580c', icon:'🟠' },
          { label:'Rising Demand',          value: summary.rising   || stats.rising   || 0, color:'#10b981', icon:'📈' },
          { label:'Avg Accuracy',           value: `${stats.avgAccuracy||0}%`,              color:'#8b5cf6', icon:'🎯' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background:s.color+'20', fontSize:20 }}>{s.icon}</div>
            <div>
              <div className="stat-value" style={{ color:s.color, fontSize:typeof s.value==='string'?18:24 }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Seasonal alert */}
      {summary.seasonalNote && (
        <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:12, padding:'10px 16px', marginBottom:16, fontSize:13, color:'#92400e', display:'flex', gap:10, alignItems:'center' }}>
          <span style={{ fontSize:20 }}>🇵🇰</span>
          <div>
            <strong>{MONTHS[selMonth-1]} {selYear} Seasonal Context: </strong>
            {summary.seasonalNote}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:20, borderBottom:'1px solid var(--border)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{ padding:'10px 16px', background:'none', border:'none', borderBottom: activeTab===t.id?'2px solid var(--accent)':'2px solid transparent', color: activeTab===t.id?'var(--accent)':'var(--text-muted)', fontWeight: activeTab===t.id?700:500, cursor:'pointer', fontSize:14, fontFamily:'var(--font-main)' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── PREDICTIONS TAB ── */}
      {activeTab === 'predictions' && (
        <div>
          {/* Filters */}
          <div className="card" style={{ marginBottom:14 }}>
            <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {['','Critical','High','Medium','Low'].map(u => {
                  const cfg = u ? URGENCY_CFG[u] : null;
                  return (
                    <button key={u||'all'}
                      className={`pill${urgency===u?' active':''}`}
                      onClick={() => setUrgency(u)}
                      style={{ fontSize:11, background: urgency===u && cfg ? cfg.color : '', color: urgency===u && cfg ? '#fff' : '' }}>
                      {u ? `${cfg?.icon} ${u} (${urgencyCounts[u]||0})` : `All (${total})`}
                    </button>
                  );
                })}
              </div>
              <select className="form-control" style={{ width:170, marginLeft:'auto' }} value={category} onChange={e => setCategory(e.target.value)}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
              <select className="form-control" style={{ width:150 }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
                <option value="urgency">Sort: Urgency</option>
                <option value="qty">Sort: Predicted Qty</option>
                <option value="stock">Sort: Days of Stock</option>
                <option value="trend">Sort: Trend</option>
              </select>
              <button className="btn btn-secondary btn-sm" onClick={handleUpdateActuals}>
                <MdCheck size={14} /> Update Actuals
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex-center" style={{ height:200 }}><ShortLoader/></div>
          ) : predictions.length === 0 ? (
            <div className="empty-state">
              <MdAutoGraph size={56} style={{ opacity:0.3, marginBottom:16 }} />
              <h3>No predictions for {MONTHS[selMonth-1]} {selYear}</h3>
              <p>Click "Generate" to run the AI demand forecast for this month.</p>
              <button className="btn btn-primary" style={{ marginTop:14 }} onClick={() => setGenModal(true)}>
                <MdAutoGraph /> Generate Predictions
              </button>
            </div>
          ) : (
            <>
              {/* Prediction cards */}
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {predictions.map(p => {
                  const uc  = URGENCY_CFG[p.urgency] || URGENCY_CFG.Low;
                  const tc  = TREND_CFG[p.trend] || TREND_CFG.Stable;
                  const isExpanded = expanded === p._id;

                  return (
                    <div key={p._id} style={{ border:`1px solid ${uc.border}`, borderLeft:`5px solid ${uc.color}`, borderRadius:12, background: isExpanded?uc.bg+'50':'var(--card-bg)', overflow:'hidden' }}>
                      {/* Main row */}
                      <div
                        style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr 1fr auto', gap:12, padding:'12px 16px', alignItems:'center', cursor:'pointer' }}
                        onClick={() => setExpanded(isExpanded ? null : p._id)}>

                        {/* Name + category */}
                        <div>
                          <div style={{ fontWeight:700, fontSize:14 }}>{p.medicineName}</div>
                          <div style={{ display:'flex', gap:6, marginTop:3, flexWrap:'wrap' }}>
                            <span style={{ background:'var(--bg-tertiary)', padding:'2px 8px', borderRadius:6, fontSize:10, color:'var(--text-muted)' }}>{p.category}</span>
                            <span style={{ background:uc.bg, color:uc.color, padding:'2px 8px', borderRadius:6, fontSize:10, fontWeight:700 }}>
                              {uc.icon} {p.urgency}
                            </span>
                          </div>
                        </div>

                        {/* Predicted */}
                        <div style={{ textAlign:'center' }}>
                          <div style={{ fontWeight:900, fontSize:18, color:'var(--accent)' }}>{p.predictedQty}</div>
                          <div style={{ fontSize:10, color:'var(--text-muted)' }}>Predicted</div>
                          <div style={{ fontSize:10, color:'var(--text-muted)' }}>[{p.confidenceInterval?.lower}–{p.confidenceInterval?.upper}]</div>
                        </div>

                        {/* Actual */}
                        <div style={{ textAlign:'center' }}>
                          {p.actualQty != null ? (
                            <>
                              <div style={{ fontWeight:700, fontSize:16, color: p.wasAccurate?'#10b981':'#f59e0b' }}>{p.actualQty}</div>
                              <div style={{ fontSize:10, color: p.wasAccurate?'#10b981':'#f59e0b', fontWeight:700 }}>
                                {p.accuracyPct}% acc
                              </div>
                            </>
                          ) : (
                            <div style={{ fontSize:11, color:'var(--text-muted)' }}>—<br/>Pending</div>
                          )}
                        </div>

                        {/* Trend */}
                        <div style={{ textAlign:'center' }}>
                          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:4, color:tc.color, fontWeight:700 }}>
                            {tc.icon} {p.trendPercent > 0 ? '+' : ''}{p.trendPercent}%
                          </div>
                          <div style={{ fontSize:10, color:'var(--text-muted)' }}>{p.trend}</div>
                        </div>

                        {/* Stock */}
                        <div style={{ textAlign:'center' }}>
                          <div style={{ fontWeight:700, color: p.daysOfStockLeft < 7?'#ef4444':p.daysOfStockLeft<14?'#f59e0b':'#10b981' }}>
                            {p.daysOfStockLeft}d
                          </div>
                          <div style={{ fontSize:10, color:'var(--text-muted)' }}>{p.currentStock} in stock</div>
                        </div>

                        {/* Suggested order */}
                        <div style={{ textAlign:'center' }}>
                          {p.suggestedOrderQty > 0 ? (
                            <>
                              <div style={{ fontWeight:800, fontSize:16, color:'#dc2626' }}>{p.suggestedOrderQty}</div>
                              <div style={{ fontSize:10, color:'var(--text-muted)' }}>Order by</div>
                              <div style={{ fontSize:10, color:'#dc2626', fontWeight:600 }}>
                                {p.suggestedOrderDate ? new Date(p.suggestedOrderDate).toLocaleDateString('en-PK',{day:'2-digit',month:'short'}) : '—'}
                              </div>
                            </>
                          ) : (
                            <div style={{ fontSize:11, color:'#10b981', fontWeight:700 }}>✓ Sufficient</div>
                          )}
                        </div>

                        <div style={{ color:'var(--text-muted)' }}>{isExpanded ? '▲' : '▼'}</div>
                      </div>

                      {/* Expanded row */}
                      {isExpanded && (
                        <div style={{ borderTop:'1px solid var(--border)', padding:'12px 16px', background:uc.bg+'30' }}>
                          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                            {/* Monthly history mini-chart */}
                            <div>
                              <div style={{ fontWeight:700, fontSize:12, marginBottom:8, color:'var(--text-muted)' }}>SALES HISTORY</div>
                              <div style={{ display:'flex', gap:4, alignItems:'flex-end', height:50 }}>
                                {(p.historicalData || []).map((h, i) => {
                                  const maxQ = Math.max(...(p.historicalData||[]).map(x=>x.qty), p.predictedQty);
                                  const height = maxQ > 0 ? Math.max(4, Math.round((h.qty / maxQ) * 50)) : 4;
                                  return (
                                    <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                                      <div style={{ height, background:uc.color, borderRadius:'2px 2px 0 0', width:'100%', opacity:0.7 }} />
                                      <div style={{ fontSize:9, color:'var(--text-muted)' }}>{MONTHS[h.month-1].slice(0,1)}</div>
                                    </div>
                                  );
                                })}
                                {/* Prediction bar */}
                                <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                                  <div style={{ height: Math.max(4, Math.round((p.predictedQty / Math.max(...(p.historicalData||[]).map(x=>x.qty), p.predictedQty)) * 50)), background:'var(--accent)', borderRadius:'2px 2px 0 0', width:'100%', border:'2px dashed var(--accent)' }} />
                                  <div style={{ fontSize:9, color:'var(--accent)', fontWeight:700 }}>{MONTHS[selMonth-1].slice(0,1)}</div>
                                </div>
                              </div>
                            </div>

                            {/* Details */}
                            <div>
                              <div style={{ fontWeight:700, fontSize:12, marginBottom:8, color:'var(--text-muted)' }}>DETAILS</div>
                              {[
                                ['Avg Monthly Sales', `${p.avgMonthlySales} units`],
                                ['Total 12m Sales',   `${p.totalSales12m} units`],
                                ['Seasonal Factor',   `×${p.seasonalityFactor}${p.seasonalityFactor !== 1 ? (p.seasonalityFactor > 1 ? ' (peak season)' : ' (off-season)') : ''}`],
                                ['Confidence',        p.confidence],
                              ].map(([k,v]) => (
                                <div key={k} style={{ display:'flex', justifyContent:'space-between', fontSize:12, padding:'3px 0', borderBottom:'1px solid var(--border-light)' }}>
                                  <span className="text-muted">{k}</span>
                                  <span style={{ fontWeight:600 }}>{v}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* AI Insight */}
                          {p.aiInsight && (
                            <div style={{ marginTop:10, background:'#f0f9ff', borderRadius:8, padding:'8px 12px', fontSize:12, color:'#0369a1' }}>
                              <strong>🤖 AI Insight:</strong> {p.aiInsight}
                            </div>
                          )}

                          {/* Seasonal note */}
                          {p.seasonalNote && (
                            <div style={{ marginTop:6, fontSize:11, color:'#92400e', fontStyle:'italic' }}>
                              🇵🇰 {p.seasonalNote}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="pagination" style={{ marginTop:14 }}>
                  <button disabled={page===1} onClick={()=>setPage(p=>p-1)}>‹</button>
                  {Array.from({length:totalPages},(_,i)=>i+1).map(p=>(
                    <button key={p} className={page===p?'active':''} onClick={()=>setPage(p)}>{p}</button>
                  ))}
                  <button disabled={page===totalPages} onClick={()=>setPage(p=>p+1)}>›</button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── CHARTS TAB ── */}
      {activeTab === 'charts' && (
        <div>
          {chartData.length === 0 ? (
            <div className="empty-state"><MdAutoGraph size={48} style={{ opacity:0.3, marginBottom:12 }}/><h3>Generate predictions first</h3></div>
          ) : (
            <>
              {/* Predicted vs Stock vs Order */}
              <div className="card" style={{ marginBottom:16 }}>
                <div style={{ fontWeight:700, marginBottom:14 }}>Top 20 — Predicted Demand vs Current Stock vs Suggested Order</div>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={chartData} margin={{ top:5, right:20, left:10, bottom:60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fontSize:10 }} angle={-35} textAnchor="end" interval={0} />
                    <YAxis tick={{ fontSize:10 }} />
                    <Tooltip />
                    <Legend verticalAlign="top" />
                    <Bar dataKey="Predicted" name="Predicted Demand" fill="#0ea5e9" radius={[4,4,0,0]} />
                    <Bar dataKey="Stock"     name="Current Stock"    fill="#10b981" radius={[4,4,0,0]} />
                    <Bar dataKey="OrderQty"  name="Suggested Order"  fill="#f97316" radius={[4,4,0,0]} />
                    {predictions.some(p=>p.actualQty) && (
                      <Bar dataKey="Actual" name="Actual (recorded)" fill="#8b5cf6" radius={[4,4,0,0]} />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Urgency pie-like summary */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                <div className="card">
                  <div style={{ fontWeight:700, marginBottom:12 }}>Stock Coverage Distribution</div>
                  {[
                    { label:'< 7 days (Critical)',  count: predictions.filter(p=>p.daysOfStockLeft<7).length,  color:'#ef4444' },
                    { label:'7-14 days (High)',      count: predictions.filter(p=>p.daysOfStockLeft>=7&&p.daysOfStockLeft<14).length, color:'#f97316' },
                    { label:'14-21 days (Medium)',   count: predictions.filter(p=>p.daysOfStockLeft>=14&&p.daysOfStockLeft<21).length, color:'#f59e0b' },
                    { label:'21+ days (Good)',       count: predictions.filter(p=>p.daysOfStockLeft>=21).length, color:'#10b981' },
                  ].map(d => {
                    const pct = predictions.length > 0 ? Math.round((d.count/predictions.length)*100) : 0;
                    return (
                      <div key={d.label} style={{ marginBottom:10 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:3 }}>
                          <span style={{ color:d.color, fontWeight:600 }}>{d.label}</span>
                          <span style={{ fontWeight:700 }}>{d.count} ({pct}%)</span>
                        </div>
                        <div style={{ height:8, background:'var(--border)', borderRadius:99, overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${pct}%`, background:d.color, borderRadius:99 }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="card">
                  <div style={{ fontWeight:700, marginBottom:12 }}>Trend Distribution</div>
                  {['Rising','Stable','Falling','Volatile'].map(t => {
                    const count = predictions.filter(p=>p.trend===t).length;
                    const pct   = predictions.length > 0 ? Math.round((count/predictions.length)*100) : 0;
                    const tc    = TREND_CFG[t];
                    return (
                      <div key={t} style={{ marginBottom:10 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:3 }}>
                          <span style={{ color:tc.color, fontWeight:600, display:'flex', alignItems:'center', gap:6 }}>
                            {tc.icon} {t}
                          </span>
                          <span style={{ fontWeight:700 }}>{count} ({pct}%)</span>
                        </div>
                        <div style={{ height:8, background:'var(--border)', borderRadius:99, overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${pct}%`, background:tc.color, borderRadius:99 }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── ACCURACY TAB ── */}
      {activeTab === 'accuracy' && (
        <div>
          {accuracy.length === 0 ? (
            <div className="empty-state">
              <MdAutoGraph size={48} style={{ opacity:0.3, marginBottom:12 }} />
              <h3>No accuracy data yet</h3>
              <p>After a month ends, click "Update Actuals" to score prediction accuracy.</p>
            </div>
          ) : (
            <>
              <div className="card" style={{ marginBottom:16 }}>
                <div style={{ fontWeight:700, marginBottom:14 }}>Prediction Accuracy Over Time (%)</div>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={accuracy} margin={{ top:5, right:20, left:10, bottom:5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="label"        tick={{ fontSize:10 }} />
                    <YAxis domain={[0,100]}        tick={{ fontSize:10 }} />
                    <Tooltip formatter={v => [`${v}%`]} />
                    <Legend />
                    <ReferenceLine y={80} stroke="#10b981" strokeDasharray="4 4" label={{ value:'Target 80%', fontSize:11, fill:'#10b981' }} />
                    <Line type="monotone" dataKey="avgAccuracy" name="Avg Accuracy %" stroke="var(--accent)" strokeWidth={3} dot={{ r:5 }} />
                    <Line type="monotone" dataKey="hitRate" name="Hit Rate % (within 20%)" stroke="#10b981" strokeWidth={2} dot={{ r:4 }} strokeDasharray="4 4" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Table */}
              <div className="card" style={{ padding:0, overflow:'hidden' }}>
                <table className="table" style={{ fontSize:13 }}>
                  <thead>
                    <tr>
                      <th>Period</th>
                      <th>Medicines Predicted</th>
                      <th>Avg Accuracy</th>
                      <th>Hit Rate (±20%)</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accuracy.map(a => (
                      <tr key={a.label}>
                        <td style={{ fontWeight:600 }}>{a.label}</td>
                        <td>{a.total}</td>
                        <td>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <div style={{ width:60, height:6, background:'var(--border)', borderRadius:99, overflow:'hidden' }}>
                              <div style={{ height:'100%', width:`${a.avgAccuracy}%`, background: a.avgAccuracy>=80?'#10b981':a.avgAccuracy>=60?'#f59e0b':'#ef4444', borderRadius:99 }} />
                            </div>
                            <span style={{ fontWeight:700, color: a.avgAccuracy>=80?'#10b981':a.avgAccuracy>=60?'#f59e0b':'#ef4444' }}>
                              {a.avgAccuracy}%
                            </span>
                          </div>
                        </td>
                        <td style={{ fontWeight:600 }}>{a.hitRate}%</td>
                        <td>
                          <span style={{ background: a.avgAccuracy>=80?'#d1fae5':a.avgAccuracy>=60?'#fef3c7':'#fee2e2', color: a.avgAccuracy>=80?'#10b981':a.avgAccuracy>=60?'#f59e0b':'#ef4444', padding:'2px 10px', borderRadius:99, fontSize:11, fontWeight:700 }}>
                            {a.avgAccuracy >= 80 ? '✓ Excellent' : a.avgAccuracy >= 60 ? '~ Good' : '✗ Needs data'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Modals */}
      {genModal && (
        <GenerateModal
          onClose={() => setGenModal(false)}
          onGenerated={(m, y) => { setGenModal(false); setSelMonth(m); setSelYear(y); fetchPredictions(); fetchStats(); }}
        />
      )}
      {poModal && (
        <CreatePOModal
          month={selMonth} year={selYear} urgencyFilter={urgency||'High'}
          onClose={() => setPoModal(false)}
          onCreated={() => { setPoModal(false); toast.success('Purchase order created! Check Purchases section.'); }}
        />
      )}
    </div>
  );
}