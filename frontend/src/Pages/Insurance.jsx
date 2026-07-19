import { useState, useEffect, useCallback } from 'react';
import {
  MdAdd, MdClose, MdSearch, MdRefresh,
  MdEdit, MdDelete, MdCheck, MdPerson,
  MdArrowBack, MdBarChart, MdShield,
  MdAttachMoney, MdWarning,
} from 'react-icons/md';
import toast from 'react-hot-toast';
import API from '../utils/api';

/* ── helpers ── */
const fmtPKR  = n => `₨${Math.round(Number(n||0)).toLocaleString()}`;
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-PK',{day:'2-digit',month:'short',year:'numeric'}) : '—';
const todayISO= () => new Date().toISOString().slice(0,10);

const PANEL_TYPES    = ['Insurance Company','Corporate Panel','Government Scheme','TPA'];
const CATEGORIES     = ['Health Insurance','Life Insurance','EOBI','PESSI','Zakat Fund','Corporate HR','Other'];
const COVERAGE_TYPES = ['Full','Partial','Co-pay','Cashless'];
const SERVICES       = ['Medicine','Consultation','Lab Tests','Radiology','IPD','OPD','Surgery','Emergency'];

const CLAIM_STATUS_CFG = {
  Draft:              { bg:'#f3f4f6', color:'#6b7280' },
  Submitted:          { bg:'#dbeafe', color:'#3b82f6' },
  'Under Review':     { bg:'#fef3c7', color:'#f59e0b' },
  Approved:           { bg:'#d1fae5', color:'#10b981' },
  'Partially Approved':{ bg:'#e0f2fe', color:'#0ea5e9' },
  Rejected:           { bg:'#fee2e2', color:'#ef4444' },
  Paid:               { bg:'#bbf7d0', color:'#16a34a' },
  Appealed:           { bg:'#f3e8ff', color:'#8b5cf6' },
};

const PAKISTAN_PANELS = [
  'Jubilee Health Insurance','EFU Health Insurance','Adamjee Insurance',
  'State Life Insurance','IGI Health Insurance','TPL Health Insurance',
  'Pak-Qatar Takaful','EOBI (Employees Old-Age Benefits Institution)',
  'PESSI (Punjab Employees Social Security Institution)','SESSI (Sindh ESS)',
  'Zakat Fund (Federal)','Pakistan Railways Medical','Armed Forces Medical',
];

/* ════════════════════════════════
   PANEL FORM MODAL
════════════════════════════════ */
function PanelModal({ existing, onClose, onSaved }) {
  const [form, setForm] = useState({
    name:               existing?.name               || '',
    shortCode:          existing?.shortCode          || '',
    type:               existing?.type               || 'Insurance Company',
    category:           existing?.category           || 'Health Insurance',
    coverageType:       existing?.coverageType       || 'Partial',
    coveragePercent:    existing?.coveragePercent    || 80,
    patientCoPayPercent:existing?.patientCoPayPercent|| 20,
    maxClaimPerBill:    existing?.maxClaimPerBill    || '',
    annualLimitPerPatient:existing?.annualLimitPerPatient||'',
    allowedServices:    existing?.allowedServices    || ['Medicine','Consultation'],
    contactPerson:      existing?.contactPerson      || '',
    phone:              existing?.phone              || '',
    email:              existing?.email              || '',
    city:               existing?.city               || '',
    policyNumber:       existing?.policyNumber       || '',
    agreementDate:      existing?.agreementDate ? new Date(existing.agreementDate).toISOString().slice(0,10) : '',
    expiryDate:         existing?.expiryDate    ? new Date(existing.expiryDate).toISOString().slice(0,10)    : '',
    paymentTerms:       existing?.paymentTerms       || 'Net 30',
    claimSubmissionMethod:existing?.claimSubmissionMethod||'Email',
    claimPortalUrl:     existing?.claimPortalUrl     || '',
    ntn:                existing?.ntn                || '',
    notes:              existing?.notes              || '',
  });
  const [saving, setSaving] = useState(false);
  const fld = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const toggleService = s => setForm(p => ({
    ...p,
    allowedServices: p.allowedServices.includes(s)
      ? p.allowedServices.filter(x => x !== s)
      : [...p.allowedServices, s],
  }));

  const handle = async () => {
    if (!form.name || !form.type) { toast.error('Name and type required'); return; }
    setSaving(true);
    try {
      if (existing) {
        await API.put(`/insurance/panels/${existing._id}`, form);
        toast.success('Panel updated');
      } else {
        await API.post('/insurance/panels', form);
        toast.success(`Panel "${form.name}" created`);
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg" style={{ maxHeight:'88vh', overflowY:'auto' }}>
        <div className="modal-header">
          <div className="modal-title">{existing ? 'Edit Panel' : 'Add Insurance Panel'}</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><MdClose /></button>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          {/* Left */}
          <div>
            <div className="form-group">
              <label className="form-label required">Panel / Company Name</label>
              <input className="form-control" value={form.name} onChange={fld('name')}
                placeholder="e.g. Jubilee Health Insurance" autoFocus list="panels-list" />
              <datalist id="panels-list">
                {PAKISTAN_PANELS.map(p => <option key={p} value={p} />)}
              </datalist>
              <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginTop:6 }}>
                {PAKISTAN_PANELS.slice(0,4).map(p => (
                  <button key={p} className="pill" style={{ fontSize:9 }}
                    onClick={() => setForm(f => ({ ...f, name:p }))}>
                    {p.split(' ').slice(0,2).join(' ')}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Short Code</label>
                <input className="form-control" value={form.shortCode} onChange={fld('shortCode')} placeholder="JHI" />
              </div>
              <div className="form-group">
                <label className="form-label required">Type</label>
                <select className="form-control" value={form.type} onChange={fld('type')}>
                  {PANEL_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-control" value={form.category} onChange={fld('category')}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>

            {/* Coverage */}
            <div style={{ background:'var(--bg-tertiary)', borderRadius:12, padding:14, marginBottom:12 }}>
              <div style={{ fontWeight:700, marginBottom:10, fontSize:13 }}>Coverage Terms</div>
              <div className="form-group" style={{ marginBottom:8 }}>
                <label className="form-label" style={{ fontSize:11 }}>Coverage Type</label>
                <select className="form-control" value={form.coverageType} onChange={fld('coverageType')}>
                  {COVERAGE_TYPES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group" style={{ marginBottom:0 }}>
                  <label className="form-label" style={{ fontSize:11 }}>Insurance Pays %</label>
                  <input className="form-control" type="number" min="0" max="100"
                    value={form.coveragePercent}
                    onChange={e => setForm(p => ({ ...p, coveragePercent: Number(e.target.value), patientCoPayPercent: 100 - Number(e.target.value) }))} />
                </div>
                <div className="form-group" style={{ marginBottom:0 }}>
                  <label className="form-label" style={{ fontSize:11 }}>Patient Co-Pay %</label>
                  <input className="form-control" type="number" value={form.patientCoPayPercent} readOnly
                    style={{ background:'var(--bg-secondary)' }} />
                </div>
              </div>
              <div className="form-row" style={{ marginTop:8 }}>
                <div className="form-group" style={{ marginBottom:0 }}>
                  <label className="form-label" style={{ fontSize:11 }}>Max Claim/Bill (₨, 0=unlimited)</label>
                  <input className="form-control" type="number" value={form.maxClaimPerBill} onChange={fld('maxClaimPerBill')} placeholder="0" />
                </div>
                <div className="form-group" style={{ marginBottom:0 }}>
                  <label className="form-label" style={{ fontSize:11 }}>Annual Limit/Patient (₨)</label>
                  <input className="form-control" type="number" value={form.annualLimitPerPatient} onChange={fld('annualLimitPerPatient')} placeholder="0 = unlimited" />
                </div>
              </div>
            </div>

            {/* Allowed services */}
            <div className="form-group">
              <label className="form-label">Covered Services</label>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {SERVICES.map(s => (
                  <button key={s}
                    onClick={() => toggleService(s)}
                    style={{
                      padding:'6px 12px', borderRadius:8, cursor:'pointer', fontSize:12,
                      background: form.allowedServices.includes(s) ? 'var(--accent)' : 'var(--bg-tertiary)',
                      color:      form.allowedServices.includes(s) ? '#fff' : 'var(--text-muted)',
                      border: `1px solid ${form.allowedServices.includes(s) ? 'var(--accent)' : 'var(--border)'}`,
                      fontWeight: 600,
                    }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right */}
          <div>
            <div style={{ fontWeight:700, fontSize:13, marginBottom:10 }}>Contact & Agreement</div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Contact Person</label>
                <input className="form-control" value={form.contactPerson} onChange={fld('contactPerson')} placeholder="Representative name" />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-control" value={form.phone} onChange={fld('phone')} placeholder="03XX-XXXXXXX" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-control" value={form.email} onChange={fld('email')} placeholder="claims@insurance.com" />
              </div>
              <div className="form-group">
                <label className="form-label">City</label>
                <input className="form-control" value={form.city} onChange={fld('city')} placeholder="Lahore" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Policy / Agreement No.</label>
                <input className="form-control" value={form.policyNumber} onChange={fld('policyNumber')} placeholder="POL-2025-001" />
              </div>
              <div className="form-group">
                <label className="form-label">NTN</label>
                <input className="form-control" value={form.ntn} onChange={fld('ntn')} placeholder="NTN-XXXXXXX" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Agreement Date</label>
                <input className="form-control" type="date" value={form.agreementDate} onChange={fld('agreementDate')} />
              </div>
              <div className="form-group">
                <label className="form-label">Expiry Date</label>
                <input className="form-control" type="date" value={form.expiryDate} onChange={fld('expiryDate')} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Payment Terms</label>
                <select className="form-control" value={form.paymentTerms} onChange={fld('paymentTerms')}>
                  {['Net 15','Net 30','Net 45','Net 60','Net 90','Monthly','Quarterly'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Claim Submission</label>
                <select className="form-control" value={form.claimSubmissionMethod} onChange={fld('claimSubmissionMethod')}>
                  {['Online Portal','Email','Physical','WhatsApp','Other'].map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
            </div>
            {form.claimSubmissionMethod === 'Online Portal' && (
              <div className="form-group">
                <label className="form-label">Portal URL</label>
                <input className="form-control" value={form.claimPortalUrl} onChange={fld('claimPortalUrl')} placeholder="https://claims.insurance.com" />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="form-control" rows={2} value={form.notes} onChange={fld('notes')} placeholder="Special terms, excluded medicines, remarks..." />
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handle} disabled={saving || !form.name}>
            {saving ? 'Saving...' : existing ? 'Update Panel' : 'Create Panel'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════
   LINK PATIENT MODAL
════════════════════════════════ */
function LinkPatientModal({ panels, onClose, onLinked }) {
  const [patients, setPatients]   = useState([]);
  const [pSearch,  setPSearch]    = useState('');
  const [selected, setSelected]   = useState(null);
  const [form, setForm] = useState({ panelId:'', policyNo:'', expiryDate:'' });
  const [saving, setSaving] = useState(false);
  const fld = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  useEffect(() => {
    if (pSearch.length < 2) { setPatients([]); return; }
    API.get('/patients', { params: { search: pSearch, limit: 6 } })
      .then(({ data }) => setPatients(data.patients || []))
      .catch(() => {});
  }, [pSearch]);

  const selectedPanel = panels.find(p => p._id === form.panelId);

  const handle = async () => {
    if (!selected || !form.panelId) { toast.error('Select patient and panel'); return; }
    setSaving(true);
    try {
      await API.post('/insurance/link-patient', { patientId: selected._id, ...form });
      toast.success(`${selected.name} linked to ${selectedPanel?.name}`);
      onLinked();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <div className="modal-title">Link Patient to Panel</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><MdClose /></button>
        </div>

        <div className="form-group">
          <label className="form-label required">Patient</label>
          {selected ? (
            <div style={{ background:'var(--bg-tertiary)', borderRadius:10, padding:'10px 14px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontWeight:700 }}>{selected.name}</div>
                <div className="text-muted text-sm">{selected.patientId} · {selected.age}y</div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => { setSelected(null); setPSearch(''); }}>Change</button>
            </div>
          ) : (
            <div style={{ position:'relative' }}>
              <div className="input-group">
                <MdSearch className="input-icon" />
                <input className="form-control" placeholder="Search patient..." value={pSearch} onChange={e => setPSearch(e.target.value)} autoFocus />
              </div>
              {patients.length > 0 && (
                <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'var(--card-bg)', border:'1px solid var(--border)', borderRadius:10, zIndex:100, boxShadow:'var(--shadow-lg)', marginTop:4 }}>
                  {patients.map(p => (
                    <div key={p._id} style={{ padding:'10px 14px', cursor:'pointer', borderBottom:'1px solid var(--border-light)' }}
                      onMouseDown={() => { setSelected(p); setPSearch(''); setPatients([]); }}>
                      <div style={{ fontWeight:600 }}>{p.name}</div>
                      <div className="text-muted text-sm">{p.patientId} · {p.isInsured ? `Already insured: ${p.insurancePanelName}` : 'Not insured'}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="form-group">
          <label className="form-label required">Insurance Panel</label>
          <select className="form-control" value={form.panelId} onChange={fld('panelId')}>
            <option value="">Select panel...</option>
            {panels.map(p => <option key={p._id} value={p._id}>{p.name} ({p.coveragePercent}%)</option>)}
          </select>
        </div>

        {selectedPanel && (
          <div style={{ background:'var(--bg-tertiary)', borderRadius:10, padding:'10px 14px', marginBottom:12, fontSize:13 }}>
            <div style={{ fontWeight:700 }}>{selectedPanel.name}</div>
            <div className="text-muted">Coverage: {selectedPanel.coveragePercent}% · Patient pays: {selectedPanel.patientCoPayPercent}%</div>
            <div className="text-muted">Services: {selectedPanel.allowedServices?.join(', ')}</div>
          </div>
        )}

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Policy / Member No.</label>
            <input className="form-control" value={form.policyNo} onChange={fld('policyNo')} placeholder="POL-123456" />
          </div>
          <div className="form-group">
            <label className="form-label">Coverage Expiry</label>
            <input className="form-control" type="date" value={form.expiryDate} onChange={fld('expiryDate')} min={todayISO()} />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handle} disabled={saving || !selected || !form.panelId}>
            {saving ? 'Linking...' : 'Link to Panel'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════
   CREATE CLAIM MODAL
════════════════════════════════ */
function CreateClaimModal({ panels, onClose, onCreated }) {
  const [patients, setPatients]   = useState([]);
  const [pSearch,  setPSearch]    = useState('');
  const [selected, setSelected]   = useState(null);
  const [calculation, setCalc]    = useState(null);
  const [form, setForm] = useState({
    panelId:'', billAmount:'', preAuthRequired: false,
    preAuthNumber:'', submissionNotes:'',
  });
  const [saving, setSaving] = useState(false);
  const fld = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  useEffect(() => {
    if (pSearch.length < 2) { setPatients([]); return; }
    API.get('/patients', { params: { search: pSearch, limit: 6 } })
      .then(({ data }) => setPatients(data.patients || []))
      .catch(() => {});
  }, [pSearch]);

  useEffect(() => {
    if (!selected?.insurancePanel) {
      setForm(p => ({ ...p, panelId: '' }));
    } else {
      setForm(p => ({ ...p, panelId: selected.insurancePanel }));
    }
  }, [selected]);

  const calculateCoverage = async () => {
    if (!form.panelId || !form.billAmount) return;
    try {
      const { data } = await API.post('/insurance/calculate', {
        panelId: form.panelId, billAmount: Number(form.billAmount),
      });
      setCalc(data.calculation);
    } catch {}
  };

  useEffect(() => {
    if (form.panelId && form.billAmount) calculateCoverage();
  }, [form.panelId, form.billAmount]);

  const handle = async () => {
    if (!selected || !form.panelId || !form.billAmount) {
      toast.error('Patient, panel and bill amount required'); return;
    }
    setSaving(true);
    try {
      await API.post('/insurance/claims', {
        panelId:      form.panelId,
        patientId:    selected._id,
        claimAmount:  calculation?.insurancePortion || 0,
        patientPortion:calculation?.patientPortion  || 0,
        preAuthRequired: form.preAuthRequired,
        preAuthNumber:   form.preAuthNumber,
        submissionNotes: form.submissionNotes,
      });
      toast.success('Claim created!');
      onCreated();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 500 }}>
        <div className="modal-header">
          <div className="modal-title">Create Insurance Claim</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><MdClose /></button>
        </div>

        <div className="form-group">
          <label className="form-label required">Patient</label>
          {selected ? (
            <div style={{ background:'var(--bg-tertiary)', borderRadius:10, padding:'10px 14px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontWeight:700 }}>{selected.name}</div>
                <div className="text-muted text-sm">{selected.patientId}
                  {selected.isInsured && <span style={{ color:'#10b981', marginLeft:8 }}>✓ {selected.insurancePanelName}</span>}
                </div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => { setSelected(null); setPSearch(''); setCalc(null); }}>Change</button>
            </div>
          ) : (
            <div style={{ position:'relative' }}>
              <div className="input-group">
                <MdSearch className="input-icon" />
                <input className="form-control" placeholder="Search patient..." value={pSearch} onChange={e => setPSearch(e.target.value)} autoFocus />
              </div>
              {patients.length > 0 && (
                <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'var(--card-bg)', border:'1px solid var(--border)', borderRadius:10, zIndex:100, boxShadow:'var(--shadow-lg)', marginTop:4 }}>
                  {patients.map(p => (
                    <div key={p._id} style={{ padding:'10px 14px', cursor:'pointer', borderBottom:'1px solid var(--border-light)' }}
                      onMouseDown={() => { setSelected(p); setPSearch(''); setPatients([]); }}>
                      <div style={{ fontWeight:600 }}>{p.name}</div>
                      <div className="text-muted text-sm">{p.patientId} · {p.isInsured ? `Insured: ${p.insurancePanelName}` : 'No insurance'}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label required">Panel</label>
            <select className="form-control" value={form.panelId} onChange={fld('panelId')}>
              <option value="">Select panel...</option>
              {panels.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label required">Total Bill Amount (₨)</label>
            <input className="form-control" type="number" min="0" value={form.billAmount} onChange={fld('billAmount')} placeholder="0" />
          </div>
        </div>

        {/* Coverage calculation */}
        {calculation && (
          <div style={{ background:'var(--bg-tertiary)', borderRadius:12, padding:14, marginBottom:14 }}>
            <div style={{ fontWeight:700, marginBottom:8, fontSize:13 }}>Coverage Calculation</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
              {[
                { label:'Total Bill',      value: fmtPKR(calculation.totalBill),        color:'var(--text-primary)' },
                { label:`Insurance (${calculation.coveragePercent}%)`, value: fmtPKR(calculation.insurancePortion), color:'#10b981' },
                { label:'Patient Pays',    value: fmtPKR(calculation.patientPortion),   color:'#f59e0b' },
              ].map(s => (
                <div key={s.label} style={{ textAlign:'center', background:'var(--card-bg)', borderRadius:8, padding:'8px' }}>
                  <div style={{ fontSize:16, fontWeight:900, color:s.color }}>{s.value}</div>
                  <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:2 }}>{s.label}</div>
                </div>
              ))}
            </div>
            {calculation.maxClaimPerBill > 0 && Number(form.billAmount) > calculation.maxClaimPerBill && (
              <div style={{ marginTop:8, fontSize:12, color:'#f59e0b' }}>
                ⚠️ Max claim limit: {fmtPKR(calculation.maxClaimPerBill)} — excess not covered
              </div>
            )}
          </div>
        )}

        <div style={{ marginBottom:12 }}>
          <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', fontSize:13 }}>
            <input type="checkbox" checked={form.preAuthRequired} onChange={e => setForm(p => ({ ...p, preAuthRequired: e.target.checked }))} />
            <span style={{ fontWeight:600 }}>Pre-authorization required</span>
          </label>
          {form.preAuthRequired && (
            <input className="form-control" style={{ marginTop:8 }} value={form.preAuthNumber} onChange={fld('preAuthNumber')} placeholder="Pre-auth reference number" />
          )}
        </div>

        <div className="form-group">
          <label className="form-label">Submission Notes</label>
          <textarea className="form-control" rows={2} value={form.submissionNotes} onChange={fld('submissionNotes')} placeholder="Any notes for the insurance company..." />
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handle} disabled={saving || !selected || !form.panelId || !form.billAmount}>
            {saving ? 'Creating...' : 'Create Claim'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════
   CLAIM STATUS UPDATE MODAL
════════════════════════════════ */
function UpdateStatusModal({ claim, onClose, onUpdated }) {
  const [status,         setStatus]         = useState(claim.status);
  const [approvedAmount, setApprovedAmount] = useState(claim.approvedAmount || claim.claimAmount);
  const [paidAmount,     setPaidAmount]     = useState(claim.paidAmount || claim.approvedAmount);
  const [notes,          setNotes]          = useState('');
  const [panelClaimRef,  setPanelClaimRef]  = useState(claim.panelClaimRef || '');
  const [chequeNumber,   setChequeNumber]   = useState(claim.chequeNumber || '');
  const [saving,         setSaving]         = useState(false);

  const FLOW = ['Draft','Submitted','Under Review','Approved','Partially Approved','Paid','Rejected','Appealed'];

  const handle = async () => {
    setSaving(true);
    try {
      await API.patch(`/insurance/claims/${claim._id}/status`, {
        status, approvedAmount, paidAmount, panelClaimRef, chequeNumber,
        approvalNotes: ['Approved','Partially Approved'].includes(status) ? notes : undefined,
        rejectionReason: status === 'Rejected' ? notes : undefined,
        appealNotes: status === 'Appealed' ? notes : undefined,
      });
      toast.success(`Claim ${claim.claimNumber} → ${status}`);
      onUpdated();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <div>
            <div className="modal-title">Update Claim Status</div>
            <div className="text-muted text-sm">{claim.claimNumber} · {claim.patientName}</div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><MdClose /></button>
        </div>

        <div className="form-group">
          <label className="form-label">Status</label>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {FLOW.map(s => {
              const cfg = CLAIM_STATUS_CFG[s] || {};
              return (
                <button key={s}
                  onClick={() => setStatus(s)}
                  style={{
                    padding:'7px 12px', borderRadius:8, cursor:'pointer',
                    background: status === s ? cfg.color : cfg.bg,
                    color:      status === s ? '#fff'    : cfg.color,
                    border: `2px solid ${cfg.color}`, fontWeight:700, fontSize:12,
                  }}>
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        {['Approved','Partially Approved'].includes(status) && (
          <div className="form-group">
            <label className="form-label">Approved Amount (₨)</label>
            <input className="form-control" type="number" value={approvedAmount}
              onChange={e => setApprovedAmount(e.target.value)} />
          </div>
        )}

        {status === 'Paid' && (
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Amount Received (₨)</label>
              <input className="form-control" type="number" value={paidAmount}
                onChange={e => setPaidAmount(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Cheque / Transfer No.</label>
              <input className="form-control" value={chequeNumber}
                onChange={e => setChequeNumber(e.target.value)} placeholder="CHQ-12345" />
            </div>
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Panel Reference No.</label>
          <input className="form-control" value={panelClaimRef}
            onChange={e => setPanelClaimRef(e.target.value)} placeholder="Insurance company's reference" />
        </div>

        <div className="form-group">
          <label className="form-label">
            {status === 'Rejected' ? 'Rejection Reason' : status === 'Appealed' ? 'Appeal Notes' : 'Notes'}
          </label>
          <textarea className="form-control" rows={2} value={notes} onChange={e => setNotes(e.target.value)}
            placeholder={status === 'Rejected' ? 'Why was the claim rejected?' : 'Additional notes...'} />
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handle} disabled={saving}>
            {saving ? 'Updating...' : `Set to ${status}`}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════
   MAIN PAGE
════════════════════════════════ */
export default function Insurance() {
  const [activeTab,  setActiveTab]  = useState('panels');
  const [panels,     setPanels]     = useState([]);
  const [claims,     setClaims]     = useState([]);
  const [stats,      setStats]      = useState({});
  const [report,     setReport]     = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [claimsTotal,setClaimsTotal]= useState(0);
  const [claimsPages,setClaimsPages]= useState(1);
  const [claimsPage, setClaimsPage] = useState(1);

  const [statusFilter, setStatusFilter] = useState('');
  const [panelFilter,  setPanelFilter]  = useState('');
  const [search,       setSearch]       = useState('');

  const [panelModal,    setPanelModal]   = useState(null);
  const [linkModal,     setLinkModal]    = useState(false);
  const [claimModal,    setClaimModal]   = useState(false);
  const [statusModal,   setStatusModal]  = useState(null);

  const fetchPanels = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/insurance/panels', { params: { limit: 50 } });
      setPanels(data.panels || []);
    } catch {}
    finally { setLoading(false); }
  }, []);

  const fetchClaims = useCallback(async () => {
    try {
      const { data } = await API.get('/insurance/claims', {
        params: { status: statusFilter || undefined, panelId: panelFilter || undefined, search: search || undefined, page: claimsPage, limit: 20 },
      });
      setClaims(data.claims || []);
      setClaimsTotal(data.total || 0);
      setClaimsPages(data.totalPages || 1);
    } catch {}
  }, [statusFilter, panelFilter, search, claimsPage]);

  const fetchReport = useCallback(async () => {
    API.get('/insurance/report')
      .then(({ data }) => setReport(data.report))
      .catch(() => {});
  }, []);

  const fetchStats = useCallback(() => {
    API.get('/insurance/stats').then(({ data }) => setStats(data.stats)).catch(() => {});
  }, []);

  useEffect(() => { fetchPanels(); fetchStats(); fetchReport(); }, [fetchPanels, fetchStats, fetchReport]);
  useEffect(() => { fetchClaims(); }, [fetchClaims]);
  useEffect(() => { setClaimsPage(1); }, [statusFilter, panelFilter, search]);

  const handleDeletePanel = async (id, name) => {
    if (!confirm(`Delete panel "${name}"?`)) return;
    try {
      await API.delete(`/insurance/panels/${id}`);
      toast.success('Panel deleted');
      fetchPanels(); fetchStats();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const TABS = [
    { id:'panels',  label:`Panels (${panels.length})` },
    { id:'claims',  label:`Claims (${claimsTotal})`   },
    { id:'report',  label:'Report'                    },
  ];

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Insurance & Panel Management</h1>
          <p>
            {stats.panels||0} panels · {stats.insuredPatients||0} insured patients ·
            {stats.pendingClaims > 0 && <span style={{ color:'#f59e0b', fontWeight:700 }}> {stats.pendingClaims} pending</span>}
          </p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-secondary" onClick={() => setLinkModal(true)}>
            <MdPerson /> Link Patient
          </button>
          <button className="btn btn-secondary" onClick={() => setClaimModal(true)}>
            <MdReceipt /> New Claim
          </button>
          <button className="btn btn-primary" onClick={() => setPanelModal('new')}>
            <MdAdd /> Add Panel
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom:20 }}>
        {[
          { label:'Active Panels',    value:stats.panels||0,          color:'#0ea5e9', icon:'🛡' },
          { label:'Insured Patients', value:stats.insuredPatients||0, color:'#10b981', icon:'👥' },
          { label:'Pending Claims',   value:stats.pendingClaims||0,   color:'#f59e0b', icon:'⏳' },
          { label:'Outstanding',      value:fmtPKR(stats.outstanding||0), color:'#ef4444', icon:'💰' },
          { label:'Paid This Month',  value:fmtPKR(stats.paidThisMonth||0), color:'#16a34a', icon:'✅' },
          { label:'Total Claims',     value:stats.totalClaims||0,     color:'#8b5cf6', icon:'📋' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background:s.color+'20', fontSize:20 }}>{s.icon}</div>
            <div>
              <div className="stat-value" style={{ color:s.color, fontSize: typeof s.value==='string'?16:24 }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:20, borderBottom:'1px solid var(--border)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{ padding:'10px 16px', background:'none', border:'none', borderBottom: activeTab===t.id?'2px solid var(--accent)':'2px solid transparent', color: activeTab===t.id?'var(--accent)':'var(--text-muted)', fontWeight: activeTab===t.id?700:500, cursor:'pointer', fontSize:14, fontFamily:'var(--font-main)' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── PANELS TAB ── */}
      {activeTab === 'panels' && (
        <div>
          {loading ? (
            <div className="flex-center" style={{ height:200 }}><div className="text-muted">Loading...</div></div>
          ) : panels.length === 0 ? (
            <div className="empty-state">
              <MdShield size={52} style={{ opacity:0.3, marginBottom:16 }} />
              <h3>No insurance panels yet</h3>
              <button className="btn btn-primary" style={{ marginTop:12 }} onClick={() => setPanelModal('new')}>
                <MdAdd /> Add First Panel
              </button>
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px,1fr))', gap:16 }}>
              {panels.map(panel => {
                const isExpiring = panel.expiryDate && new Date(panel.expiryDate) < new Date(Date.now() + 30*86400000);
                const isExpired  = panel.expiryDate && new Date(panel.expiryDate) < new Date();
                return (
                  <div key={panel._id} style={{ border:`1px solid ${isExpired?'#fca5a5':'var(--border)'}`, borderRadius:14, padding:16, background:'var(--card-bg)', position:'relative' }}>
                    {isExpired  && <div style={{ position:'absolute', top:-8, right:12, background:'#ef4444', color:'#fff', fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:99 }}>EXPIRED</div>}
                    {isExpiring && !isExpired && <div style={{ position:'absolute', top:-8, right:12, background:'#f59e0b', color:'#fff', fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:99 }}>EXPIRING SOON</div>}

                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                      <div>
                        <div style={{ fontWeight:800, fontSize:15 }}>{panel.name}</div>
                        <div className="text-muted text-sm">{panel.type} · {panel.category}</div>
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
                        <span style={{ background:'#e0f2fe', color:'#0284c7', padding:'4px 12px', borderRadius:99, fontSize:16, fontWeight:900 }}>
                          {panel.coveragePercent}%
                        </span>
                        <span style={{ fontSize:11, color:'var(--text-muted)' }}>{panel.coverageType}</span>
                      </div>
                    </div>

                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:10 }}>
                      {[
                        { label:'Claims',   value:panel.totalClaims  || 0 },
                        { label:'Patients', value:panel.totalPatients || 0 },
                        { label:'Claimed',  value:fmtPKR(panel.totalClaimed)  },
                        { label:'Paid',     value:fmtPKR(panel.totalPaid)     },
                      ].map(({ label, value }) => (
                        <div key={label} style={{ background:'var(--bg-tertiary)', borderRadius:8, padding:'8px 10px' }}>
                          <div className="text-muted" style={{ fontSize:10 }}>{label}</div>
                          <div style={{ fontWeight:700, fontSize:14, marginTop:2 }}>{value}</div>
                        </div>
                      ))}
                    </div>

                    <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:10 }}>
                      {panel.allowedServices?.slice(0,4).join(' · ')}{panel.allowedServices?.length > 4 ? '...' : ''}
                    </div>
                    {panel.expiryDate && (
                      <div style={{ fontSize:11, color: isExpired?'#ef4444':isExpiring?'#f59e0b':'var(--text-muted)', marginBottom:10 }}>
                        Expires: {fmtDate(panel.expiryDate)}
                      </div>
                    )}
                    {panel.paymentTerms && (
                      <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:10 }}>
                        Payment: {panel.paymentTerms} · Submission: {panel.claimSubmissionMethod}
                      </div>
                    )}

                    <div style={{ display:'flex', gap:6 }}>
                      <button className="btn btn-secondary btn-sm" style={{ flex:1 }}
                        onClick={() => { setStatusFilter(''); setPanelFilter(panel._id); setActiveTab('claims'); }}>
                        View Claims
                      </button>
                      <button className="btn btn-secondary btn-sm btn-icon" onClick={() => setPanelModal(panel)}><MdEdit size={14}/></button>
                      <button className="btn btn-ghost btn-sm btn-icon" onClick={() => handleDeletePanel(panel._id, panel.name)}>
                        <MdDelete size={14} style={{ color:'var(--danger)' }} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── CLAIMS TAB ── */}
      {activeTab === 'claims' && (
        <div>
          {/* Filters */}
          <div className="card" style={{ marginBottom:16 }}>
            <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
              <div className="search-box" style={{ flex:1, minWidth:200 }}>
                <MdSearch className="search-icon" />
                <input placeholder="Search claim number, patient, bill..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <select className="form-control" style={{ width:180 }} value={panelFilter} onChange={e => setPanelFilter(e.target.value)}>
                <option value="">All Panels</option>
                {panels.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
            </div>
            <div style={{ display:'flex', gap:6, marginTop:10, flexWrap:'wrap' }}>
              <button className={`pill${statusFilter===''?' active':''}`} onClick={() => setStatusFilter('')}>All ({claimsTotal})</button>
              {Object.keys(CLAIM_STATUS_CFG).map(s => (
                <button key={s} className={`pill${statusFilter===s?' active':''}`}
                  onClick={() => setStatusFilter(statusFilter===s?'':s)}
                  style={{ fontSize:11 }}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {claims.length === 0 ? (
            <div className="empty-state">
              <MdAttachMoney size={48} style={{ opacity:0.3, marginBottom:12 }} />
              <h3>No claims found</h3>
              <button className="btn btn-primary" style={{ marginTop:12 }} onClick={() => setClaimModal(true)}>
                <MdAdd /> Create First Claim
              </button>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {claims.map(claim => {
                const sc = CLAIM_STATUS_CFG[claim.status] || CLAIM_STATUS_CFG.Draft;
                return (
                  <div key={claim._id} style={{ border:'1px solid var(--border)', borderLeft:`5px solid ${sc.color}`, borderRadius:12, padding:'12px 16px', background:'var(--card-bg)', display:'grid', gridTemplateColumns:'1fr 1fr auto', gap:14, alignItems:'center' }}>
                    <div>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                        <span style={{ fontWeight:700 }}>{claim.claimNumber}</span>
                        <span style={{ background:sc.bg, color:sc.color, padding:'2px 8px', borderRadius:99, fontSize:11, fontWeight:700 }}>{claim.status}</span>
                      </div>
                      <div style={{ fontSize:13, fontWeight:600 }}>{claim.patientName}</div>
                      <div className="text-muted text-sm">{claim.panelName}{claim.billNumber ? ` · ${claim.billNumber}` : ''}</div>
                      <div className="text-muted" style={{ fontSize:11 }}>{fmtDate(claim.createdAt)}</div>
                    </div>
                    <div>
                      {[
                        { label:'Claimed',  value:fmtPKR(claim.claimAmount),   color:'#0ea5e9' },
                        { label:'Approved', value:fmtPKR(claim.approvedAmount), color:'#10b981' },
                        { label:'Paid',     value:fmtPKR(claim.paidAmount),     color:'#16a34a' },
                        { label:'Patient',  value:fmtPKR(claim.patientPortion), color:'#f59e0b' },
                      ].map(({ label, value, color }) => (
                        <div key={label} style={{ display:'flex', justifyContent:'space-between', fontSize:12, padding:'2px 0' }}>
                          <span className="text-muted">{label}:</span>
                          <span style={{ fontWeight:700, color }}>{value}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                      {!['Paid','Rejected'].includes(claim.status) && (
                        <button className="btn btn-primary btn-sm" onClick={() => setStatusModal(claim)}>
                          Update Status
                        </button>
                      )}
                      {claim.status === 'Draft' && (
                        <button className="btn btn-danger btn-sm" onClick={async () => {
                          if (!confirm(`Delete claim ${claim.claimNumber}?`)) return;
                          try {
                            await API.delete(`/insurance/claims/${claim._id}`);
                            toast.success('Claim deleted');
                            fetchClaims(); fetchStats();
                          } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
                        }}>
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {claimsPages > 1 && (
            <div className="pagination" style={{ marginTop:12 }}>
              <button disabled={claimsPage===1} onClick={()=>setClaimsPage(p=>p-1)}>‹</button>
              {Array.from({length:claimsPages},(_,i)=>i+1).map(p=>(
                <button key={p} className={claimsPage===p?'active':''} onClick={()=>setClaimsPage(p)}>{p}</button>
              ))}
              <button disabled={claimsPage===claimsPages} onClick={()=>setClaimsPage(p=>p+1)}>›</button>
            </div>
          )}
        </div>
      )}

      {/* ── REPORT TAB ── */}
      {activeTab === 'report' && report && (
        <div>
          {/* Totals */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
            {[
              { label:'Total Claimed',  value:fmtPKR(report.totals.claimed),  color:'#0ea5e9' },
              { label:'Total Approved', value:fmtPKR(report.totals.approved), color:'#10b981' },
              { label:'Total Paid',     value:fmtPKR(report.totals.paid),     color:'#16a34a' },
              { label:'Pending Payment',value:fmtPKR(report.totals.pending),  color:'#f59e0b' },
            ].map(s => (
              <div key={s.label} style={{ background:s.color+'12', border:`1px solid ${s.color}30`, borderRadius:12, padding:'14px 16px', textAlign:'center' }}>
                <div style={{ fontSize:22, fontWeight:900, color:s.color }}>{s.value}</div>
                <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:4 }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            {/* By Panel */}
            <div className="card">
              <div style={{ fontWeight:700, marginBottom:12 }}>Panel Performance</div>
              {report.byPanel.length === 0 ? (
                <div className="text-muted text-sm">No claims yet</div>
              ) : (
                report.byPanel.map(p => {
                  const approvalRate = p.totalClaimed > 0 ? Math.round((p.totalApproved/p.totalClaimed)*100) : 0;
                  return (
                    <div key={p._id} style={{ marginBottom:16 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                        <div>
                          <div style={{ fontWeight:700, fontSize:13 }}>{p.panelName}</div>
                          <div className="text-muted" style={{ fontSize:11 }}>
                            {p.totalClaims} claims · {p.uniquePatients} patients · {p.registeredPatients} registered
                          </div>
                        </div>
                        <span style={{ fontWeight:800, color:'#10b981', fontSize:13 }}>{approvalRate}%</span>
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:4, marginBottom:6 }}>
                        {[
                          {l:'Claimed',  v:fmtPKR(p.totalClaimed),  c:'#0ea5e9'},
                          {l:'Approved', v:fmtPKR(p.totalApproved), c:'#10b981'},
                          {l:'Paid',     v:fmtPKR(p.totalPaid),     c:'#16a34a'},
                        ].map(s=>(
                          <div key={s.l} style={{ background:'var(--bg-tertiary)', borderRadius:6, padding:'4px 8px', textAlign:'center' }}>
                            <div style={{ fontSize:12, fontWeight:700, color:s.c }}>{s.v}</div>
                            <div style={{ fontSize:9, color:'var(--text-muted)' }}>{s.l}</div>
                          </div>
                        ))}
                      </div>
                      {/* Progress */}
                      <div style={{ height:6, background:'var(--border)', borderRadius:99, overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${approvalRate}%`, background:'#10b981', borderRadius:99 }} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* By Status */}
            <div className="card">
              <div style={{ fontWeight:700, marginBottom:12 }}>Claims by Status</div>
              {report.byStatus.map(s => {
                const cfg = CLAIM_STATUS_CFG[s._id] || {};
                return (
                  <div key={s._id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid var(--border-light)' }}>
                    <div style={{ width:10, height:10, borderRadius:'50%', background:cfg.color, flexShrink:0 }} />
                    <div style={{ flex:1 }}>
                      <span style={{ fontWeight:600, fontSize:13 }}>{s._id}</span>
                      <span className="text-muted" style={{ marginLeft:6, fontSize:11 }}>({s.count} claims)</span>
                    </div>
                    <span style={{ fontWeight:700, color:cfg.color }}>{fmtPKR(s.amount)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {panelModal && (
        <PanelModal
          existing={panelModal !== 'new' ? panelModal : null}
          onClose={() => setPanelModal(null)}
          onSaved={() => { setPanelModal(null); fetchPanels(); fetchStats(); fetchReport(); }}
        />
      )}
      {linkModal && (
        <LinkPatientModal
          panels={panels}
          onClose={() => setLinkModal(false)}
          onLinked={() => { setLinkModal(false); fetchStats(); }}
        />
      )}
      {claimModal && (
        <CreateClaimModal
          panels={panels}
          onClose={() => setClaimModal(false)}
          onCreated={() => { setClaimModal(false); fetchClaims(); fetchStats(); fetchReport(); }}
        />
      )}
      {statusModal && (
        <UpdateStatusModal
          claim={statusModal}
          onClose={() => setStatusModal(null)}
          onUpdated={() => { setStatusModal(null); fetchClaims(); fetchStats(); fetchReport(); }}
        />
      )}
    </div>
  );
}

/* ── Inline icon ── */
function MdReceipt({ size = 20, ...props }) {
  return <MdAttachMoney size={size} {...props} />;
}