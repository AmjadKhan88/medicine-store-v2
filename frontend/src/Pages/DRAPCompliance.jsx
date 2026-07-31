import { useState, useEffect, useCallback, useRef } from 'react';
import {
  MdAdd, MdClose, MdRefresh, MdPrint, MdSearch,
  MdWarning, MdCheck, MdDelete, MdEdit,
  MdDownload, MdShield, MdScience,
} from 'react-icons/md';
import toast from 'react-hot-toast';
import API from '../utils/api';
import ShortLoader from '../Components/ShortLoader';

/* ── helpers ── */
const fmtPKR  = n => `₨${Math.round(Number(n||0)).toLocaleString()}`;
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-PK', { day:'2-digit', month:'short', year:'numeric' }) : '—';
const fmtDT   = d => d ? `${fmtDate(d)} ${new Date(d).toLocaleTimeString('en-PK',{hour:'2-digit',minute:'2-digit'})}` : '—';
const monthISO= () => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}`; };

/* ════════════════════════════════
   ADD DESTRUCTION MODAL
════════════════════════════════ */
function DestructionModal({ expired, onClose, onSaved }) {
  const [medicines, setMedicines] = useState([]);
  const [mSearch,   setMSearch]   = useState('');
  const [selected,  setSelected]  = useState(null);
  const [form, setForm] = useState({
    medicineName:'', genericName:'', batchNumber:'', manufacturer:'',
    expiryDate:'', dosageForm:'', strength:'', quantityDestroyed:'',
    unit:'Pcs', purchaseValue:'', destructionDate: new Date().toISOString().slice(0,10),
    destructionMethod:'Incineration', reason:'Expired', destructionLocation:'',
    pharmacistName:'', pharmacistLicense:'', witnessName:'', witnessDesignation:'',
    requiresDrapNotification: false, notes:'',
  });
  const [saving, setSaving] = useState(false);
  const fld = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const chk = k => e => setForm(p => ({ ...p, [k]: e.target.checked }));

  useEffect(() => {
    if (mSearch.length < 2) { setMedicines([]); return; }
    API.get('/medicines', { params: { search: mSearch, limit: 6 } })
      .then(({ data }) => setMedicines(data.medicines || []))
      .catch(() => {});
  }, [mSearch]);

  const pickMedicine = med => {
    setSelected(med);
    setMSearch('');
    setMedicines([]);
    setForm(p => ({
      ...p,
      medicineName: med.name,
      genericName:  med.genericName || '',
      batchNumber:  med.batchNumber || '',
      manufacturer: med.manufacturer || '',
      expiryDate:   med.expiryDate ? new Date(med.expiryDate).toISOString().slice(0,10) : '',
      dosageForm:   med.dosageForm || '',
      strength:     med.strength || '',
      purchaseValue:med.purchasePrice ? String(Number(med.purchasePrice)) : '',
      unit:         med.unit || 'Pcs',
    }));
  };

  // Pre-populate from expired list
  useEffect(() => {
    if (expired) pickMedicine(expired);
  }, [expired]);

  const handle = async () => {
    if (!form.medicineName || !form.quantityDestroyed || !form.expiryDate) {
      toast.error('Medicine name, quantity and expiry date required'); return;
    }
    setSaving(true);
    try {
      await API.post('/drap/destructions', { ...form, medicineId: selected?._id });
      toast.success(`Destruction record added for ${form.medicineName}`);
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg" style={{ maxHeight:'88vh', overflowY:'auto' }}>
        <div className="modal-header">
          <div className="modal-title">Record Expiry Destruction</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><MdClose /></button>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          <div>
            <div style={{ fontWeight:700, fontSize:12, textTransform:'uppercase', letterSpacing:1, color:'var(--text-muted)', marginBottom:10 }}>
              Medicine Details
            </div>

            {!selected ? (
              <div className="form-group" style={{ position:'relative' }}>
                <label className="form-label required">Search Medicine</label>
                <div className="search-box">
                  <MdSearch className="search-icon" />
                  <input placeholder="Search by name..." value={mSearch} onChange={e => setMSearch(e.target.value)} autoFocus />
                </div>
                {medicines.length > 0 && (
                  <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'var(--card-bg)', border:'1px solid var(--border)', borderRadius:10, zIndex:100, boxShadow:'var(--shadow-lg)', marginTop:4 }}>
                    {medicines.map(m => (
                      <div key={m._id} style={{ padding:'10px 14px', cursor:'pointer', borderBottom:'1px solid var(--border-light)', fontSize:13 }}
                        onMouseDown={() => pickMedicine(m)}>
                        <div style={{ fontWeight:600 }}>{m.name} {m.strength}</div>
                        <div className="text-muted">{m.batchNumber} · Exp: {fmtDate(m.expiryDate)} · Stock: {m.stock}</div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="form-group" style={{ marginTop:8 }}>
                  <label className="form-label">Or enter manually</label>
                  <input className="form-control" value={form.medicineName} onChange={fld('medicineName')} placeholder="Medicine name" />
                </div>
              </div>
            ) : (
              <div style={{ background:'var(--bg-tertiary)', borderRadius:10, padding:12, marginBottom:10 }}>
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <div style={{ fontWeight:700 }}>{selected.name}</div>
                  <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)} style={{ fontSize:11 }}>Change</button>
                </div>
                <div className="text-muted text-sm">Batch: {selected.batchNumber} · Exp: {fmtDate(selected.expiryDate)} · Stock: {selected.stock}</div>
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Batch Number</label>
                <input className="form-control" value={form.batchNumber} onChange={fld('batchNumber')} placeholder="BATCH-001" />
              </div>
              <div className="form-group">
                <label className="form-label required">Expiry Date</label>
                <input className="form-control" type="date" value={form.expiryDate} onChange={fld('expiryDate')} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Manufacturer</label>
              <input className="form-control" value={form.manufacturer} onChange={fld('manufacturer')} />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label required">Quantity</label>
                <input className="form-control" type="number" min="1" value={form.quantityDestroyed} onChange={fld('quantityDestroyed')} />
              </div>
              <div className="form-group">
                <label className="form-label">Unit</label>
                <select className="form-control" value={form.unit} onChange={fld('unit')}>
                  {['Pcs','Strip','Box','Bottle','Vial','Tube'].map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Purchase Value (₨)</label>
              <input className="form-control" type="number" min="0" value={form.purchaseValue} onChange={fld('purchaseValue')} placeholder="0" />
            </div>

            <div className="form-group">
              <label className="form-label">Reason</label>
              <select className="form-control" value={form.reason} onChange={fld('reason')}>
                {['Expired','Damaged','Recalled','Contaminated','Other'].map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
          </div>

          <div>
            <div style={{ fontWeight:700, fontSize:12, textTransform:'uppercase', letterSpacing:1, color:'var(--text-muted)', marginBottom:10 }}>
              Destruction Details
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label required">Destruction Date</label>
                <input className="form-control" type="date" value={form.destructionDate} onChange={fld('destructionDate')} />
              </div>
              <div className="form-group">
                <label className="form-label">Method</label>
                <select className="form-control" value={form.destructionMethod} onChange={fld('destructionMethod')}>
                  {['Incineration','Chemical Neutralization','Landfill','Return to Supplier','Other'].map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Destruction Location</label>
              <input className="form-control" value={form.destructionLocation} onChange={fld('destructionLocation')} placeholder="e.g. Municipal Incinerator, Lahore" />
            </div>

            <div style={{ fontWeight:700, fontSize:12, textTransform:'uppercase', letterSpacing:1, color:'var(--text-muted)', margin:'12px 0 8px' }}>
              Authorization
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Pharmacist Name</label>
                <input className="form-control" value={form.pharmacistName} onChange={fld('pharmacistName')} />
              </div>
              <div className="form-group">
                <label className="form-label">License No.</label>
                <input className="form-control" value={form.pharmacistLicense} onChange={fld('pharmacistLicense')} placeholder="PCP-XXXXX" />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Witness Name</label>
                <input className="form-control" value={form.witnessName} onChange={fld('witnessName')} />
              </div>
              <div className="form-group">
                <label className="form-label">Witness Designation</label>
                <input className="form-control" value={form.witnessDesignation} onChange={fld('witnessDesignation')} placeholder="e.g. Shop Owner" />
              </div>
            </div>

            <div style={{ background:'var(--bg-tertiary)', borderRadius:10, padding:12, marginBottom:10 }}>
              <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', fontSize:13 }}>
                <input type="checkbox" checked={form.requiresDrapNotification} onChange={chk('requiresDrapNotification')} />
                <span style={{ fontWeight:600 }}>DRAP Notification Required (Schedule H/Controlled)</span>
              </label>
            </div>

            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="form-control" rows={2} value={form.notes} onChange={fld('notes')} />
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handle} disabled={saving || !form.medicineName || !form.quantityDestroyed}>
            {saving ? 'Saving...' : 'Record Destruction'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════
   COMPLIANCE REPORT PRINT VIEW
════════════════════════════════ */
function ComplianceReport({ report, onClose }) {
  const printRef = useRef(null);

  const handlePrint = () => window.print();

  const score      = report.complianceStatus?.score || 0;
  const scoreColor = score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg" style={{ maxWidth:700, maxHeight:'90vh', overflowY:'auto' }}>
        <div className="modal-header no-print">
          <div className="modal-title">DRAP Compliance Report — {report.store?.reportFor}</div>
          <div style={{ display:'flex', gap:8 }}>
            <button className="btn btn-primary" onClick={handlePrint}><MdPrint /> Print / PDF</button>
            <button className="btn btn-ghost btn-icon" onClick={onClose}><MdClose /></button>
          </div>
        </div>

        <div ref={printRef} id="compliance-report" style={{ padding:'20px 24px', fontFamily:'sans-serif' }}>
          {/* Report header */}
          <div style={{ textAlign:'center', borderBottom:'2px solid #1e3a5f', paddingBottom:14, marginBottom:16 }}>
            <div style={{ fontSize:11, color:'#666', marginBottom:2 }}>DRUG REGULATORY AUTHORITY OF PAKISTAN (DRAP)</div>
            <div style={{ fontSize:20, fontWeight:900, color:'#1e3a5f' }}>PHARMACY COMPLIANCE REPORT</div>
            <div style={{ fontSize:13, fontWeight:600, color:'#333', marginTop:4 }}>
              {report.store?.name}
            </div>
            <div style={{ fontSize:12, color:'#666' }}>
              Period: {report.store?.reportFor} · Generated: {fmtDate(report.store?.generatedAt)}
            </div>
          </div>

          {/* Compliance score */}
          <div style={{ display:'flex', alignItems:'center', gap:20, marginBottom:20, background:'#f9f9f9', borderRadius:12, padding:'14px 18px', border:`2px solid ${scoreColor}20` }}>
            <div style={{ textAlign:'center', minWidth:80 }}>
              <div style={{ fontSize:42, fontWeight:900, color:scoreColor, lineHeight:1 }}>{score}%</div>
              <div style={{ fontSize:11, color:'#666' }}>Compliance Score</div>
            </div>
            <div>
              {[
                { label:'Controlled Medicines Register', ok: true },
                { label:'Expiry Destruction Records',    ok: report.complianceStatus?.hasDestructionRecords },
                { label:'Supplier Purchase Records',     ok: report.complianceStatus?.hasPurchaseRecords },
                { label:'No Expired Stock in Store',     ok: !report.complianceStatus?.hasExpiredStock },
              ].map(item => (
                <div key={item.label} style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, marginBottom:4 }}>
                  <span style={{ color: item.ok?'#10b981':'#ef4444', fontSize:16 }}>{item.ok?'✓':'✗'}</span>
                  <span style={{ color: item.ok?'#166534':'#dc2626', fontWeight: item.ok?500:700 }}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 1: Sales Summary */}
          <div style={{ marginBottom:18 }}>
            <div style={{ background:'#1e3a5f', color:'#fff', padding:'6px 12px', fontSize:12, fontWeight:700, borderRadius:'6px 6px 0 0' }}>
              1. PHARMACY SALES SUMMARY — {report.store?.reportFor}
            </div>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <tbody>
                {[
                  ['Total Bills/Invoices Issued', report.sales?.totalBills],
                  ['Total Revenue',               fmtPKR(report.sales?.totalRevenue)],
                  ['Total Items Dispensed',        report.sales?.totalItems],
                  ['Prescription Medicines Sold (Transactions)', report.controlled?.transactions],
                  ['Prescription Medicines Qty',   report.controlled?.totalQty],
                ].map(([k,v],i) => (
                  <tr key={k} style={{ background: i%2===0?'#f9f9f9':'#fff' }}>
                    <td style={{ padding:'7px 12px', color:'#555', borderBottom:'1px solid #eee' }}>{k}</td>
                    <td style={{ padding:'7px 12px', fontWeight:600, textAlign:'right', borderBottom:'1px solid #eee' }}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Section 2: Inventory */}
          <div style={{ marginBottom:18 }}>
            <div style={{ background:'#1e3a5f', color:'#fff', padding:'6px 12px', fontSize:12, fontWeight:700, borderRadius:'6px 6px 0 0' }}>
              2. INVENTORY STATUS
            </div>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <tbody>
                {[
                  ['Total Active Medicines',        report.inventory?.total],
                  ['Controlled/Prescription Drugs', report.inventory?.controlled],
                  ['Currently Expired in Stock',    { value: report.inventory?.expired, warn: report.inventory?.expired > 0 }],
                  ['Expiring Within 30 Days',       report.inventory?.expiringSoon],
                  ['Total Inventory Value',          fmtPKR(report.inventory?.totalValue)],
                ].map(([k,v],i) => {
                  const warn = typeof v === 'object' && v?.warn;
                  const val  = typeof v === 'object' ? v?.value : v;
                  return (
                    <tr key={k} style={{ background: warn?'#fff5f5':i%2===0?'#f9f9f9':'#fff' }}>
                      <td style={{ padding:'7px 12px', color:'#555', borderBottom:'1px solid #eee' }}>{k}</td>
                      <td style={{ padding:'7px 12px', fontWeight:600, textAlign:'right', borderBottom:'1px solid #eee', color: warn?'#dc2626':'inherit' }}>
                        {warn && '⚠️ '}{val}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Section 3: Expiry Destructions */}
          <div style={{ marginBottom:18 }}>
            <div style={{ background:'#1e3a5f', color:'#fff', padding:'6px 12px', fontSize:12, fontWeight:700, borderRadius:'6px 6px 0 0' }}>
              3. EXPIRY DESTRUCTION REGISTER — {report.store?.reportFor}
            </div>
            {report.destructions?.records?.length > 0 ? (
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                <thead style={{ background:'#f0f0f0' }}>
                  <tr>
                    {['Medicine','Batch','Qty','Expiry','Destroyed On','Method','Witness'].map(h => (
                      <th key={h} style={{ padding:'6px 8px', textAlign:'left', borderBottom:'2px solid #ccc', fontWeight:700 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.destructions.records.map((d,i) => (
                    <tr key={d._id} style={{ background:i%2===0?'#f9f9f9':'#fff' }}>
                      <td style={{ padding:'6px 8px', borderBottom:'1px solid #eee' }}>{d.medicineName}</td>
                      <td style={{ padding:'6px 8px', borderBottom:'1px solid #eee' }}>{d.batchNumber||'—'}</td>
                      <td style={{ padding:'6px 8px', borderBottom:'1px solid #eee' }}>{d.quantityDestroyed} {d.unit}</td>
                      <td style={{ padding:'6px 8px', borderBottom:'1px solid #eee' }}>{fmtDate(d.expiryDate)}</td>
                      <td style={{ padding:'6px 8px', borderBottom:'1px solid #eee' }}>{fmtDate(d.destructionDate)}</td>
                      <td style={{ padding:'6px 8px', borderBottom:'1px solid #eee' }}>{d.destructionMethod}</td>
                      <td style={{ padding:'6px 8px', borderBottom:'1px solid #eee' }}>{d.witnessName||'—'}</td>
                    </tr>
                  ))}
                  <tr style={{ background:'#f0f0f0', fontWeight:700 }}>
                    <td colSpan={2} style={{ padding:'6px 8px' }}>TOTAL</td>
                    <td style={{ padding:'6px 8px' }}>{report.destructions?.quantity} units</td>
                    <td colSpan={4} style={{ padding:'6px 8px' }}>Value: {fmtPKR(report.destructions?.value)}</td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <div style={{ padding:'12px 16px', fontSize:12, color:'#666', background:'#f9f9f9' }}>
                No expiry destruction records for this period.
              </div>
            )}
          </div>

          {/* Section 4: Purchase Records Summary */}
          <div style={{ marginBottom:18 }}>
            <div style={{ background:'#1e3a5f', color:'#fff', padding:'6px 12px', fontSize:12, fontWeight:700, borderRadius:'6px 6px 0 0' }}>
              4. SUPPLIER PURCHASE RECORDS — {report.store?.reportFor}
            </div>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <tbody>
                {[
                  ['Total Purchase Orders', report.purchases?.total],
                  ['Total Purchase Value',  fmtPKR(report.purchases?.totalValue)],
                  ['Approved Suppliers',    report.purchases?.suppliers?.join(', ') || '—'],
                ].map(([k,v],i) => (
                  <tr key={k} style={{ background:i%2===0?'#f9f9f9':'#fff' }}>
                    <td style={{ padding:'7px 12px', color:'#555', borderBottom:'1px solid #eee' }}>{k}</td>
                    <td style={{ padding:'7px 12px', fontWeight:600, textAlign:'right', borderBottom:'1px solid #eee' }}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Expired stock warning */}
          {report.alerts?.expiredInStock > 0 && (
            <div style={{ background:'#fff5f5', border:'2px solid #fca5a5', borderRadius:10, padding:'12px 16px', marginBottom:16 }}>
              <div style={{ fontWeight:700, color:'#dc2626', marginBottom:6 }}>
                ⚠️ COMPLIANCE ISSUE: {report.alerts.expiredInStock} Medicine(s) Expired in Stock
              </div>
              <table style={{ width:'100%', fontSize:11, borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ background:'#fee2e2' }}>
                    {['Medicine','Batch','Qty in Stock','Expired On'].map(h => <th key={h} style={{ padding:'5px 8px', textAlign:'left' }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {report.alerts.expiredMedicines.map((m,i) => (
                    <tr key={i}>
                      <td style={{ padding:'5px 8px' }}>{m.name}</td>
                      <td style={{ padding:'5px 8px' }}>{m.batch||'—'}</td>
                      <td style={{ padding:'5px 8px', color:'#dc2626', fontWeight:700 }}>{m.qty}</td>
                      <td style={{ padding:'5px 8px', color:'#dc2626' }}>{fmtDate(m.expiry)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ fontSize:11, color:'#dc2626', marginTop:6, fontWeight:600 }}>
                Action Required: Remove expired stock and create destruction records immediately.
              </div>
            </div>
          )}

          {/* Declaration */}
          <div style={{ border:'1px solid #ccc', borderRadius:8, padding:'14px 16px', marginTop:16 }}>
            <div style={{ fontWeight:700, marginBottom:10, fontSize:13 }}>DECLARATION</div>
            <div style={{ fontSize:12, lineHeight:1.8, color:'#333' }}>
              I hereby declare that the information provided in this compliance report is true, accurate and complete
              to the best of my knowledge. All records are maintained in accordance with the requirements of
              Drug Act 1976, Drug Regulatory Authority of Pakistan (DRAP) Act 2012, and applicable regulations.
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:30, marginTop:24 }}>
              <div>
                <div style={{ borderTop:'1px solid #333', paddingTop:4, fontSize:11 }}>Pharmacist Signature & Stamp</div>
                <div style={{ fontSize:11, color:'#666', marginTop:2 }}>Date: _______________</div>
              </div>
              <div>
                <div style={{ borderTop:'1px solid #333', paddingTop:4, fontSize:11 }}>Owner/Manager Signature</div>
                <div style={{ fontSize:11, color:'#666', marginTop:2 }}>Date: _______________</div>
              </div>
            </div>
          </div>

          <div style={{ textAlign:'center', fontSize:10, color:'#aaa', marginTop:16 }}>
            Generated by MediStore Pharmacy Management System · {fmtDT(new Date())}
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          .modal-overlay, .modal { position:static!important; overflow:visible!important; background:white!important; box-shadow:none!important; border:none!important; max-height:none!important; }
          .no-print { display:none!important; }
          body * { visibility:hidden; }
          #compliance-report, #compliance-report * { visibility:visible!important; }
          #compliance-report { position:absolute; left:0; top:0; width:100%; }
        }
      `}</style>
    </div>
  );
}

/* ════════════════════════════════
   MAIN PAGE
════════════════════════════════ */
export default function DRAPCompliance() {
  const [activeTab,    setActiveTab]   = useState('controlled');
  const [period,       setPeriod]      = useState(monthISO());
  const [stats,        setStats]       = useState({});

  /* Controlled register state */
  const [ctrlEntries,  setCtrlEntries] = useState([]);
  const [ctrlTotal,    setCtrlTotal]   = useState(0);
  const [ctrlTotals,   setCtrlTotals]  = useState({});
  const [ctrlPage,     setCtrlPage]    = useState(1);
  const [ctrlPages,    setCtrlPages]   = useState(1);

  /* Batch tracking state */
  const [batchSearch,  setBatchSearch] = useState('');
  const [batches,      setBatches]     = useState([]);
  const [batchLoading, setBatchLoading]= useState(false);
  const [expandedBatch,setExpandedBatch]=useState(null);

  /* Destruction state */
  const [destructions, setDestructions]= useState([]);
  const [destTotal,    setDestTotal]   = useState(0);
  const [destTotals,   setDestTotals]  = useState({});
  const [destPages,    setDestPages]   = useState(1);
  const [destPage,     setDestPage]    = useState(1);
  const [expiredMeds,  setExpiredMeds] = useState([]);
  const [destModal,    setDestModal]   = useState(null);

  /* Supplier state */
  const [suppliers,    setSuppliers]   = useState([]);
  const [supplierSum,  setSupplierSum] = useState([]);
  const [supplierTotals,setSupplierTotals]=useState({});
  const [supplierPages,setSupplierPages]=useState(1);
  const [supplierPage, setSupplierPage]=useState(1);

  /* Report state */
  const [report,       setReport]      = useState(null);
  const [reportLoading,setReportLoading]=useState(false);
  const [reportModal,  setReportModal] = useState(false);

  const [loading,      setLoading]     = useState(false);

  const [month, year] = period.split('-').map(Number);

  const fetchStats = useCallback(() => {
    API.get('/drap/stats').then(({ data }) => setStats(data.stats||{})).catch(()=>{});
  }, []);

  const fetchControlled = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/drap/controlled', { params: { month, year, page: ctrlPage, limit: 25 } });
      setCtrlEntries(data.entries || []);
      setCtrlTotal(data.total || 0);
      setCtrlTotals(data.totals || {});
      setCtrlPages(data.totalPages || 1);
    } catch {}
    finally { setLoading(false); }
  }, [month, year, ctrlPage]);

  const fetchDestructions = useCallback(async () => {
    setLoading(true);
    try {
      const [destRes, expRes] = await Promise.all([
        API.get('/drap/destructions', { params: { month, year, page: destPage, limit: 20 } }),
        API.get('/drap/destructions/expired'),
      ]);
      setDestructions(destRes.data.records || []);
      setDestTotal(destRes.data.total || 0);
      setDestTotals(destRes.data.totals || {});
      setDestPages(destRes.data.totalPages || 1);
      setExpiredMeds(expRes.data.medicines || []);
    } catch {}
    finally { setLoading(false); }
  }, [month, year, destPage]);

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/drap/suppliers', { params: { month, year, page: supplierPage, limit: 20 } });
      setSuppliers(data.orders || []);
      setSupplierSum(data.supplierSummary || []);
      setSupplierTotals(data.totals || {});
      setSupplierPages(data.totalPages || 1);
    } catch {}
    finally { setLoading(false); }
  }, [month, year, supplierPage]);

  const fetchReport = async () => {
    setReportLoading(true);
    try {
      const { data } = await API.get('/drap/report', { params: { month, year } });
      setReport(data.report);
      setReportModal(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate report');
    } finally { setReportLoading(false); }
  };

  const searchBatch = async () => {
    if (!batchSearch.trim()) return;
    setBatchLoading(true);
    try {
      const isName  = batchSearch.length > 4 && !/^\d/.test(batchSearch);
      const params  = isName
        ? { medicineName: batchSearch }
        : { batchNumber: batchSearch };
      const { data } = await API.get('/drap/batch', { params });
      setBatches(data.batches || []);
      if (!data.batches?.length) toast('No batches found', { icon:'ℹ️' });
    } catch {}
    finally { setBatchLoading(false); }
  };

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { if (activeTab==='controlled')  fetchControlled(); }, [fetchControlled, activeTab]);
  useEffect(() => { if (activeTab==='destructions') fetchDestructions(); }, [fetchDestructions, activeTab]);
  useEffect(() => { if (activeTab==='suppliers')    fetchSuppliers(); }, [fetchSuppliers, activeTab]);

  const handleDeleteDestruction = async (id) => {
    if (!confirm('Delete this destruction record?')) return;
    try {
      await API.delete(`/drap/destructions/${id}`);
      toast.success('Record deleted');
      fetchDestructions(); fetchStats();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const TABS = [
    { id:'controlled',   label:'📋 Controlled Register' },
    { id:'batch',        label:'🔬 Batch Tracking'      },
    { id:'destructions', label:'♻️ Expiry Destruction'  },
    { id:'suppliers',    label:'🚚 Supplier Records'     },
    { id:'report',       label:'📄 Compliance Report'   },
  ];

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>📜 DRAP Compliance</h1>
          <p>Drug Regulatory Authority Pakistan — record-keeping & inspection-ready reports</p>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <input type="month" className="form-control" style={{ width:160 }}
            value={period} onChange={e => setPeriod(e.target.value)} />
          <button className="btn btn-secondary btn-sm" onClick={() => { fetchStats(); }}>
            <MdRefresh />
          </button>
          <button className="btn btn-primary" onClick={fetchReport} disabled={reportLoading}>
            {reportLoading ? '⏳ Generating...' : <><MdPrint /> One-Click Report</>}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom:20 }}>
        {[
          { label:'Controlled Medicines',     value:stats.controlledMedicines    ||0, color:'#8b5cf6', icon:'💊' },
          { label:'Destructions This Month',  value:stats.destructionsThisMonth  ||0, color:'#10b981', icon:'♻️' },
          { label:'Expired in Stock',         value:stats.expiredInStock         ||0, color:'#ef4444', icon:'⚠️', warn: (stats.expiredInStock||0)>0 },
          { label:'Expiring in 30 Days',      value:stats.expiringSoon           ||0, color:'#f59e0b', icon:'⏰' },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ border: s.warn?`2px solid #fca5a5`:undefined }}>
            <div className="stat-icon" style={{ background:s.color+'20', fontSize:20 }}>{s.icon}</div>
            <div>
              <div className="stat-value" style={{ color:s.color, fontSize:24 }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
              {s.warn && <div style={{ fontSize:11, color:'#ef4444', fontWeight:700 }}>Needs action!</div>}
            </div>
          </div>
        ))}
      </div>

      {/* Expired stock alert */}
      {(stats.expiredInStock||0) > 0 && (
        <div style={{ background:'#fee2e2', border:'2px solid #fca5a5', borderRadius:12, padding:'12px 16px', marginBottom:16, display:'flex', gap:12, alignItems:'center' }}>
          <MdWarning size={24} style={{ color:'#dc2626', flexShrink:0 }} />
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:700, color:'#dc2626' }}>
              🚨 {stats.expiredInStock} expired medicine(s) still in stock — DRAP violation risk!
            </div>
            <div style={{ fontSize:12, color:'#991b1b' }}>
              Remove expired stock immediately and create destruction records. Go to Expiry Destruction tab.
            </div>
          </div>
          <button className="btn btn-danger btn-sm" onClick={() => setActiveTab('destructions')}>
            Fix Now
          </button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:20, borderBottom:'1px solid var(--border)', flexWrap:'wrap' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{ padding:'10px 14px', background:'none', border:'none', borderBottom: activeTab===t.id?'2px solid var(--accent)':'2px solid transparent', color: activeTab===t.id?'var(--accent)':'var(--text-muted)', fontWeight: activeTab===t.id?700:500, cursor:'pointer', fontSize:13, fontFamily:'var(--font-main)' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── CONTROLLED REGISTER TAB ── */}
      {activeTab === 'controlled' && (
        <div>
          {/* Totals */}
          {ctrlTotals.totalTransactions > 0 && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10, marginBottom:16 }}>
              {[
                { label:'Transactions',    value: ctrlTotals.totalTransactions },
                { label:'Total Qty',       value: ctrlTotals.totalQuantity     },
                { label:'Total Value',     value: fmtPKR(ctrlTotals.totalValue)},
                { label:'Unique Medicines',value: ctrlTotals.uniqueMedicines   },
                { label:'Unique Patients', value: ctrlTotals.uniquePatients    },
              ].map(s => (
                <div key={s.label} style={{ background:'var(--bg-tertiary)', borderRadius:10, padding:'10px 14px', textAlign:'center' }}>
                  <div style={{ fontWeight:800, fontSize:18 }}>{s.value}</div>
                  <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {loading ? (
            <div className="flex-center" style={{ height:200 }}><ShortLoader/></div>
          ) : ctrlEntries.length === 0 ? (
            <div className="empty-state">
              <MdShield size={48} style={{ opacity:0.3, marginBottom:12 }} />
              <h3>No controlled medicine transactions for this period</h3>
            </div>
          ) : (
            <div className="card" style={{ padding:0, overflow:'hidden' }}>
              <table className="table" style={{ fontSize:12 }}>
                <thead>
                  <tr>
                    <th>Date</th><th>Bill No.</th><th>Patient</th><th>CNIC</th>
                    <th>Medicine</th><th>Strength</th><th>Batch</th><th>Qty</th><th>Value</th><th>Type</th>
                  </tr>
                </thead>
                <tbody>
                  {ctrlEntries.map((e,i) => (
                    <tr key={i} style={{ background: e.isControlled?'#fff5f5':undefined }}>
                      <td style={{ whiteSpace:'nowrap' }}>{fmtDate(e.date)}</td>
                      <td style={{ fontWeight:600 }}>{e.billNumber}</td>
                      <td>{e.patientName}<br/><span className="text-muted" style={{ fontSize:10 }}>{e.patientPhone}</span></td>
                      <td style={{ fontFamily:'monospace', fontSize:11 }}>{e.patientCNIC}</td>
                      <td style={{ fontWeight:600 }}>{e.medicineName}</td>
                      <td className="text-muted">{e.strength||'—'}</td>
                      <td style={{ fontFamily:'monospace', fontSize:11 }}>{e.batchNumber}</td>
                      <td style={{ fontWeight:700, color:'var(--accent)' }}>{e.quantity}</td>
                      <td>{fmtPKR(e.totalPrice)}</td>
                      <td>
                        {e.isControlled
                          ? <span style={{ background:'#fee2e2', color:'#dc2626', padding:'2px 8px', borderRadius:99, fontSize:10, fontWeight:700 }}>CONTROLLED</span>
                          : <span style={{ background:'#dbeafe', color:'#3b82f6', padding:'2px 8px', borderRadius:99, fontSize:10, fontWeight:700 }}>Rx</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {ctrlPages > 1 && (
            <div className="pagination" style={{ marginTop:12 }}>
              <button disabled={ctrlPage===1} onClick={()=>setCtrlPage(p=>p-1)}>‹</button>
              {Array.from({length:ctrlPages},(_,i)=>i+1).map(p=>(
                <button key={p} className={ctrlPage===p?'active':''} onClick={()=>setCtrlPage(p)}>{p}</button>
              ))}
              <button disabled={ctrlPage===ctrlPages} onClick={()=>setCtrlPage(p=>p+1)}>›</button>
            </div>
          )}
        </div>
      )}

      {/* ── BATCH TRACKING TAB ── */}
      {activeTab === 'batch' && (
        <div>
          <div className="card" style={{ marginBottom:16 }}>
            <div style={{ fontWeight:700, marginBottom:10 }}>Search by Batch Number or Medicine Name</div>
            <div style={{ display:'flex', gap:10 }}>
              <div className="search-box" style={{ flex:1 }}>
                <MdSearch className="search-icon" />
                <input
                  placeholder="Enter batch number (e.g. BATCH-001) or medicine name (e.g. Augmentin)..."
                  value={batchSearch}
                  onChange={e => setBatchSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchBatch()}
                />
              </div>
              <button className="btn btn-primary" onClick={searchBatch} disabled={batchLoading || !batchSearch.trim()}>
                {batchLoading ? 'Searching...' : <><MdScience size={16} /> Track Batch</>}
              </button>
            </div>
            <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:6 }}>
              💡 Enter a batch number to see all patients who received that batch. Or a medicine name to see all batches.
            </div>
          </div>

          {batches.length === 0 && !batchLoading && batchSearch && (
            <div className="empty-state"><MdScience size={48} style={{ opacity:0.3, marginBottom:12 }}/><h3>No matching batches found</h3></div>
          )}

          {batches.map(b => (
            <div key={`${b.batchNumber}_${b.medicine?._id}`} className="card" style={{ marginBottom:12 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                <div>
                  <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                    <span style={{ fontWeight:800, fontSize:16 }}>{b.medicineName}</span>
                    {b.isControlled && <span style={{ background:'#fee2e2', color:'#dc2626', padding:'2px 8px', borderRadius:99, fontSize:11, fontWeight:700 }}>CONTROLLED</span>}
                    {b.isExpired   && <span style={{ background:'#fee2e2', color:'#ef4444', padding:'2px 8px', borderRadius:99, fontSize:11, fontWeight:700 }}>EXPIRED</span>}
                  </div>
                  <div className="text-muted text-sm">
                    Batch: <strong>{b.batchNumber}</strong> ·
                    Mfr: {b.manufacturer||'—'} ·
                    Expiry: {fmtDate(b.expiryDate)} ·
                    Current Stock: {b.currentStock}
                  </div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:22, fontWeight:900, color:'var(--accent)' }}>{b.totalDistributed}</div>
                  <div style={{ fontSize:11, color:'var(--text-muted)' }}>units distributed</div>
                </div>
              </div>

              {/* Purchase origin */}
              {b.purchases?.length > 0 && (
                <div style={{ background:'#f0f9ff', borderRadius:10, padding:'10px 14px', marginBottom:10, fontSize:12 }}>
                  <div style={{ fontWeight:700, color:'#0369a1', marginBottom:4 }}>📦 Purchase Origin</div>
                  {b.purchases.map((p,i) => (
                    <div key={i}>PO: {p.poNumber} · Supplier: {p.supplierName} · Received: {fmtDate(p.receivedDate)} · Qty: {p.receivedQty}</div>
                  ))}
                </div>
              )}

              {/* Distributions */}
              <div>
                <button
                  onClick={() => setExpandedBatch(expandedBatch===b.batchNumber ? null : b.batchNumber)}
                  style={{ background:'none', border:'1px solid var(--border)', borderRadius:8, padding:'6px 14px', cursor:'pointer', fontSize:12, color:'var(--accent)', fontWeight:600 }}>
                  {expandedBatch===b.batchNumber ? '▲ Hide' : '▼ Show'} {b.distributions.length} distributions
                </button>

                {expandedBatch===b.batchNumber && b.distributions.length > 0 && (
                  <table style={{ width:'100%', marginTop:10, fontSize:12, borderCollapse:'collapse' }}>
                    <thead style={{ background:'var(--bg-tertiary)' }}>
                      <tr>
                        {['Date','Bill No.','Patient','CNIC','Phone','Qty','Value'].map(h => (
                          <th key={h} style={{ padding:'7px 10px', textAlign:'left', borderBottom:'1px solid var(--border)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {b.distributions.map((d,i) => (
                        <tr key={i} style={{ borderBottom:'1px solid var(--border-light)' }}>
                          <td style={{ padding:'7px 10px' }}>{fmtDate(d.date)}</td>
                          <td style={{ padding:'7px 10px', fontWeight:600 }}>{d.billNumber}</td>
                          <td style={{ padding:'7px 10px' }}>{d.patientName}</td>
                          <td style={{ padding:'7px 10px', fontFamily:'monospace', fontSize:11 }}>{d.patientCNIC}</td>
                          <td style={{ padding:'7px 10px' }}>{d.patientPhone}</td>
                          <td style={{ padding:'7px 10px', fontWeight:700, color:'var(--accent)' }}>{d.quantity}</td>
                          <td style={{ padding:'7px 10px' }}>{fmtPKR(d.unitPrice * d.quantity)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── EXPIRY DESTRUCTION TAB ── */}
      {activeTab === 'destructions' && (
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:14, flexWrap:'wrap', gap:10 }}>
            <div>
              <div style={{ fontWeight:700, fontSize:15 }}>Expiry Destruction Register</div>
              <div className="text-muted text-sm">{destTotal} records · {fmtPKR(destTotals.totalValue||0)} total value destroyed</div>
            </div>
            <button className="btn btn-primary" onClick={() => setDestModal('new')}>
              <MdAdd /> Record Destruction
            </button>
          </div>

          {/* Expired medicines alert */}
          {expiredMeds.length > 0 && (
            <div style={{ background:'#fff7ed', border:'1px solid #fed7aa', borderRadius:12, padding:'12px 16px', marginBottom:14 }}>
              <div style={{ fontWeight:700, color:'#92400e', marginBottom:8 }}>
                ⏰ {expiredMeds.length} expired medicine(s) still in stock — Record their destruction:
              </div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {expiredMeds.slice(0,6).map(m => (
                  <button key={m._id}
                    onClick={() => setDestModal(m)}
                    style={{ background:'#fff', border:'1px solid #fed7aa', borderRadius:8, padding:'5px 12px', cursor:'pointer', fontSize:12, fontWeight:600 }}>
                    {m.name} (Exp: {fmtDate(m.expiryDate)}, Stock: {m.stock}) →
                  </button>
                ))}
                {expiredMeds.length > 6 && <span className="text-muted text-sm">+{expiredMeds.length-6} more</span>}
              </div>
            </div>
          )}

          {destructions.length === 0 ? (
            <div className="empty-state">
              <span style={{ fontSize:48, opacity:0.3 }}>♻️</span>
              <h3>No destruction records for this period</h3>
              <button className="btn btn-primary" style={{ marginTop:12 }} onClick={() => setDestModal('new')}>
                <MdAdd /> Add First Record
              </button>
            </div>
          ) : (
            <div className="card" style={{ padding:0, overflow:'hidden' }}>
              <table className="table" style={{ fontSize:12 }}>
                <thead>
                  <tr>
                    <th>Medicine</th><th>Batch</th><th>Qty</th><th>Expiry</th>
                    <th>Destroyed On</th><th>Method</th><th>Witness</th><th>Value</th><th>Status</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {destructions.map(d => (
                    <tr key={d._id}>
                      <td>
                        <div style={{ fontWeight:600 }}>{d.medicineName}</div>
                        {d.isControlled && <span style={{ background:'#fee2e2', color:'#dc2626', padding:'1px 6px', borderRadius:6, fontSize:10, fontWeight:700 }}>CONTROLLED</span>}
                      </td>
                      <td style={{ fontFamily:'monospace', fontSize:11 }}>{d.batchNumber||'—'}</td>
                      <td style={{ fontWeight:700, color:'#ef4444' }}>{d.quantityDestroyed} {d.unit}</td>
                      <td>{fmtDate(d.expiryDate)}</td>
                      <td>{fmtDate(d.destructionDate)}</td>
                      <td className="text-muted">{d.destructionMethod}</td>
                      <td>{d.witnessName||'—'}</td>
                      <td>{fmtPKR(d.purchaseValue)}</td>
                      <td>
                        {d.requiresDrapNotification
                          ? <span style={{ background: d.drapNotifiedAt?'#d1fae5':'#fef3c7', color: d.drapNotifiedAt?'#10b981':'#f59e0b', padding:'2px 8px', borderRadius:99, fontSize:10, fontWeight:700 }}>
                              {d.drapNotifiedAt?'Notified':'DRAP Pending'}
                            </span>
                          : <span style={{ background:'#f3f4f6', color:'#6b7280', padding:'2px 8px', borderRadius:99, fontSize:10 }}>Standard</span>}
                      </td>
                      <td>
                        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => handleDeleteDestruction(d._id)}>
                          <MdDelete size={13} style={{ color:'var(--danger)' }} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {destPages > 1 && (
            <div className="pagination" style={{ marginTop:12 }}>
              <button disabled={destPage===1} onClick={()=>setDestPage(p=>p-1)}>‹</button>
              {Array.from({length:destPages},(_,i)=>i+1).map(p=>(
                <button key={p} className={destPage===p?'active':''} onClick={()=>setDestPage(p)}>{p}</button>
              ))}
              <button disabled={destPage===destPages} onClick={()=>setDestPage(p=>p+1)}>›</button>
            </div>
          )}
        </div>
      )}

      {/* ── SUPPLIER RECORDS TAB ── */}
      {activeTab === 'suppliers' && (
        <div>
          {/* Supplier summary */}
          {supplierSum.length > 0 && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px,1fr))', gap:10, marginBottom:16 }}>
              {supplierSum.map(s => (
                <div key={s._id} style={{ background:'var(--bg-tertiary)', borderRadius:12, padding:'12px 16px' }}>
                  <div style={{ fontWeight:700, fontSize:14 }}>{s._id}</div>
                  <div style={{ color:'var(--accent)', fontWeight:800, fontSize:17 }}>{fmtPKR(s.totalValue)}</div>
                  <div className="text-muted" style={{ fontSize:12 }}>{s.totalOrders} orders · Last: {fmtDate(s.lastOrder)}</div>
                  <div style={{ height:4, background:'var(--border)', borderRadius:99, marginTop:8, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${Math.round((s.totalPaid/s.totalValue)*100)}%`, background:'#10b981', borderRadius:99 }} />
                  </div>
                  <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:2 }}>
                    Paid: {fmtPKR(s.totalPaid)} ({Math.round((s.totalPaid/s.totalValue)*100)}%)
                  </div>
                </div>
              ))}
            </div>
          )}

          {suppliers.length === 0 ? (
            <div className="empty-state">
              <span style={{ fontSize:48, opacity:0.3 }}>🚚</span>
              <h3>No purchase orders for this period</h3>
            </div>
          ) : (
            <div className="card" style={{ padding:0, overflow:'hidden' }}>
              <table className="table" style={{ fontSize:12 }}>
                <thead>
                  <tr><th>PO No.</th><th>Date</th><th>Supplier</th><th>Items</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {suppliers.map(po => (
                    <tr key={po._id}>
                      <td style={{ fontWeight:700, fontFamily:'monospace' }}>{po.poNumber}</td>
                      <td>{fmtDate(po.createdAt)}</td>
                      <td>
                        <div style={{ fontWeight:600 }}>{po.supplier?.name}</div>
                        {po.supplier?.phone && <div className="text-muted" style={{ fontSize:10 }}>{po.supplier.phone}</div>}
                      </td>
                      <td>{po.items?.length} medicines</td>
                      <td style={{ fontWeight:700 }}>{fmtPKR(po.totalAmount)}</td>
                      <td style={{ color:'#10b981', fontWeight:600 }}>{fmtPKR(po.amountPaid)}</td>
                      <td style={{ color: (po.totalAmount-po.amountPaid)>0?'#ef4444':'#10b981', fontWeight:600 }}>
                        {fmtPKR(po.totalAmount - po.amountPaid)}
                      </td>
                      <td>
                        <span style={{
                          background: po.status==='Received'?'#d1fae5':po.status==='Cancelled'?'#fee2e2':'#fef3c7',
                          color:      po.status==='Received'?'#10b981':po.status==='Cancelled'?'#ef4444':'#f59e0b',
                          padding:'2px 8px', borderRadius:99, fontSize:11, fontWeight:700,
                        }}>{po.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {supplierPages > 1 && (
            <div className="pagination" style={{ marginTop:12 }}>
              <button disabled={supplierPage===1} onClick={()=>setSupplierPage(p=>p-1)}>‹</button>
              {Array.from({length:supplierPages},(_,i)=>i+1).map(p=>(
                <button key={p} className={supplierPage===p?'active':''} onClick={()=>setSupplierPage(p)}>{p}</button>
              ))}
              <button disabled={supplierPage===supplierPages} onClick={()=>setSupplierPage(p=>p+1)}>›</button>
            </div>
          )}
        </div>
      )}

      {/* ── REPORT TAB ── */}
      {activeTab === 'report' && (
        <div className="card">
          <div style={{ textAlign:'center', padding:'20px 0' }}>
            <div style={{ fontSize:64, marginBottom:16 }}>📋</div>
            <div style={{ fontWeight:800, fontSize:20, marginBottom:8 }}>One-Click DRAP Compliance Report</div>
            <div style={{ fontSize:14, color:'var(--text-muted)', maxWidth:500, margin:'0 auto 24px', lineHeight:1.7 }}>
              Generates a complete, inspection-ready report for <strong>{period}</strong> including:
              controlled medicines register, expiry destructions, supplier purchases,
              inventory status and compliance score.
            </div>
            <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap', marginBottom:24 }}>
              {[
                '📋 Controlled Medicines Register',
                '♻️ Expiry Destruction Records',
                '🚚 Supplier Purchase Records',
                '📦 Inventory Status',
                '⚖️ Compliance Score',
                '✍️ Declaration Section',
              ].map(item => (
                <div key={item} style={{ background:'var(--bg-tertiary)', borderRadius:10, padding:'8px 16px', fontSize:13, fontWeight:600 }}>
                  {item}
                </div>
              ))}
            </div>
            <button className="btn btn-primary" style={{ padding:'14px 40px', fontSize:16, fontWeight:800 }}
              onClick={fetchReport} disabled={reportLoading}>
              {reportLoading ? '⏳ Generating Report...' : <><MdPrint size={20} /> Generate & Print Report</>}
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {destModal && (
        <DestructionModal
          expired={destModal !== 'new' ? destModal : null}
          onClose={() => setDestModal(null)}
          onSaved={() => { setDestModal(null); fetchDestructions(); fetchStats(); }}
        />
      )}
      {reportModal && report && (
        <ComplianceReport
          report={report}
          onClose={() => setReportModal(false)}
        />
      )}
    </div>
  );
}