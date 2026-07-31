import { useState, useEffect, useCallback } from 'react';
import {
  MdAdd, MdClose, MdSearch, MdRefresh,
  MdPerson, MdWarning, MdCheck, MdDelete,
  MdBloodtype, MdArrowBack,
} from 'react-icons/md';
import toast from 'react-hot-toast';
import API from '../utils/api';
import { useSocket } from '../context/SocketContext';
import ShortLoader from '../Components/ShortLoader';

/* ── helpers ── */
const fmtDate  = d => d ? new Date(d).toLocaleDateString('en-PK', { day:'2-digit', month:'short', year:'numeric' }) : '—';
const fmtTime  = d => d ? new Date(d).toLocaleTimeString('en-PK', { hour:'2-digit', minute:'2-digit' }) : '—';
const daysTo   = d => d ? Math.floor((new Date(d) - new Date()) / 86400000) : null;

const BLOOD_GROUPS = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];
const COMPONENTS   = ['Whole Blood','Packed RBC','Fresh Frozen Plasma','Platelets','Cryoprecipitate','Single Donor Plasma'];

const BG_COLORS = {
  'A+':'#ef4444','A-':'#f97316','B+':'#0ea5e9','B-':'#6366f1',
  'AB+':'#8b5cf6','AB-':'#ec4899','O+':'#10b981','O-':'#14b8a6',
};

const STATUS_CFG = {
  Available:{ bg:'#d1fae5', color:'#10b981' },
  Reserved: { bg:'#fef3c7', color:'#f59e0b' },
  Issued:   { bg:'#e0e7ff', color:'#6366f1' },
  Expired:  { bg:'#fee2e2', color:'#ef4444' },
  Discarded:{ bg:'#f3f4f6', color:'#6b7280' },
};

/* ════════════════════════════════
   ADD UNIT MODAL
════════════════════════════════ */
function AddUnitModal({ onClose, onAdded }) {
  const [donors,   setDonors]   = useState([]);
  const [dSearch,  setDSearch]  = useState('');
  const [selDonor, setSelDonor] = useState(null);
  const [form, setForm] = useState({
    bloodGroup: 'O+', component: 'Whole Blood', volume: '450',
    bagType: 'Single', collectionDate: new Date().toISOString().slice(0,10),
    expiryDate: '', source: 'Donor', externalSource: '',
    hivTested: false, hbvTested: false, hcvTested: false,
    malariasTested: false, syphilisTested: false, allTestsClear: false,
    location: '', cost: '',
  });
  const [saving, setSaving] = useState(false);
  const fld  = k => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const chk  = k => e => setForm(p => ({ ...p, [k]: e.target.checked }));

  // Auto-calculate expiry (42 days for Whole Blood, 5 days for Platelets)
  useEffect(() => {
    if (!form.collectionDate) return;
    const expiryDays = {
      'Whole Blood': 35, 'Packed RBC': 42, 'Fresh Frozen Plasma': 365,
      'Platelets': 5, 'Cryoprecipitate': 365, 'Single Donor Plasma': 365,
    };
    const days   = expiryDays[form.component] || 35;
    const expiry = new Date(form.collectionDate);
    expiry.setDate(expiry.getDate() + days);
    setForm(p => ({ ...p, expiryDate: expiry.toISOString().slice(0, 10) }));
  }, [form.collectionDate, form.component]);

  useEffect(() => {
    if (dSearch.length < 2) { setDonors([]); return; }
    API.get('/blood-bank/donors', { params: { search: dSearch, limit: 6 } })
      .then(({ data }) => setDonors(data.donors || []))
      .catch(() => {});
  }, [dSearch]);

  // If all 5 tests checked → auto-check allTestsClear
  useEffect(() => {
    if (form.hivTested && form.hbvTested && form.hcvTested && form.malariasTested && form.syphilisTested) {
      setForm(p => ({ ...p, allTestsClear: true }));
    }
  }, [form.hivTested, form.hbvTested, form.hcvTested, form.malariasTested, form.syphilisTested]);

  const handleAdd = async () => {
    if (!form.bloodGroup || !form.collectionDate || !form.expiryDate) {
      toast.error('Blood group, collection date and expiry date required'); return;
    }
    setSaving(true);
    try {
      await API.post('/blood-bank/units', {
        ...form,
        donorId: selDonor?._id || null,
        volume:  Number(form.volume),
        cost:    Number(form.cost || 0),
      });
      toast.success('Blood unit added!');
      onAdded();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  const tests = [
    { key: 'hivTested',      label: 'HIV' },
    { key: 'hbvTested',      label: 'HBV (Hepatitis B)' },
    { key: 'hcvTested',      label: 'HCV (Hepatitis C)' },
    { key: 'malariasTested', label: 'Malaria' },
    { key: 'syphilisTested', label: 'Syphilis' },
  ];

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <div className="modal-title">Add Blood Unit</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><MdClose /></button>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          {/* Left */}
          <div>
            {/* Blood group */}
            <div className="form-group">
              <label className="form-label required">Blood Group</label>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6 }}>
                {BLOOD_GROUPS.map(g => (
                  <button key={g} onClick={() => setForm(p => ({ ...p, bloodGroup: g }))}
                    style={{ padding:'10px 0', borderRadius:10, border:`2px solid ${BG_COLORS[g]}`, background: form.bloodGroup===g ? BG_COLORS[g] : BG_COLORS[g]+'15', color: form.bloodGroup===g ? '#fff' : BG_COLORS[g], fontWeight:800, cursor:'pointer', fontSize:15 }}>
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Component</label>
                <select className="form-control" value={form.component} onChange={fld('component')}>
                  {COMPONENTS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Volume (ml)</label>
                <input className="form-control" type="number" value={form.volume} onChange={fld('volume')} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label required">Collection Date</label>
                <input className="form-control" type="date" value={form.collectionDate} onChange={fld('collectionDate')} max={new Date().toISOString().slice(0,10)} />
              </div>
              <div className="form-group">
                <label className="form-label required">Expiry Date</label>
                <input className="form-control" type="date" value={form.expiryDate} onChange={fld('expiryDate')} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Source</label>
              <div style={{ display:'flex', gap:8 }}>
                {['Donor','External Blood Bank','Replacement'].map(s => (
                  <button key={s} onClick={() => setForm(p => ({ ...p, source: s }))}
                    style={{ flex:1, padding:'8px 0', borderRadius:10, border:`2px solid var(--accent)`, background: form.source===s ? 'var(--accent)' : 'transparent', color: form.source===s ? '#fff' : 'var(--accent)', fontWeight:600, cursor:'pointer', fontSize:12 }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {form.source === 'Donor' && (
              <div className="form-group">
                <label className="form-label">Donor</label>
                {selDonor ? (
                  <div style={{ background:'var(--bg-tertiary)', borderRadius:10, padding:'10px 14px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div>
                      <div style={{ fontWeight:700 }}>{selDonor.name}</div>
                      <div className="text-muted text-sm">{selDonor.donorId} · {selDonor.bloodGroup}</div>
                    </div>
                    <button className="btn btn-secondary btn-sm" onClick={() => { setSelDonor(null); setDSearch(''); }}>Change</button>
                  </div>
                ) : (
                  <div style={{ position:'relative' }}>
                    <div className="input-group">
                      <MdSearch className="input-icon" />
                      <input className="form-control" placeholder="Search donor..." value={dSearch} onChange={e => setDSearch(e.target.value)} />
                    </div>
                    {donors.length > 0 && (
                      <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'var(--card-bg)', border:'1px solid var(--border)', borderRadius:10, zIndex:100, boxShadow:'var(--shadow-lg)', marginTop:4 }}>
                        {donors.map(d => (
                          <div key={d._id} style={{ padding:'10px 14px', cursor:'pointer', borderBottom:'1px solid var(--border-light)' }}
                            onMouseDown={() => { setSelDonor(d); setDSearch(''); setDonors([]); setForm(p => ({ ...p, bloodGroup: d.bloodGroup })); }}>
                            <div style={{ fontWeight:600 }}>{d.name}</div>
                            <div className="text-muted text-sm">{d.donorId} · {d.bloodGroup} · {d.totalDonations} donations</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {form.source === 'External Blood Bank' && (
              <div className="form-group">
                <label className="form-label">External Blood Bank Name</label>
                <input className="form-control" value={form.externalSource} onChange={fld('externalSource')} placeholder="Safe Blood Pakistan, etc." />
              </div>
            )}
          </div>

          {/* Right */}
          <div>
            {/* Screening tests */}
            <div className="form-group">
              <label className="form-label">Screening Tests</label>
              <div style={{ background:'var(--bg-tertiary)', borderRadius:12, padding:14 }}>
                {tests.map(t => (
                  <label key={t.key} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10, cursor:'pointer', fontSize:13 }}>
                    <input type="checkbox" checked={form[t.key]} onChange={chk(t.key)} />
                    <span style={{ fontWeight:500 }}>{t.label} tested</span>
                    {form[t.key] && <span style={{ color:'#10b981', fontSize:12, fontWeight:700 }}>✓ Clear</span>}
                  </label>
                ))}
                <div style={{ borderTop:'1px solid var(--border)', paddingTop:10, marginTop:4 }}>
                  <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', fontSize:13 }}>
                    <input type="checkbox" checked={form.allTestsClear} onChange={chk('allTestsClear')} />
                    <span style={{ fontWeight:700, color: form.allTestsClear ? '#10b981' : 'var(--text-primary)' }}>
                      ✅ ALL TESTS CLEAR — Safe to issue
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Storage Location</label>
                <input className="form-control" value={form.location} onChange={fld('location')} placeholder="Fridge A - Shelf 2" />
              </div>
              <div className="form-group">
                <label className="form-label">Cost (₨)</label>
                <input className="form-control" type="number" value={form.cost} onChange={fld('cost')} placeholder="0" />
              </div>
            </div>

            {/* Expiry preview */}
            {form.expiryDate && (
              <div style={{
                background: daysTo(form.expiryDate) <= 7 ? '#fef3c7' : '#d1fae5',
                borderRadius: 10, padding: '10px 14px', fontSize: 13,
              }}>
                <div style={{ fontWeight:700 }}>
                  {daysTo(form.expiryDate) <= 0 ? '🔴 Already expired!' :
                   daysTo(form.expiryDate) <= 7 ? `⚠️ Expires in ${daysTo(form.expiryDate)} days` :
                   `✅ Expires in ${daysTo(form.expiryDate)} days`}
                </div>
                <div className="text-muted" style={{ fontSize:11, marginTop:2 }}>Expiry: {fmtDate(form.expiryDate)}</div>
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAdd} disabled={saving}>
            {saving ? 'Adding...' : <><MdAdd /> Add Blood Unit</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════
   ISSUE UNIT MODAL
════════════════════════════════ */
function IssueModal({ unit, onClose, onIssued }) {
  const [patients, setPatients] = useState([]);
  const [pSearch,  setPSearch]  = useState('');
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ requestedBy:'', issuanceNotes:'', crossMatchDone: false });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (pSearch.length < 2) { setPatients([]); return; }
    API.get('/patients', { params: { search: pSearch, limit: 6 } })
      .then(({ data }) => setPatients(data.patients || []))
      .catch(() => {});
  }, [pSearch]);

  const handleIssue = async () => {
    if (!selected) { toast.error('Select a patient'); return; }
    setSaving(true);
    try {
      await API.post(`/blood-bank/units/${unit._id}/issue`, {
        patientId: selected._id, ...form,
      });
      toast.success(`${unit.bagId} issued to ${selected.name}`);
      onIssued();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 460 }}>
        <div className="modal-header">
          <div>
            <div className="modal-title">Issue Blood Unit</div>
            <div style={{ display:'flex', gap:8, marginTop:4 }}>
              <span style={{ background: BG_COLORS[unit.bloodGroup]+'20', color: BG_COLORS[unit.bloodGroup], padding:'3px 10px', borderRadius:99, fontSize:12, fontWeight:800 }}>{unit.bloodGroup}</span>
              <span className="text-muted text-sm">{unit.bagId} · {unit.component}</span>
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><MdClose /></button>
        </div>

        {!unit.allTestsClear && (
          <div style={{ background:'#fee2e2', color:'#ef4444', padding:'10px 14px', borderRadius:10, marginBottom:16, fontSize:13, fontWeight:600 }}>
            ⚠️ Warning: Not all screening tests are cleared for this unit.
          </div>
        )}

        {/* Patient search */}
        <div className="form-group">
          <label className="form-label required">Patient</label>
          {selected ? (
            <div style={{ background:'var(--bg-tertiary)', borderRadius:10, padding:'10px 14px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontWeight:700 }}>{selected.name}</div>
                <div className="text-muted text-sm">{selected.patientId} · {selected.bloodGroup}</div>
                {selected.bloodGroup && selected.bloodGroup !== unit.bloodGroup && (
                  <div style={{ color:'#ef4444', fontWeight:700, fontSize:12, marginTop:3 }}>
                    ⚠️ Blood group mismatch! Patient: {selected.bloodGroup}, Unit: {unit.bloodGroup}
                  </div>
                )}
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
                      <div className="text-muted text-sm">{p.patientId} · {p.bloodGroup || 'Blood group not set'}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">Requested By (Doctor)</label>
          <input className="form-control" value={form.requestedBy} onChange={e => setForm(p => ({ ...p, requestedBy:e.target.value }))} placeholder="Dr. Ahmed Khan" />
        </div>

        <div className="form-group">
          <label className="form-label">Notes</label>
          <input className="form-control" value={form.issuanceNotes} onChange={e => setForm(p => ({ ...p, issuanceNotes:e.target.value }))} placeholder="OT use, emergency transfusion..." />
        </div>

        <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', fontSize:13, marginBottom:16 }}>
          <input type="checkbox" checked={form.crossMatchDone} onChange={e => setForm(p => ({ ...p, crossMatchDone: e.target.checked }))} />
          <span style={{ fontWeight:600 }}>Cross-match test done ✓</span>
        </label>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-danger" onClick={handleIssue} disabled={saving || !selected}>
            {saving ? 'Issuing...' : '🩸 Issue Blood Unit'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════
   ADD DONOR MODAL
════════════════════════════════ */
function DonorModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    name:'', gender:'Male', age:'', cnic:'', phone:'',
    email:'', address:'', occupation:'', bloodGroup:'O+',
    medicalHistory:'', hasDisease: false, ineligibleReason:'',
  });
  const [saving, setSaving] = useState(false);
  const fld = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.name || !form.bloodGroup) { toast.error('Name and blood group required'); return; }
    setSaving(true);
    try {
      await API.post('/blood-bank/donors', form);
      toast.success(`Donor ${form.name} registered!`);
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <div className="modal-title">Register Blood Donor</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><MdClose /></button>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          <div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label required">Full Name</label>
                <input className="form-control" value={form.name} onChange={fld('name')} autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label">Gender</label>
                <select className="form-control" value={form.gender} onChange={fld('gender')}>
                  {['Male','Female','Other'].map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Age</label>
                <input className="form-control" type="number" min="17" max="65" value={form.age} onChange={fld('age')} />
              </div>
              <div className="form-group">
                <label className="form-label">CNIC</label>
                <input className="form-control" value={form.cnic} onChange={fld('cnic')} placeholder="XXXXX-XXXXXXX-X" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-control" value={form.phone} onChange={fld('phone')} />
              </div>
              <div className="form-group">
                <label className="form-label">Occupation</label>
                <input className="form-control" value={form.occupation} onChange={fld('occupation')} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Address</label>
              <input className="form-control" value={form.address} onChange={fld('address')} />
            </div>
          </div>
          <div>
            <div className="form-group">
              <label className="form-label required">Blood Group</label>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6 }}>
                {BLOOD_GROUPS.map(g => (
                  <button key={g} onClick={() => setForm(p => ({ ...p, bloodGroup:g }))}
                    style={{ padding:'10px 0', borderRadius:10, border:`2px solid ${BG_COLORS[g]}`, background: form.bloodGroup===g ? BG_COLORS[g] : BG_COLORS[g]+'15', color: form.bloodGroup===g ? '#fff' : BG_COLORS[g], fontWeight:800, cursor:'pointer', fontSize:14 }}>
                    {g}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Medical History</label>
              <textarea className="form-control" rows={3} value={form.medicalHistory} onChange={fld('medicalHistory')} placeholder="Any chronic conditions, medications, recent illnesses..." />
            </div>
            <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', fontSize:13, marginBottom:12 }}>
              <input type="checkbox" checked={form.hasDisease} onChange={e => setForm(p => ({ ...p, hasDisease: e.target.checked }))} />
              <span style={{ fontWeight:600, color: form.hasDisease ? '#ef4444' : 'inherit' }}>
                Has disqualifying condition (HIV/HBV/HCV/etc)
              </span>
            </label>
            {form.hasDisease && (
              <div className="form-group">
                <label className="form-label">Ineligibility Reason</label>
                <input className="form-control" value={form.ineligibleReason} onChange={fld('ineligibleReason')} placeholder="HBV positive, HIV positive, etc." />
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : <><MdPerson /> Register Donor</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════
   MAIN PAGE
════════════════════════════════ */
export default function BloodBank() {
  const [activeTab, setTab] = useState('inventory');
  const [inventory, setInventory] = useState(null);
  const [stats,     setStats]     = useState(null);
  const [units,     setUnits]     = useState([]);
  const [donors,    setDonors]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [total,     setTotal]     = useState(0);
  const [totalPages,setTotalPages]= useState(1);
  const [page,      setPage]      = useState(1);

  // Filters
  const [bgFilter,     setBGFilter]   = useState('');
  const [statusFilter, setStatusFilter]= useState('Available');
  const [search,       setSearch]     = useState('');

  // Modals
  const [addUnitModal,  setAddUnitModal]  = useState(false);
  const [issueModal,    setIssueModal]    = useState(null);
  const [addDonorModal, setAddDonorModal] = useState(false);

  const { on } = useSocket() || {};

  const fetchInventory = useCallback(async () => {
    try {
      const [invRes, statsRes] = await Promise.all([
        API.get('/blood-bank/inventory'),
        API.get('/blood-bank/stats'),
      ]);
      setInventory(invRes.data.inventory);
      setStats(statsRes.data.stats);
    } catch {}
    finally { setLoading(false); }
  }, []);

  const fetchUnits = useCallback(async () => {
    try {
      const params = { page, limit: 20 };
      if (bgFilter)     params.bloodGroup = bgFilter;
      if (statusFilter) params.status     = statusFilter;
      if (search)       params.search     = search;
      const { data } = await API.get('/blood-bank/units', { params });
      setUnits(data.units);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch {}
  }, [bgFilter, statusFilter, search, page]);

  const fetchDonors = useCallback(async () => {
    try {
      const { data } = await API.get('/blood-bank/donors', { params: { page, limit: 20, search } });
      setDonors(data.donors);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch {}
  }, [page, search]);

  useEffect(() => { fetchInventory(); }, [fetchInventory]);
  useEffect(() => {
    if (activeTab === 'units')   fetchUnits();
    if (activeTab === 'donors')  fetchDonors();
  }, [activeTab, fetchUnits, fetchDonors]);
  useEffect(() => { setPage(1); }, [bgFilter, statusFilter, search, activeTab]);

  useEffect(() => {
    if (!on) return;
    const unsubs = [
      on('bloodBank:unitAdded',    () => { fetchInventory(); if (activeTab==='units') fetchUnits(); }),
      on('bloodBank:unitIssued',   () => { fetchInventory(); if (activeTab==='units') fetchUnits(); }),
      on('bloodBank:criticalStock', (data) => {
        toast.error(`🩸 Critical: Low stock for ${data.criticalGroups.join(', ')}!`, { duration:8000 });
      }),
    ];
    return () => unsubs.forEach(u => u && u());
  }, [on, activeTab, fetchInventory, fetchUnits]);

  const handleDiscard = async (unit) => {
    const reason = prompt('Reason for discarding?');
    if (reason === null) return;
    try {
      await API.patch(`/blood-bank/units/${unit._id}/discard`, { reason });
      toast.success(`${unit.bagId} discarded`);
      fetchUnits(); fetchInventory();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleRelease = async (unit) => {
    try {
      await API.patch(`/blood-bank/units/${unit._id}/release`);
      toast.success('Reservation released');
      fetchUnits(); fetchInventory();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const afterAction = () => {
    setIssueModal(null);
    fetchInventory();
    fetchUnits();
  };

  const TABS = [
    { id:'inventory', label:'Inventory Overview' },
    { id:'units',     label:'Blood Units'         },
    { id:'donors',    label:'Donors'              },
  ];

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>Blood Bank</h1>
          <p>
            {stats?.units.available || 0} units available ·
            {stats?.criticalAlerts?.length > 0 && (
              <span style={{ color:'#ef4444', fontWeight:700 }}> ⚠️ Critical: {stats.criticalAlerts.join(', ')}</span>
            )}
          </p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-secondary" onClick={() => { setAddDonorModal(true); }}>
            <MdPerson /> Add Donor
          </button>
          <button className="btn btn-secondary btn-sm" onClick={fetchInventory}><MdRefresh /></button>
          <button className="btn btn-primary" onClick={() => setAddUnitModal(true)}>
            <MdAdd /> Add Blood Unit
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="stat-grid" style={{ marginBottom:20 }}>
        {[
          { label:'Available',     value:stats?.units.available    || 0, color:'#10b981', icon:'🩸' },
          { label:'Reserved',      value:stats?.units.reserved     || 0, color:'#f59e0b', icon:'📌' },
          { label:'Issued Today',  value:stats?.units.issued       || 0, color:'#6366f1', icon:'💉' },
          { label:'Expiring (7d)', value:stats?.units.expiringSoon || 0, color:'#ef4444', icon:'⚠️' },
          { label:'Total Donors',  value:stats?.donors.total       || 0, color:'#0ea5e9', icon:'👤' },
          { label:'Critical Groups',value:stats?.criticalAlerts?.length || 0, color:'#dc2626', icon:'🚨' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background:s.color+'20', fontSize:20 }}>{s.icon}</div>
            <div>
              <div className="stat-value" style={{ color:s.color, fontSize:24 }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Critical alerts */}
      {stats?.criticalAlerts?.length > 0 && (
        <div style={{ background:'#fee2e2', border:'1px solid #fca5a5', borderRadius:12, padding:'12px 16px', marginBottom:16, display:'flex', alignItems:'center', gap:12 }}>
          <MdWarning size={24} style={{ color:'#ef4444', flexShrink:0 }} />
          <div>
            <div style={{ fontWeight:700, color:'#dc2626' }}>Critical Stock Alert</div>
            <div style={{ fontSize:13, color:'#991b1b' }}>
              Less than 2 units available for: {stats.criticalAlerts.map(g => (
                <span key={g} style={{ background: BG_COLORS[g], color:'#fff', padding:'1px 8px', borderRadius:99, fontSize:12, fontWeight:800, marginRight:4 }}>{g}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:16, borderBottom:'1px solid var(--border)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding:'10px 16px', background:'none', border:'none', borderBottom: activeTab===t.id?'2px solid var(--accent)':'2px solid transparent', color: activeTab===t.id?'var(--accent)':'var(--text-muted)', fontWeight: activeTab===t.id?700:500, cursor:'pointer', fontSize:14, fontFamily:'var(--font-main)' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── INVENTORY TAB ── */}
      {activeTab === 'inventory' && (
        <div>
          {loading ? (
            <div className="flex-center" style={{ height:200 }}><ShortLoader/></div>
          ) : (
            <>
              {/* Blood group grid */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:24 }}>
                {BLOOD_GROUPS.map(g => {
                  const data    = inventory?.byGroup?.find(b => b.group === g) || { available:0, components:{} };
                  const count   = data.available;
                  const isCrit  = count < 2;
                  return (
                    <div key={g} style={{
                      border:       `2px solid ${isCrit ? '#ef4444' : BG_COLORS[g]+'40'}`,
                      borderRadius: 16,
                      padding:      20,
                      background:   isCrit ? '#fff5f5' : BG_COLORS[g]+'08',
                      textAlign:    'center',
                    }}>
                      <div style={{ fontSize:36, fontWeight:900, color: BG_COLORS[g], letterSpacing:-1 }}>{g}</div>
                      <div style={{ fontSize:28, fontWeight:900, color: isCrit ? '#ef4444' : 'var(--text-primary)', marginTop:4 }}>
                        {count}
                      </div>
                      <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>units available</div>
                      {isCrit && (
                        <div style={{ background:'#ef4444', color:'#fff', fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:99, marginTop:8, display:'inline-block' }}>
                          CRITICAL
                        </div>
                      )}
                      {/* Component breakdown */}
                      {Object.entries(data.components || {}).map(([comp, cnt]) => (
                        <div key={comp} style={{ fontSize:10, color:'var(--text-muted)', marginTop:3 }}>
                          {comp}: {cnt}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>

              {/* Expiring soon */}
              {inventory?.expiringSoon?.length > 0 && (
                <div className="card" style={{ marginBottom:16 }}>
                  <div style={{ fontWeight:700, marginBottom:12, color:'#f59e0b' }}>
                    ⚠️ Expiring Within 7 Days ({inventory.expiringSoon.length} units)
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    {inventory.expiringSoon.map(u => (
                      <div key={u._id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', background:'#fef3c7', borderRadius:10 }}>
                        <span style={{ background: BG_COLORS[u.bloodGroup], color:'#fff', padding:'3px 10px', borderRadius:99, fontSize:13, fontWeight:800, flexShrink:0 }}>{u.bloodGroup}</span>
                        <div style={{ flex:1 }}>
                          <div style={{ fontWeight:600, fontSize:13 }}>{u.bagId} · {u.component}</div>
                          <div className="text-muted" style={{ fontSize:11 }}>{u.location}</div>
                        </div>
                        <div style={{ textAlign:'right', fontSize:12 }}>
                          <div style={{ fontWeight:800, color: daysTo(u.expiryDate)<=3?'#ef4444':'#f59e0b' }}>
                            {daysTo(u.expiryDate)} days left
                          </div>
                          <div className="text-muted">{fmtDate(u.expiryDate)}</div>
                        </div>
                        <button className="btn btn-primary btn-sm" onClick={() => setIssueModal(u)}>Issue</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent activity */}
              {inventory?.recentActivity?.length > 0 && (
                <div className="card">
                  <div style={{ fontWeight:700, marginBottom:12 }}>Recent Activity</div>
                  {inventory.recentActivity.map(u => {
                    const sc = STATUS_CFG[u.status] || STATUS_CFG.Available;
                    return (
                      <div key={u._id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid var(--border-light)', fontSize:13 }}>
                        <span style={{ background: BG_COLORS[u.bloodGroup], color:'#fff', padding:'2px 8px', borderRadius:99, fontSize:12, fontWeight:800, flexShrink:0 }}>{u.bloodGroup}</span>
                        <div style={{ flex:1 }}>
                          <span style={{ fontWeight:600 }}>{u.bagId}</span>
                          <span className="text-muted"> · {u.component}</span>
                        </div>
                        <span style={{ background:sc.bg, color:sc.color, padding:'2px 8px', borderRadius:99, fontSize:11, fontWeight:700 }}>{u.status}</span>
                        {u.issuedToName && <span className="text-muted" style={{ fontSize:11 }}>→ {u.issuedToName}</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── UNITS TAB ── */}
      {activeTab === 'units' && (
        <div>
          {/* Filters */}
          <div className="card" style={{ marginBottom:16 }}>
            <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
              <div className="search-box" style={{ flex:1, minWidth:200 }}>
                <MdSearch className="search-icon" />
                <input placeholder="Search bag ID, location, patient..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <select className="form-control" style={{ width:160 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="">All Status</option>
                {Object.keys(STATUS_CFG).map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ display:'flex', gap:6, marginTop:10, flexWrap:'wrap' }}>
              <button className={`pill${bgFilter===''?' active':''}`} onClick={() => setBGFilter('')}>All Groups</button>
              {BLOOD_GROUPS.map(g => (
                <button key={g} className={`pill${bgFilter===g?' active':''}`}
                  onClick={() => setBGFilter(bgFilter===g?'':g)}
                  style={{ color: bgFilter===g?'#fff':BG_COLORS[g], background: bgFilter===g?BG_COLORS[g]:BG_COLORS[g]+'15', borderColor: BG_COLORS[g] }}>
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Units list */}
          {units.length === 0 ? (
            <div className="empty-state">
              <MdBloodtype size={52} style={{ opacity:0.3, marginBottom:16 }} />
              <h3>No blood units found</h3>
              <button className="btn btn-primary" style={{ marginTop:12 }} onClick={() => setAddUnitModal(true)}>
                <MdAdd /> Add Blood Unit
              </button>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {units.map(u => {
                const sc      = STATUS_CFG[u.status] || STATUS_CFG.Available;
                const days    = daysTo(u.expiryDate);
                const expWarn = u.status === 'Available' && days !== null && days <= 7;

                return (
                  <div key={u._id} style={{
                    border:       `1px solid ${expWarn?'#fca5a5':'var(--border)'}`,
                    borderLeft:   `5px solid ${BG_COLORS[u.bloodGroup] || '#0ea5e9'}`,
                    borderRadius: 12,
                    padding:      '12px 16px',
                    background:   expWarn ? '#fff9f0' : 'var(--card-bg)',
                    display:      'grid',
                    gridTemplateColumns: '80px 1fr 1fr auto',
                    alignItems:   'center',
                    gap:          14,
                  }}>
                    {/* Blood group */}
                    <div style={{ textAlign:'center' }}>
                      <div style={{ fontSize:24, fontWeight:900, color: BG_COLORS[u.bloodGroup] }}>{u.bloodGroup}</div>
                      <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:1 }}>{u.bagId}</div>
                    </div>

                    {/* Info */}
                    <div>
                      <div style={{ fontWeight:700, fontSize:14 }}>{u.component}</div>
                      <div className="text-muted text-sm">{u.volume}ml · {u.source}</div>
                      {u.donor?.name && <div className="text-muted" style={{ fontSize:11 }}>Donor: {u.donor.name}</div>}
                      {u.location && <div className="text-muted" style={{ fontSize:11 }}>📍 {u.location}</div>}
                    </div>

                    {/* Dates */}
                    <div>
                      <div style={{ fontSize:12 }}>
                        <span className="text-muted">Collected: </span>{fmtDate(u.collectionDate)}
                      </div>
                      <div style={{ fontSize:12, color: expWarn ? '#ef4444' : days !== null && days < 14 ? '#f59e0b' : 'var(--text-muted)', fontWeight: expWarn ? 700 : 400 }}>
                        <span>Expires: </span>{fmtDate(u.expiryDate)}
                        {days !== null && days >= 0 && <span> ({days}d)</span>}
                        {days !== null && days < 0 && <span style={{ color:'#ef4444', fontWeight:700 }}> EXPIRED</span>}
                      </div>
                      {u.issuedToName && <div style={{ fontSize:11, color:'#6366f1' }}>→ {u.issuedToName}</div>}
                      {u.reservedFor?.name && <div style={{ fontSize:11, color:'#f59e0b' }}>Reserved: {u.reservedFor.name}</div>}
                      {!u.allTestsClear && u.status === 'Available' && (
                        <div style={{ fontSize:11, color:'#ef4444', fontWeight:600 }}>⚠️ Tests not cleared</div>
                      )}
                    </div>

                    {/* Actions */}
                    <div style={{ display:'flex', flexDirection:'column', gap:5, alignItems:'flex-end' }}>
                      <span style={{ background:sc.bg, color:sc.color, padding:'3px 10px', borderRadius:99, fontSize:11, fontWeight:700 }}>{u.status}</span>
                      {u.status === 'Available' && (
                        <button className="btn btn-danger btn-sm" style={{ fontSize:11 }} onClick={() => setIssueModal(u)}>
                          Issue
                        </button>
                      )}
                      {u.status === 'Reserved' && (
                        <button className="btn btn-secondary btn-sm" style={{ fontSize:11 }} onClick={() => handleRelease(u)}>
                          Release
                        </button>
                      )}
                      {['Available','Reserved'].includes(u.status) && (
                        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => handleDiscard(u)} title="Discard">
                          <MdDelete size={14} style={{ color:'var(--danger)' }} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {totalPages > 1 && (
            <div className="pagination" style={{ marginTop:16 }}>
              <button disabled={page===1} onClick={() => setPage(p=>p-1)}>‹</button>
              {Array.from({ length:totalPages }, (_,i)=>i+1).map(p => (
                <button key={p} className={page===p?'active':''} onClick={() => setPage(p)}>{p}</button>
              ))}
              <button disabled={page===totalPages} onClick={() => setPage(p=>p+1)}>›</button>
            </div>
          )}
        </div>
      )}

      {/* ── DONORS TAB ── */}
      {activeTab === 'donors' && (
        <div>
          <div style={{ display:'flex', gap:10, marginBottom:16 }}>
            <div className="search-box" style={{ flex:1 }}>
              <MdSearch className="search-icon" />
              <input placeholder="Search by name, CNIC, phone, donor ID..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <button className="btn btn-primary" onClick={() => setAddDonorModal(true)}>
              <MdAdd /> Add Donor
            </button>
          </div>

          {donors.length === 0 ? (
            <div className="empty-state">
              <MdPerson size={52} style={{ opacity:0.3, marginBottom:16 }} />
              <h3>No donors registered</h3>
              <button className="btn btn-primary" style={{ marginTop:12 }} onClick={() => setAddDonorModal(true)}>
                <MdAdd /> Register First Donor
              </button>
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px,1fr))', gap:12 }}>
              {donors.map(d => {
                const daysSince    = d.lastDonationDate ? Math.floor((new Date() - new Date(d.lastDonationDate)) / 86400000) : null;
                const canDonate    = d.isEligible && !d.hasDisease && (daysSince === null || daysSince >= 56);
                const daysUntil   = daysSince !== null ? Math.max(0, 56 - daysSince) : 0;

                return (
                  <div key={d._id} style={{ border:'1px solid var(--border)', borderRadius:14, padding:16, background:'var(--card-bg)' }}>
                    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:10 }}>
                      <div>
                        <div style={{ fontWeight:700, fontSize:15 }}>{d.name}</div>
                        <div className="text-muted text-sm">{d.donorId} · {d.age}y · {d.gender}</div>
                        <div className="text-muted text-sm">{d.phone}</div>
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
                        <span style={{ background: BG_COLORS[d.bloodGroup], color:'#fff', padding:'4px 12px', borderRadius:99, fontSize:16, fontWeight:900 }}>{d.bloodGroup}</span>
                        <span style={{
                          background: canDonate ? '#d1fae5' : '#fee2e2',
                          color:      canDonate ? '#10b981' : '#ef4444',
                          fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:99,
                        }}>
                          {canDonate ? '✓ ELIGIBLE' : d.hasDisease ? '✗ DISQUALIFIED' : `${daysUntil}d to eligible`}
                        </span>
                      </div>
                    </div>

                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:10 }}>
                      {[
                        { label:'Total Donations', value: d.totalDonations || 0 },
                        { label:'Last Donation',   value: d.lastDonationDate ? fmtDate(d.lastDonationDate) : 'Never' },
                      ].map(({ label, value }) => (
                        <div key={label} style={{ background:'var(--bg-tertiary)', borderRadius:8, padding:'8px 10px' }}>
                          <div className="text-muted" style={{ fontSize:10 }}>{label}</div>
                          <div style={{ fontWeight:700, fontSize:14, marginTop:2 }}>{value}</div>
                        </div>
                      ))}
                    </div>

                    {d.hasDisease && d.ineligibleReason && (
                      <div style={{ background:'#fee2e2', color:'#dc2626', fontSize:11, padding:'6px 10px', borderRadius:8, marginBottom:8 }}>
                        ✗ {d.ineligibleReason}
                      </div>
                    )}

                    {canDonate && (
                      <button className="btn btn-primary btn-sm" style={{ width:'100%' }}
                        onClick={() => { setAddUnitModal(true); }}>
                        🩸 Record Donation
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {addUnitModal && (
        <AddUnitModal
          onClose={() => setAddUnitModal(false)}
          onAdded={() => { setAddUnitModal(false); fetchInventory(); fetchUnits(); }}
        />
      )}
      {issueModal && (
        <IssueModal
          unit={issueModal}
          onClose={() => setIssueModal(null)}
          onIssued={afterAction}
        />
      )}
      {addDonorModal && (
        <DonorModal
          onClose={() => setAddDonorModal(false)}
          onSaved={() => { setAddDonorModal(false); fetchDonors(); }}
        />
      )}
    </div>
  );
}