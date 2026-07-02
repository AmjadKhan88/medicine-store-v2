import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  MdStore, MdMedicalServices, MdPeople,
  MdCheckCircle, MdArrowForward, MdArrowBack,
} from 'react-icons/md';
import toast from 'react-hot-toast';
import API from '../utils/api';

const STEPS = [
  { id: 0, icon: <MdStore />,           title: 'Set Up Your Store',     desc: 'Add your pharmacy name and contact details. This appears on all invoices.' },
  { id: 1, icon: <MdMedicalServices />, title: 'Add Your First Medicine', desc: 'Add one medicine to get started. You can add more anytime.' },
  { id: 2, icon: <MdPeople />,          title: 'Invite Your First Staff', desc: 'Add a doctor or pharmacist to your team. Optional — skip if you work alone.' },
  { id: 3, icon: <MdCheckCircle />,     title: "You're Ready!",          desc: 'Your pharmacy is set up. Start managing medicines, patients, and billing.' },
];

export default function Onboarding() {
  const { user, setUser } = useAuth();
  const navigate          = useNavigate();
  const [step, setStep]   = useState(0);
  const [saving, setSaving] = useState(false);

  // Step 0 — Store profile
  const [store, setStore] = useState({ name: '', address: '', phone: '', doctor: '', license: '' });

  // Step 1 — First medicine
  const [medicine, setMedicine] = useState({ name: '', category: 'Other', salePrice: '', stock: '', expiryDate: '' });

  // Step 2 — First staff
  const [staff, setStaff]     = useState({ name: '', email: '', password: '', role: 'pharmacist' });
  const [skipStaff, setSkipStaff] = useState(false);

  /* ── Save store profile to localStorage ── */
  const saveStore = () => {
    if (!store.name || !store.phone || !store.address) {
      toast.error('Store name, phone and address are required'); return false;
    }
    localStorage.setItem('medistore_profile', JSON.stringify(store));
    return true;
  };

  /* ── Save first medicine ── */
  const saveMedicine = async () => {
    if (!medicine.name || !medicine.salePrice || !medicine.stock || !medicine.expiryDate) {
      toast.error('Please fill all required medicine fields'); return false;
    }
    try {
      await API.post('/medicines', { ...medicine, purchasePrice: medicine.salePrice, minStock: 10, dosageForm: 'Tablet', unit: 'Strip' });
      return true;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add medicine'); return false;
    }
  };

  /* ── Save first staff ── */
  const saveStaff = async () => {
    if (skipStaff) return true;
    if (!staff.name || !staff.email || !staff.password) {
      toast.error('Fill all staff fields or skip'); return false;
    }
    try {
      await API.post('/staff', staff);
      return true;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add staff'); return false;
    }
  };

  /* ── Next step ── */
  const handleNext = async () => {
    setSaving(true);
    let ok = true;

    if (step === 0) ok = saveStore();
    if (step === 1) ok = await saveMedicine();
    if (step === 2) ok = await saveStaff();

    if (!ok) { setSaving(false); return; }

    if (step === 3) {
      // Mark onboarding complete
      try {
        const { data } = await API.patch('/auth/onboarding', { complete: true });
        setUser(data.user);
        localStorage.setItem('medistore_user', JSON.stringify(data.user));
      } catch {}
      navigate('/app');
      return;
    }

    setStep(s => s + 1);
    setSaving(false);
  };

  const StepIndicator = () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 40 }}>
      {STEPS.map((s, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: i < step ? 'var(--success)' : i === step ? 'var(--accent)' : 'var(--bg-tertiary)',
            color: i <= step ? '#fff' : 'var(--text-muted)',
            fontWeight: 700, fontSize: 14, transition: 'all 0.3s',
            border: i === step ? '3px solid var(--accent-light)' : 'none',
          }}>
            {i < step ? <MdCheckCircle size={18} /> : i + 1}
          </div>
          {i < STEPS.length - 1 && (
            <div style={{ width: 48, height: 2, background: i < step ? 'var(--success)' : 'var(--border)', transition: 'all 0.3s' }} />
          )}
        </div>
      ))}
    </div>
  );

  const fld = (setter) => (k) => (e) => setter(p => ({ ...p, [k]: e.target.value }));

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 560 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>
            Medi<span style={{ color: 'var(--accent)' }}>Store</span>
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            Welcome, {user?.name?.split(' ')[0]}! Let's set up your pharmacy in 3 quick steps.
          </div>
        </div>

        <div className="card" style={{ padding: 36 }}>
          <StepIndicator />

          {/* Step header */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--accent-light)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, margin: '0 auto 14px' }}>
              {STEPS[step].icon}
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>{STEPS[step].title}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>{STEPS[step].desc}</div>
          </div>

          {/* Step 0: Store */}
          {step === 0 && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label required">Pharmacy / Store Name</label>
                  <input className="form-control" value={store.name} onChange={fld(setStore)('name')} placeholder="Al-Shifa Medical Store" />
                </div>
                <div className="form-group">
                  <label className="form-label">Doctor / Owner Name</label>
                  <input className="form-control" value={store.doctor} onChange={fld(setStore)('doctor')} placeholder="Dr. Ahmad Khan" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label required">Address</label>
                <input className="form-control" value={store.address} onChange={fld(setStore)('address')} placeholder="Main Bazar, Peshawar" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label required">Phone Number</label>
                  <input className="form-control" value={store.phone} onChange={fld(setStore)('phone')} placeholder="0300-1234567" />
                </div>
                <div className="form-group">
                  <label className="form-label">Drug License No.</label>
                  <input className="form-control" value={store.license} onChange={fld(setStore)('license')} placeholder="DL-KPK-00000" />
                </div>
              </div>
            </>
          )}

          {/* Step 1: First medicine */}
          {step === 1 && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label required">Medicine Name</label>
                  <input className="form-control" value={medicine.name} onChange={fld(setMedicine)('name')} placeholder="Panadol Extra" />
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="form-control" value={medicine.category} onChange={fld(setMedicine)('category')}>
                    {['Analgesic','Antibiotic','Antiviral','Cardiovascular','Diabetes','Respiratory','Gastrointestinal','Vitamin & Supplement','Other'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label required">Sale Price (₨)</label>
                  <input className="form-control" type="number" min={0} value={medicine.salePrice} onChange={fld(setMedicine)('salePrice')} placeholder="25" />
                </div>
                <div className="form-group">
                  <label className="form-label required">Stock Quantity</label>
                  <input className="form-control" type="number" min={0} value={medicine.stock} onChange={fld(setMedicine)('stock')} placeholder="100" />
                </div>
                <div className="form-group">
                  <label className="form-label required">Expiry Date</label>
                  <input className="form-control" type="date" value={medicine.expiryDate} onChange={fld(setMedicine)('expiryDate')} />
                </div>
              </div>
              <div className="text-muted text-sm" style={{ marginTop: 4 }}>
                💡 You can add more medicines later from the Medicines page.
              </div>
            </>
          )}

          {/* Step 2: Staff */}
          {step === 2 && (
            <>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 20, padding: '10px 14px', background: 'var(--bg-tertiary)', borderRadius: 10 }}>
                <input type="checkbox" checked={skipStaff} onChange={e => setSkipStaff(e.target.checked)} />
                <span style={{ fontSize: 14, fontWeight: 600 }}>Skip — I work alone or will invite staff later</span>
              </label>
              {!skipStaff && (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label required">Full Name</label>
                      <input className="form-control" value={staff.name} onChange={fld(setStaff)('name')} placeholder="Dr. Sarah Ahmed" />
                    </div>
                    <div className="form-group">
                      <label className="form-label required">Role</label>
                      <select className="form-control" value={staff.role} onChange={fld(setStaff)('role')}>
                        <option value="doctor">Doctor</option>
                        <option value="pharmacist">Pharmacist</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label required">Email</label>
                    <input className="form-control" type="email" value={staff.email} onChange={fld(setStaff)('email')} placeholder="staff@pharmacy.com" />
                  </div>
                  <div className="form-group">
                    <label className="form-label required">Temporary Password</label>
                    <input className="form-control" type="password" value={staff.password} onChange={fld(setStaff)('password')} placeholder="Min 6 characters" minLength={6} />
                  </div>
                </>
              )}
            </>
          )}

          {/* Step 3: Done */}
          {step === 3 && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
                {[
                  { icon: '💊', label: 'Medicines', desc: 'Track inventory & expiry' },
                  { icon: '👤', label: 'Patients',  desc: 'Records & balance tracking' },
                  { icon: '🧾', label: 'Billing',   desc: 'Invoices & payments' },
                  { icon: '📊', label: 'Reports',   desc: 'Revenue & analytics' },
                ].map((f, i) => (
                  <div key={i} style={{ background: 'var(--bg-tertiary)', borderRadius: 12, padding: 16, textAlign: 'left' }}>
                    <div style={{ fontSize: 24, marginBottom: 6 }}>{f.icon}</div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{f.label}</div>
                    <div className="text-muted text-sm">{f.desc}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: 'var(--success-bg)', border: '1px solid var(--success)', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: 'var(--success)' }}>
                🎉 Your 14-day free trial is active — all features unlocked!
              </div>
            </div>
          )}

          {/* Navigation */}
          <div style={{ display: 'flex', justifyContent: step > 0 ? 'space-between' : 'flex-end', marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
            {step > 0 && step < 3 && (
              <button className="btn btn-secondary" onClick={() => setStep(s => s - 1)}>
                <MdArrowBack /> Back
              </button>
            )}
            <button className="btn btn-primary btn-lg" onClick={handleNext} disabled={saving}>
              {saving ? 'Saving...' : step === 3 ? 'Go to Dashboard →' : <>Next <MdArrowForward /></>}
            </button>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: 'var(--text-muted)' }}>
          Step {step + 1} of {STEPS.length} · You can change everything later in Settings
        </div>
      </div>
    </div>
  );
}