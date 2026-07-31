import { useState, useEffect, useCallback } from 'react';
import {
  MdAdd, MdClose, MdSearch, MdMedicalServices,
   MdLocalHotel, MdCheck, MdDelete,
  MdRefresh, MdArrowBack, MdHistory,
} from 'react-icons/md';
import toast from 'react-hot-toast';
import API from '../utils/api';
import ShortLoader from '../Components/ShortLoader';

/* ── helpers ── */
const fmtDate  = d => d ? new Date(d).toLocaleDateString('en-PK', { day:'2-digit', month:'short', year:'numeric' }) : '—';
const fmtTime  = d => d ? new Date(d).toLocaleTimeString('en-PK', { hour:'2-digit', minute:'2-digit' }) : '—';
const fmtPKR   = n => `₨${Number(n||0).toLocaleString()}`;
const daysSince= d => d ? Math.floor((new Date()-new Date(d))/86400000) : 0;
const todayStr = () => new Date().toISOString().slice(0,10);

const STATUS_COLOR = {
  Active:     { bg:'#d1fae5', color:'#10b981' },
  Discharged: { bg:'#e0e7ff', color:'#6366f1' },
  Transferred:{ bg:'#fef3c7', color:'#f59e0b' },
};

const DOSE_CONFIG = {
  Pending: { bg:'#f1f5f9', color:'#94a3b8', label:'Pending'  },
  Given:   { bg:'#d1fae5', color:'#10b981', label:'✓ Given'  },
  Skipped: { bg:'#fef3c7', color:'#f59e0b', label:'Skipped'  },
  Refused: { bg:'#fee2e2', color:'#ef4444', label:'Refused'  },
  Hold:    { bg:'#f3e8ff', color:'#8b5cf6', label:'On Hold'  },
};

const FREQUENCIES = ['Once daily','Twice daily','Three times daily','Four times daily','Every 6 hours','Every 8 hours','Every 4 hours','As needed','Stat (Immediately)'];
const ROUTES      = ['Oral','IV','IM','SC','Topical','Inhaled','Eye Drops','Ear Drops'];
const CHARGE_TYPES= ['Medicine','Procedure','Room','Consultation','Lab','Other'];

/* ════════════════════════════════
   ADMIT MODAL
════════════════════════════════ */
function AdmitModal({ onClose, onAdmitted }) {
  const [patients,setPatients] = useState([]);
  const [wards,   setWards   ] = useState([]);
  const [pSearch, setPSearch ] = useState('');
  const [selected,setSelected] = useState(null);
  const [form, setForm] = useState({
    wardId:'', bedId:'', attendingDoctor:'',
    admissionDiagnosis:'', admissionNotes:'', expectedDischarge:'',
  });
  const [saving,setSaving] = useState(false);
  const fld = k => e => setForm(p=>({...p,[k]:e.target.value}));

  useEffect(() => {
    API.get('/wards').then(({data})=>setWards(data.wards||[])).catch(()=>{});
  },[]);

  useEffect(()=>{
    if(pSearch.length<2){setPatients([]);return;}
    API.get('/patients',{params:{search:pSearch,limit:6}})
      .then(({data})=>setPatients(data.patients||[])).catch(()=>{});
  },[pSearch]);

  const selectedWard = wards.find(w=>w._id===form.wardId);
  const availableBeds= selectedWard?.beds?.filter(b=>b.status==='Available')||[];

  const handleAdmit = async () => {
    if(!selected||!form.wardId||!form.bedId){toast.error('Select patient, ward and bed');return;}
    setSaving(true);
    try {
      await API.post('/ipd',{patientId:selected._id,...form});
      toast.success(`${selected.name} admitted!`);
      onAdmitted();
    } catch(err){toast.error(err.response?.data?.message||'Failed');}
    finally{setSaving(false);}
  };

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <div className="modal-title">New IPD Admission</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><MdClose/></button>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          {/* Left */}
          <div>
            <div className="form-group">
              <label className="form-label required">Patient</label>
              {selected ? (
                <div style={{background:'var(--bg-tertiary)',borderRadius:10,padding:'10px 14px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <div style={{fontWeight:700}}>{selected.name}</div>
                    <div className="text-muted text-sm">{selected.patientId} · {selected.age}y · {selected.gender}</div>
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={()=>{setSelected(null);setPSearch('');}}>Change</button>
                </div>
              ):(
                <div style={{position:'relative'}}>
                  <div className="input-group">
                    <MdSearch className="input-icon"/>
                    <input className="form-control" placeholder="Search patient..." value={pSearch} onChange={e=>setPSearch(e.target.value)} autoFocus/>
                  </div>
                  {patients.length>0&&(
                    <div style={{position:'absolute',top:'100%',left:0,right:0,background:'var(--card-bg)',border:'1px solid var(--border)',borderRadius:10,zIndex:100,boxShadow:'var(--shadow-lg)',marginTop:4}}>
                      {patients.map(p=>(
                        <div key={p._id} style={{padding:'10px 14px',cursor:'pointer',borderBottom:'1px solid var(--border-light)'}}
                          onMouseDown={()=>{setSelected(p);setPSearch('');setPatients([]);}}>
                          <div style={{fontWeight:600}}>{p.name}</div>
                          <div className="text-muted text-sm">{p.patientId} · {p.phone}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label required">Ward</label>
              <select className="form-control" value={form.wardId} onChange={e=>setForm(p=>({...p,wardId:e.target.value,bedId:''}))}>
                <option value="">Select ward...</option>
                {wards.map(w=>(
                  <option key={w._id} value={w._id}>
                    {w.name} ({w.beds?.filter(b=>b.status==='Available').length||0} beds free)
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label required">Bed</label>
              <select className="form-control" value={form.bedId} onChange={fld('bedId')} disabled={!form.wardId}>
                <option value="">Select bed...</option>
                {availableBeds.map(b=>(
                  <option key={b._id} value={b._id}>{b.bedNumber} ({b.type})</option>
                ))}
              </select>
              {form.wardId && availableBeds.length===0 && (
                <div style={{color:'var(--danger)',fontSize:12,marginTop:4}}>No available beds in this ward</div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Attending Doctor</label>
              <input className="form-control" value={form.attendingDoctor} onChange={fld('attendingDoctor')} placeholder="Dr. Ahmed Khan"/>
            </div>
          </div>

          {/* Right */}
          <div>
            <div className="form-group">
              <label className="form-label">Expected Discharge</label>
              <input className="form-control" type="date" value={form.expectedDischarge}
                min={todayStr()} onChange={fld('expectedDischarge')}/>
            </div>
            <div className="form-group">
              <label className="form-label">Admission Diagnosis</label>
              <input className="form-control" value={form.admissionDiagnosis} onChange={fld('admissionDiagnosis')}
                placeholder="e.g. Acute Gastroenteritis"/>
            </div>
            <div className="form-group">
              <label className="form-label">Admission Notes</label>
              <textarea className="form-control" rows={4} value={form.admissionNotes} onChange={fld('admissionNotes')}
                placeholder="Chief complaint, vitals on admission, special instructions..."/>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAdmit}
            disabled={saving||!selected||!form.wardId||!form.bedId}>
            {saving?'Admitting...':'Admit Patient'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════
   DISCHARGE MODAL
════════════════════════════════ */
function DischargeModal({ admission, onClose, onDischarged }) {
  const [form,setForm] = useState({
    dischargeDiagnosis:'', dischargeNotes:'', dischargeInstructions:'',
    discount:'0', amountPaid:'0',
  });
  const [saving,setSaving] = useState(false);
  const fld = k => e => setForm(p=>({...p,[k]:e.target.value}));

  const netAmount = Math.max(0,(admission.totalCharges||0)-Number(form.discount||0));

  const handleDischarge = async () => {
    setSaving(true);
    try {
      await API.post(`/ipd/${admission._id}/discharge`,form);
      toast.success(`${admission.patientName} discharged!`);
      onDischarged();
    } catch(err){toast.error(err.response?.data?.message||'Failed');}
    finally{setSaving(false);}
  };

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <div>
            <div className="modal-title">Discharge — {admission.patientName}</div>
            <div className="text-muted text-sm">{admission.admissionNumber} · {daysSince(admission.admittedAt)} days admitted</div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><MdClose/></button>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <div>
            <div className="form-group">
              <label className="form-label">Discharge Diagnosis</label>
              <input className="form-control" value={form.dischargeDiagnosis} onChange={fld('dischargeDiagnosis')}
                placeholder="Final diagnosis on discharge"/>
            </div>
            <div className="form-group">
              <label className="form-label">Discharge Notes</label>
              <textarea className="form-control" rows={3} value={form.dischargeNotes} onChange={fld('dischargeNotes')}
                placeholder="Clinical summary, response to treatment..."/>
            </div>
            <div className="form-group">
              <label className="form-label">Discharge Instructions</label>
              <textarea className="form-control" rows={3} value={form.dischargeInstructions} onChange={fld('dischargeInstructions')}
                placeholder="Follow-up in 2 weeks, avoid spicy food, take rest..."/>
            </div>
          </div>

          <div>
            {/* Bill summary */}
            <div style={{background:'var(--bg-tertiary)',borderRadius:12,padding:16,marginBottom:16}}>
              <div style={{fontWeight:700,marginBottom:12}}>Final Bill Summary</div>
              {['Medicine','Room','Procedure','Lab','Consultation','Other'].map(type=>{
                const charges = (admission.charges||[]).filter(c=>c.type===type);
                if(!charges.length) return null;
                const total = charges.reduce((s,c)=>s+c.totalPrice,0);
                return (
                  <div key={type} style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:6}}>
                    <span className="text-muted">{type}</span>
                    <span style={{fontWeight:600}}>{fmtPKR(total)}</span>
                  </div>
                );
              })}
              <div style={{borderTop:'1px solid var(--border)',paddingTop:8,marginTop:8}}>
                <div style={{display:'flex',justifyContent:'space-between',fontWeight:700,fontSize:15}}>
                  <span>Total Charges</span>
                  <span>{fmtPKR(admission.totalCharges)}</span>
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Discount (₨)</label>
                <input className="form-control" type="number" min="0" value={form.discount} onChange={fld('discount')}/>
              </div>
              <div className="form-group">
                <label className="form-label">Amount Paid (₨)</label>
                <input className="form-control" type="number" min="0" value={form.amountPaid} onChange={fld('amountPaid')}/>
              </div>
            </div>

            <div style={{background:'var(--accent-light)',borderRadius:10,padding:'12px 16px'}}>
              <div style={{display:'flex',justifyContent:'space-between',fontWeight:800,fontSize:16,color:'var(--accent)'}}>
                <span>Net Payable</span>
                <span>{fmtPKR(netAmount)}</span>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginTop:4,color:'var(--text-muted)'}}>
                <span>Balance After Payment</span>
                <span style={{color: netAmount-Number(form.amountPaid)>0?'var(--danger)':'var(--success)'}}>
                  {fmtPKR(Math.max(0,netAmount-Number(form.amountPaid||0)))}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleDischarge} disabled={saving}>
            {saving?'Discharging...':'Discharge & Generate Bill'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════
   ADD ORDER MODAL
════════════════════════════════ */
function AddOrderModal({ admissionId, onClose, onAdded }) {
  const [meds,setMeds]   = useState([]);
  const [mSearch,setMS]  = useState('');
  const [selMed,setSelMed] = useState(null);
  const [form,setForm] = useState({
    medicineName:'',genericName:'',dosage:'',
    frequency:'Once daily',route:'Oral',endDate:'',
    notes:'',orderedBy:'',
  });
  const [saving,setSaving] = useState(false);
  const fld = k => e => setForm(p=>({...p,[k]:e.target.value}));

  useEffect(()=>{
    if(mSearch.length<2){setMeds([]);return;}
    API.get('/medicines',{params:{search:mSearch,limit:6}})
      .then(({data})=>setMeds(data.medicines||[])).catch(()=>{});
  },[mSearch]);

  const handleAdd = async () => {
    if(!form.medicineName||!form.dosage){toast.error('Medicine name and dosage required');return;}
    setSaving(true);
    try {
      await API.post(`/ipd/${admissionId}/orders`,{
        medicineId: selMed?._id||null, ...form,
      });
      toast.success(`${form.medicineName} order added`);
      onAdded();
    } catch(err){toast.error(err.response?.data?.message||'Failed');}
    finally{setSaving(false);}
  };

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{maxWidth:480}}>
        <div className="modal-header">
          <div className="modal-title">Add Medicine Order</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><MdClose/></button>
        </div>

        <div className="form-group">
          <label className="form-label required">Medicine</label>
          {selMed ? (
            <div style={{background:'var(--bg-tertiary)',borderRadius:10,padding:'10px 14px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div>
                <div style={{fontWeight:700}}>{selMed.name}</div>
                <div className="text-muted text-sm">{selMed.genericName} · Stock: {selMed.stock}</div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={()=>{setSelMed(null);setMS('');setForm(p=>({...p,medicineName:'',genericName:''}));}}>Change</button>
            </div>
          ):(
            <div style={{position:'relative'}}>
              <div className="input-group">
                <MdSearch className="input-icon"/>
                <input className="form-control" placeholder="Search from inventory or type name..."
                  value={mSearch} onChange={e=>setMS(e.target.value)} autoFocus/>
              </div>
              <input className="form-control" style={{marginTop:6}} placeholder="Or type medicine name manually"
                value={form.medicineName} onChange={fld('medicineName')}/>
              {meds.length>0&&(
                <div style={{position:'absolute',top:'40px',left:0,right:0,background:'var(--card-bg)',border:'1px solid var(--border)',borderRadius:10,zIndex:100,boxShadow:'var(--shadow-lg)',marginTop:2}}>
                  {meds.map(m=>(
                    <div key={m._id} style={{padding:'10px 14px',cursor:'pointer',borderBottom:'1px solid var(--border-light)'}}
                      onMouseDown={()=>{setSelMed(m);setMS('');setMeds([]);setForm(p=>({...p,medicineName:m.name,genericName:m.genericName||''}));}}>
                      <div style={{fontWeight:600}}>{m.name}</div>
                      <div className="text-muted text-sm">{m.genericName} · ₨{m.salePrice}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label required">Dosage</label>
            <input className="form-control" value={form.dosage} onChange={fld('dosage')} placeholder="500mg"/>
          </div>
          <div className="form-group">
            <label className="form-label">Route</label>
            <select className="form-control" value={form.route} onChange={fld('route')}>
              {ROUTES.map(r=><option key={r}>{r}</option>)}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Frequency</label>
            <select className="form-control" value={form.frequency} onChange={fld('frequency')}>
              {FREQUENCIES.map(f=><option key={f}>{f}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">End Date</label>
            <input className="form-control" type="date" value={form.endDate}
              min={todayStr()} onChange={fld('endDate')}/>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Ordered By (Doctor)</label>
            <input className="form-control" value={form.orderedBy} onChange={fld('orderedBy')} placeholder="Dr. Name"/>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Notes</label>
          <input className="form-control" value={form.notes} onChange={fld('notes')} placeholder="Take after meals, dilute with 100ml NS..."/>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAdd}
            disabled={saving||(!form.medicineName&&!selMed)||!form.dosage}>
            {saving?'Adding...':'Add Order'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════
   ADMISSION DETAIL
════════════════════════════════ */
function AdmissionDetail({ admissionId, onBack, onRefresh }) {
  const [admission, setAdmission] = useState(null);
  const [mar,       setMAR      ] = useState(null);
  const [marDate,   setMARDate  ] = useState(todayStr());
  const [activeTab, setTab]       = useState('overview');
  const [loading,   setLoading  ] = useState(true);

  const [orderModal,    setOrderModal   ] = useState(false);
  const [dischargeModal,setDischargeModal]=useState(false);
  const [chargeForm, setChargeForm] = useState({ type:'Procedure', description:'', quantity:'1', unitPrice:'' });

  const fetchAdmission = useCallback(async()=>{
    try {
      const {data}=await API.get(`/ipd/${admissionId}`);
      setAdmission(data.admission);
    } catch { toast.error('Failed to load admission'); }
    finally { setLoading(false); }
  },[admissionId]);

  const fetchMAR = useCallback(async()=>{
    try {
      const {data}=await API.get(`/ipd/${admissionId}/mar`,{params:{date:marDate}});
      setMAR(data.sheet);
    } catch {}
  },[admissionId,marDate]);

  useEffect(()=>{ fetchAdmission(); },[fetchAdmission]);
  useEffect(()=>{ if(activeTab==='mar') fetchMAR(); },[fetchMAR,activeTab]);

  const handleDoseAction = async (sheetId, doseId, status, notes='') => {
    try {
      await API.patch(`/ipd/mar/${sheetId}/doses/${doseId}`,{status,notes});
      fetchMAR();
      toast.success(`Dose marked as ${status}`);
    } catch(err){toast.error(err.response?.data?.message||'Failed');}
  };

  const handleStopOrder = async (orderId) => {
    if(!confirm('Stop this medicine order?')) return;
    try {
      await API.patch(`/ipd/${admissionId}/orders/${orderId}/stop`);
      toast.success('Order stopped');
      fetchAdmission();
    } catch(err){toast.error(err.response?.data?.message||'Failed');}
  };

  const handleAddCharge = async () => {
    if(!chargeForm.description||!chargeForm.unitPrice){toast.error('Fill description and price');return;}
    try {
      await API.post(`/ipd/${admissionId}/charges`,chargeForm);
      toast.success('Charge added');
      setChargeForm({type:'Procedure',description:'',quantity:'1',unitPrice:''});
      fetchAdmission();
    } catch(err){toast.error(err.response?.data?.message||'Failed');}
  };

  const handleRemoveCharge = async (chargeId) => {
    if(!confirm('Remove this charge?')) return;
    try {
      await API.delete(`/ipd/${admissionId}/charges/${chargeId}`);
      toast.success('Charge removed');
      fetchAdmission();
    } catch(err){toast.error(err.response?.data?.message||'Failed');}
  };

  if(loading) return <div className="flex-center" style={{height:300}}><ShortLoader/></div>;
  if(!admission) return <div className="text-muted">Admission not found</div>;

  const p       = admission.patient;
  const isActive= admission.status==='Active';
  const sc      = STATUS_COLOR[admission.status]||STATUS_COLOR.Active;

  const TABS = [
    {id:'overview',  label:'Overview'},
    {id:'orders',    label:`Orders (${admission.medicineOrders?.filter(o=>o.isActive).length||0})`},
    {id:'mar',       label:'MAR Sheet'},
    {id:'charges',   label:`Charges (₨${(admission.totalCharges||0).toLocaleString()})`},
  ];

  return (
    <div>
      {/* Top bar */}
      <div className="page-header">
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <button className="btn btn-ghost btn-icon" onClick={onBack}><MdArrowBack/></button>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <h2 style={{margin:0}}>{admission.patientName}</h2>
              <span style={{background:sc.bg,color:sc.color,padding:'3px 12px',borderRadius:99,fontSize:12,fontWeight:700}}>
                {admission.status}
              </span>
            </div>
            <div className="text-muted text-sm">
              {admission.admissionNumber} · Bed {admission.bedNumber} · {admission.wardName} ·
              {daysSince(admission.admittedAt)} days admitted
            </div>
          </div>
        </div>
        <div style={{display:'flex',gap:10}}>
          <button className="btn btn-secondary btn-sm" onClick={fetchAdmission}><MdRefresh/></button>
          {isActive && (
            <>
              <button className="btn btn-secondary" onClick={()=>setOrderModal(true)}>
                <MdMedicalServices/> Add Order
              </button>
              <button className="btn btn-danger" onClick={()=>setDischargeModal(true)}>
                <MdCheck/> Discharge
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:4,marginBottom:20,borderBottom:'1px solid var(--border)',paddingBottom:0}}>
        {TABS.map(t=>(
          <button key={t.id}
            onClick={()=>setTab(t.id)}
            style={{
              padding:'10px 16px', background:'none', border:'none',
              borderBottom: activeTab===t.id?'2px solid var(--accent)':'2px solid transparent',
              color: activeTab===t.id?'var(--accent)':'var(--text-muted)',
              fontWeight: activeTab===t.id?700:500, cursor:'pointer',
              fontSize:14, fontFamily:'var(--font-main)',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab==='overview' && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          {/* Patient info */}
          <div className="card">
            <div style={{fontWeight:700,marginBottom:12}}>Patient Information</div>
            {[
              ['Patient ID',   p?.patientId],
              ['Age / Gender', `${p?.age||'—'} / ${p?.gender||'—'}`],
              ['Phone',        p?.phone],
              ['Blood Group',  p?.bloodGroup],
              ['Doctor',       admission.attendingDoctor],
            ].map(([k,v])=> v ? (
              <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid var(--border-light)',fontSize:13}}>
                <span className="text-muted">{k}</span>
                <span style={{fontWeight:600}}>{v}</span>
              </div>
            ):null)}
            {p?.allergies?.length>0&&(
              <div style={{marginTop:10,background:'#fee2e2',borderRadius:8,padding:'8px 12px'}}>
                <div style={{color:'#ef4444',fontWeight:700,fontSize:12}}>⚠️ ALLERGIES</div>
                <div style={{fontSize:13,marginTop:4}}>{p.allergies.join(', ')}</div>
              </div>
            )}
          </div>

          {/* Admission info */}
          <div className="card">
            <div style={{fontWeight:700,marginBottom:12}}>Admission Details</div>
            {[
              ['Admitted',    fmtDate(admission.admittedAt)],
              ['Expected DC', fmtDate(admission.expectedDischarge)],
              ['Diagnosis',   admission.admissionDiagnosis],
            ].map(([k,v])=> v ? (
              <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid var(--border-light)',fontSize:13}}>
                <span className="text-muted">{k}</span>
                <span style={{fontWeight:600,textAlign:'right',maxWidth:'60%'}}>{v}</span>
              </div>
            ):null)}
            {admission.admissionNotes&&(
              <div style={{marginTop:10,background:'var(--bg-tertiary)',borderRadius:8,padding:'8px 12px',fontSize:13}}>
                <div className="text-muted" style={{fontSize:11,marginBottom:4}}>NOTES</div>
                {admission.admissionNotes}
              </div>
            )}
          </div>

          {/* Bill summary */}
          <div className="card">
            <div style={{fontWeight:700,marginBottom:12}}>Running Bill</div>
            {[
              {label:'Total Charges', value:fmtPKR(admission.totalCharges), color:'var(--text-primary)'},
              {label:'Amount Paid',   value:fmtPKR(admission.amountPaid),   color:'#10b981'},
              {label:'Balance Due',   value:fmtPKR(admission.remainingAmount),color:admission.remainingAmount>0?'#ef4444':'#10b981'},
            ].map(s=>(
              <div key={s.label} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid var(--border-light)'}}>
                <span className="text-muted" style={{fontSize:13}}>{s.label}</span>
                <span style={{fontWeight:700,color:s.color}}>{s.value}</span>
              </div>
            ))}
            <div style={{marginTop:8,display:'flex',gap:6,alignItems:'center'}}>
              <span style={{
                background:
                  admission.paymentStatus==='Paid'?'#d1fae5':
                  admission.paymentStatus==='Partial'?'#fef3c7':'#fee2e2',
                color:
                  admission.paymentStatus==='Paid'?'#10b981':
                  admission.paymentStatus==='Partial'?'#f59e0b':'#ef4444',
                padding:'3px 12px',borderRadius:99,fontSize:12,fontWeight:700,
              }}>
                {admission.paymentStatus}
              </span>
            </div>
          </div>

          {/* Active medicine orders summary */}
          <div className="card">
            <div style={{fontWeight:700,marginBottom:12}}>Active Medicine Orders</div>
            {admission.medicineOrders?.filter(o=>o.isActive).length===0 && (
              <div className="text-muted text-sm">No active orders</div>
            )}
            {admission.medicineOrders?.filter(o=>o.isActive).map(o=>(
              <div key={o._id} style={{padding:'8px 0',borderBottom:'1px solid var(--border-light)',fontSize:13}}>
                <div style={{fontWeight:600}}>{o.medicineName}</div>
                <div className="text-muted">{o.dosage} · {o.frequency} · {o.route}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── ORDERS TAB ── */}
      {activeTab==='orders' && (
        <div>
          {isActive && (
            <button className="btn btn-primary" style={{marginBottom:16}} onClick={()=>setOrderModal(true)}>
              <MdAdd/> Add Medicine Order
            </button>
          )}
          {admission.medicineOrders?.length===0 && (
            <div className="empty-state"><MdMedicalServices size={40} style={{opacity:0.3}}/><p>No medicine orders yet</p></div>
          )}
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {admission.medicineOrders?.map(order=>(
              <div key={order._id} style={{
                border:`1px solid ${order.isActive?'var(--border)':'var(--border-light)'}`,
                borderRadius:14, padding:16,
                background: order.isActive?'var(--card-bg)':'var(--bg-tertiary)',
                opacity: order.isActive?1:0.65,
              }}>
                <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between'}}>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                      <span style={{fontWeight:700,fontSize:15}}>{order.medicineName}</span>
                      {order.genericName&&<span className="text-muted text-sm">({order.genericName})</span>}
                      <span style={{
                        background: order.isActive?'#d1fae5':'#f3f4f6',
                        color: order.isActive?'#10b981':'#6b7280',
                        padding:'2px 8px',borderRadius:99,fontSize:11,fontWeight:700,
                      }}>
                        {order.isActive?'Active':'Stopped'}
                      </span>
                    </div>
                    <div style={{display:'flex',gap:16,fontSize:13,color:'var(--text-muted)',flexWrap:'wrap'}}>
                      <span>💊 {order.dosage}</span>
                      <span>🔄 {order.frequency}</span>
                      <span>🛤 {order.route}</span>
                      {order.orderedBy&&<span>👨‍⚕️ Dr. {order.orderedBy}</span>}
                    </div>
                    {order.scheduleTimes?.length>0&&(
                      <div style={{marginTop:6,display:'flex',gap:6,flexWrap:'wrap'}}>
                        {order.scheduleTimes.map(t=>(
                          <span key={t} style={{background:'var(--accent-light)',color:'var(--accent)',
                            padding:'2px 8px',borderRadius:6,fontSize:12,fontWeight:600}}>
                            ⏰ {t}
                          </span>
                        ))}
                      </div>
                    )}
                    {order.notes&&<div className="text-muted" style={{fontSize:12,marginTop:6}}>📝 {order.notes}</div>}
                    <div className="text-muted" style={{fontSize:11,marginTop:6}}>
                      Started: {fmtDate(order.startDate)}
                      {order.endDate && ` · Ends: ${fmtDate(order.endDate)}`}
                    </div>
                  </div>
                  {order.isActive && isActive && (
                    <button className="btn btn-danger btn-sm" onClick={()=>handleStopOrder(order._id)}>
                      Stop Order
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MAR SHEET TAB ── */}
      {activeTab==='mar' && (
        <div>
          <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
            <input type="date" className="form-control" style={{width:180}}
              value={marDate} max={todayStr()} onChange={e=>setMARDate(e.target.value)}/>
            <button className="btn btn-secondary btn-sm" onClick={fetchMAR}><MdRefresh/> Refresh</button>
            <div className="text-muted text-sm">
              {mar?.doses?.length||0} scheduled doses
            </div>
          </div>

          {/* Legend */}
          <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
            {Object.entries(DOSE_CONFIG).map(([status,cfg])=>(
              <span key={status} style={{background:cfg.bg,color:cfg.color,padding:'3px 10px',borderRadius:99,fontSize:12,fontWeight:600}}>
                {cfg.label}
              </span>
            ))}
          </div>

          {!mar||mar.doses?.length===0 ? (
            <div className="empty-state">
              <MdHistory size={40} style={{opacity:0.3}}/>
              <h3>No MAR sheet for this date</h3>
              <p>{marDate===todayStr()?'Add medicine orders to generate today\'s MAR':'No doses scheduled on this date'}</p>
            </div>
          ):(
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {mar.doses.map(dose=>{
                const cfg = DOSE_CONFIG[dose.status]||DOSE_CONFIG.Pending;
                return (
                  <div key={dose._id} style={{
                    border:`1px solid var(--border)`,
                    borderLeft:`4px solid ${cfg.color}`,
                    borderRadius:12, padding:'12px 16px',
                    background:'var(--card-bg)',
                    display:'flex',alignItems:'center',gap:12,
                  }}>
                    <div style={{
                      background:cfg.bg,color:cfg.color,
                      padding:'4px 10px',borderRadius:8,
                      fontSize:12,fontWeight:700,minWidth:80,textAlign:'center',flexShrink:0,
                    }}>
                      ⏰ {dose.scheduledTime}
                    </div>

                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:700,fontSize:14}}>{dose.medicineName}</div>
                      <div className="text-muted text-sm">{dose.dosage} · {dose.route}</div>
                      {dose.administeredByName&&(
                        <div style={{fontSize:11,color:'var(--text-muted)',marginTop:2}}>
                          {dose.status==='Given'?'✓ Given by':'Marked by'} {dose.administeredByName}
                          {dose.administeredAt&&` at ${fmtTime(dose.administeredAt)}`}
                        </div>
                      )}
                      {dose.notes&&<div style={{fontSize:12,color:'var(--text-muted)',marginTop:2}}>📝 {dose.notes}</div>}
                    </div>

                    <div style={{
                      background:cfg.bg,color:cfg.color,
                      padding:'4px 10px',borderRadius:8,
                      fontSize:12,fontWeight:700,minWidth:80,textAlign:'center',flexShrink:0,
                    }}>
                      {cfg.label}
                    </div>

                    {/* Actions — only if pending and today */}
                    {dose.status==='Pending' && marDate===todayStr() && (
                      <div style={{display:'flex',gap:4,flexShrink:0}}>
                        <button className="btn btn-success btn-sm" style={{fontSize:11}}
                          onClick={()=>handleDoseAction(mar._id,dose._id,'Given')}>
                          Given
                        </button>
                        <button className="btn btn-secondary btn-sm" style={{fontSize:11}}
                          onClick={()=>{
                            const reason=prompt('Reason for skipping?');
                            if(reason!==null) handleDoseAction(mar._id,dose._id,'Skipped',reason);
                          }}>
                          Skip
                        </button>
                        <button className="btn btn-danger btn-sm" style={{fontSize:11}}
                          onClick={()=>{
                            const reason=prompt('Reason refused?');
                            if(reason!==null) handleDoseAction(mar._id,dose._id,'Refused',reason);
                          }}>
                          Refused
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── CHARGES TAB ── */}
      {activeTab==='charges' && (
        <div>
          {/* Add charge form */}
          {isActive && (
            <div className="card" style={{marginBottom:16}}>
              <div style={{fontWeight:700,marginBottom:12}}>Add Charge</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 2fr 80px 120px auto',gap:8,alignItems:'end'}}>
                <div>
                  <label className="form-label" style={{fontSize:11}}>Type</label>
                  <select className="form-control" value={chargeForm.type}
                    onChange={e=>setChargeForm(p=>({...p,type:e.target.value}))}>
                    {CHARGE_TYPES.map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label" style={{fontSize:11}}>Description</label>
                  <input className="form-control" value={chargeForm.description}
                    onChange={e=>setChargeForm(p=>({...p,description:e.target.value}))}
                    placeholder="e.g. IV Drip Setup, X-Ray Chest"/>
                </div>
                <div>
                  <label className="form-label" style={{fontSize:11}}>Qty</label>
                  <input className="form-control" type="number" min="1" value={chargeForm.quantity}
                    onChange={e=>setChargeForm(p=>({...p,quantity:e.target.value}))}/>
                </div>
                <div>
                  <label className="form-label" style={{fontSize:11}}>Unit Price (₨)</label>
                  <input className="form-control" type="number" min="0" value={chargeForm.unitPrice}
                    onChange={e=>setChargeForm(p=>({...p,unitPrice:e.target.value}))}
                    placeholder="500"/>
                </div>
                <button className="btn btn-primary" onClick={handleAddCharge}
                  style={{alignSelf:'flex-end'}}>
                  <MdAdd/> Add
                </button>
              </div>
            </div>
          )}

          {/* Charges list grouped by type */}
          {CHARGE_TYPES.map(type=>{
            const items=(admission.charges||[]).filter(c=>c.type===type);
            if(!items.length) return null;
            const total=items.reduce((s,c)=>s+c.totalPrice,0);
            return (
              <div key={type} style={{marginBottom:16}}>
                <div style={{fontWeight:700,marginBottom:8,display:'flex',justifyContent:'space-between'}}>
                  <span>{type} Charges</span>
                  <span style={{color:'var(--accent)'}}>{fmtPKR(total)}</span>
                </div>
                {items.map(c=>(
                  <div key={c._id} style={{
                    display:'flex',alignItems:'center',gap:10,
                    padding:'10px 14px',background:'var(--bg-secondary)',
                    borderRadius:10,marginBottom:6,border:'1px solid var(--border-light)',
                  }}>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:600,fontSize:13}}>{c.description}</div>
                      <div className="text-muted" style={{fontSize:11}}>
                        {c.quantity} × {fmtPKR(c.unitPrice)} · {fmtDate(c.date)}
                      </div>
                    </div>
                    <div style={{fontWeight:700,color:'var(--accent)'}}>{fmtPKR(c.totalPrice)}</div>
                    {isActive && (
                      <button className="btn btn-ghost btn-icon btn-sm"
                        onClick={()=>handleRemoveCharge(c._id)}>
                        <MdDelete size={15} style={{color:'var(--danger)'}}/>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            );
          })}

          {/* Total */}
          <div style={{
            background:'var(--bg-tertiary)',borderRadius:12,padding:'14px 16px',
            display:'flex',justifyContent:'space-between',alignItems:'center',
          }}>
            <span style={{fontWeight:700}}>Total Charges</span>
            <span style={{fontWeight:900,fontSize:20,color:'var(--accent)'}}>{fmtPKR(admission.totalCharges)}</span>
          </div>
        </div>
      )}

      {/* Modals */}
      {orderModal    && <AddOrderModal    admissionId={admissionId} onClose={()=>setOrderModal(false)}    onAdded={()=>{setOrderModal(false);fetchAdmission();}}/>}
      {dischargeModal&& <DischargeModal  admission={admission}      onClose={()=>setDischargeModal(false)} onDischarged={()=>{setDischargeModal(false);fetchAdmission();onRefresh();}}/>}
    </div>
  );
}

/* ════════════════════════════════
   MAIN PAGE
════════════════════════════════ */
export default function IPDManagement() {
  const [admissions, setAdmissions] = useState([]);
  const [stats,      setStats]      = useState({});
  const [total,      setTotal]      = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page,       setPage]       = useState(1);
  const [loading,    setLoading]    = useState(true);

  const [statusFilter, setStatusFilter] = useState('Active');
  const [search,       setSearch]       = useState('');
  const [admitModal,   setAdmitModal]   = useState(false);
  const [detailId,     setDetailId]     = useState(null); // open admission detail

  const fetchAdmissions = useCallback(async()=>{
    setLoading(true);
    try {
      const {data}=await API.get('/ipd',{params:{status:statusFilter,search,page,limit:15}});
      setAdmissions(data.admissions);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch { toast.error('Failed to load admissions'); }
    finally { setLoading(false); }
  },[statusFilter,search,page]);

  const fetchStats = useCallback(async()=>{
    API.get('/ipd/stats').then(({data})=>setStats(data.stats)).catch(()=>{});
  },[]);

  useEffect(()=>{ fetchAdmissions(); fetchStats(); },[fetchAdmissions]);
  useEffect(()=>{ setPage(1); },[statusFilter,search]);

  /* ── If detail view is open ── */
  if(detailId) {
    return (
      <AdmissionDetail
        admissionId={detailId}
        onBack={()=>setDetailId(null)}
        onRefresh={()=>{ fetchAdmissions(); fetchStats(); }}
      />
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>IPD Management</h1>
          <p>{stats.active||0} active admissions · {stats.todayAdmissions||0} admitted today</p>
        </div>
        <button className="btn btn-primary" onClick={()=>setAdmitModal(true)}>
          <MdAdd/> New Admission
        </button>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{marginBottom:20}}>
        {[
          { label:'Active Admissions',  value:stats.active||0,          color:'#ef4444', icon:'🏥' },
          { label:'Today Admitted',     value:stats.todayAdmissions||0, color:'#0ea5e9', icon:'📋' },
          { label:'Total Discharged',   value:stats.discharged||0,      color:'#10b981', icon:'✅' },
          { label:'Pending Payments',   value:stats.pendingPayments||0, color:'#f59e0b', icon:'💰' },
          { label:'Total Revenue',      value:fmtPKR(stats.totalRevenue||0), color:'#8b5cf6', icon:'📈' },
          { label:'Total Collected',    value:fmtPKR(stats.totalPaid||0),    color:'#06b6d4', icon:'💳' },
        ].map(s=>(
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{background:s.color+'20',fontSize:20}}>{s.icon}</div>
            <div>
              <div className="stat-value" style={{color:s.color,fontSize:typeof s.value==='string'?16:24}}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card" style={{marginBottom:16}}>
        <div style={{display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}>
          <div className="search-box" style={{flex:1,minWidth:200}}>
            <MdSearch className="search-icon"/>
            <input placeholder="Search patient, admission number, doctor..."
              value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
          {['Active','Discharged','Transferred'].map(s=>(
            <button key={s} className={`pill${statusFilter===s?' active':''}`}
              onClick={()=>setStatusFilter(s)}>{s}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex-center" style={{height:200}}><ShortLoader/></div>
      ) : admissions.length===0 ? (
        <div className="empty-state">
          <MdLocalHotel size={52} style={{opacity:0.3,marginBottom:16}}/>
          <h3>No {statusFilter.toLowerCase()} admissions</h3>
          {statusFilter==='Active' && (
            <button className="btn btn-primary" style={{marginTop:12}} onClick={()=>setAdmitModal(true)}>
              <MdAdd/> Admit First Patient
            </button>
          )}
        </div>
      ):(
        <div className="card" style={{padding:0,overflow:'hidden'}}>
          <table className="table">
            <thead>
              <tr>
                <th>Admission #</th>
                <th>Patient</th>
                <th>Ward / Bed</th>
                <th>Doctor</th>
                <th>Admitted</th>
                <th>Days</th>
                <th>Charges</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {admissions.map(a=>{
                const sc=STATUS_COLOR[a.status]||STATUS_COLOR.Active;
                const isOverdue = a.status==='Active' && a.expectedDischarge && new Date(a.expectedDischarge)<new Date();
                return (
                  <tr key={a._id}>
                    <td><span style={{fontWeight:700,color:'var(--accent)'}}>{a.admissionNumber}</span></td>
                    <td>
                      <div style={{fontWeight:600}}>{a.patientName}</div>
                      <div className="text-muted text-sm">{a.patient?.patientId} · {a.patient?.age}y</div>
                    </td>
                    <td>
                      <div style={{fontSize:13}}>{a.wardName}</div>
                      <div style={{fontWeight:700,color:'var(--accent)'}}>Bed {a.bedNumber}</div>
                    </td>
                    <td>{a.attendingDoctor||'—'}</td>
                    <td>{fmtDate(a.admittedAt)}</td>
                    <td>
                      <span style={{
                        fontWeight:700,
                        color: isOverdue?'#ef4444':'var(--text-primary)',
                      }}>
                        {daysSince(a.admittedAt)}d
                        {isOverdue&&' ⚠️'}
                      </span>
                    </td>
                    <td style={{fontWeight:700}}>{fmtPKR(a.totalCharges)}</td>
                    <td>
                      <span style={{background:sc.bg,color:sc.color,padding:'3px 10px',borderRadius:99,fontSize:11,fontWeight:700}}>
                        {a.status}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={()=>setDetailId(a._id)}>
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages>1 && (
        <div className="pagination" style={{marginTop:16}}>
          <button disabled={page===1} onClick={()=>setPage(p=>p-1)}>‹</button>
          {Array.from({length:totalPages},(_,i)=>i+1).map(p=>(
            <button key={p} className={page===p?'active':''} onClick={()=>setPage(p)}>{p}</button>
          ))}
          <button disabled={page===totalPages} onClick={()=>setPage(p=>p+1)}>›</button>
        </div>
      )}

      {/* Admit modal */}
      {admitModal && (
        <AdmitModal
          onClose={()=>setAdmitModal(false)}
          onAdmitted={()=>{setAdmitModal(false);fetchAdmissions();fetchStats();}}
        />
      )}
    </div>
  );
}