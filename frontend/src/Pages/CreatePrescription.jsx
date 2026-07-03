import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdAdd, MdDelete, MdSearch, MdArrowBack, MdMedicalServices } from 'react-icons/md';
import toast from 'react-hot-toast';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';

const DOSAGE_OPTS    = ['½ tablet', '1 tablet', '2 tablets', '1 capsule', '2 capsules', '1 teaspoon (5ml)', '2 teaspoons (10ml)', '1 injection', '2 drops', 'As directed'];
const FREQUENCY_OPTS = ['once daily', 'twice daily', 'three times daily', 'four times daily', 'every 6 hours', 'every 8 hours', 'every 12 hours', 'at bedtime', 'as needed', 'with meals'];
const DURATION_OPTS  = ['3 days', '5 days', '7 days', '10 days', '14 days', '1 month', '2 months', '3 months', 'ongoing', 'as directed'];
const ROUTE_OPTS     = ['Oral', 'Topical', 'Injection', 'Inhale', 'Eye Drops', 'Ear Drops', 'Other'];

const emptyItem = () => ({
  medicine:     '',
  medicineName: '',
  dosage:       '1 tablet',
  frequency:    'twice daily',
  duration:     '5 days',
  quantity:     10,
  instructions: '',
  route:        'Oral',
  _key:         Math.random().toString(36).slice(2),
});

export default function CreatePrescription() {
  const navigate       = useNavigate();
  const { user }       = useAuth();
  const store          = (() => { try { return JSON.parse(localStorage.getItem('medistore_profile')) || {}; } catch { return {}; } })();

  const [patSearch, setPatSearch]   = useState('');
  const [patients, setPatients]     = useState([]);
  const [showPatDrop, setShowPatDrop] = useState(false);
  const [selectedPat, setSelectedPat] = useState(null);

  const [medSearch, setMedSearch]   = useState('');
  const [medicines, setMedicines]   = useState([]);
  const [showMedDrop, setShowMedDrop] = useState(false);

  const [doctorName, setDoctorName] = useState(store.doctor || user?.name || '');
  const [diagnosis, setDiagnosis]   = useState('');
  const [notes, setNotes]           = useState('');
  const [validDays, setValidDays]   = useState(30);
  const [items, setItems]           = useState([emptyItem()]);
  const [saving, setSaving]         = useState(false);

  /* ── Patient search ── */
  useEffect(() => {
    if (patSearch.length < 2) { setShowPatDrop(false); return; }
    API.get('/patients', { params: { search: patSearch, limit: 6 } })
      .then(({ data }) => { setPatients(data.patients); setShowPatDrop(true); });
  }, [patSearch]);

  /* ── Medicine search ── */
  useEffect(() => {
    if (medSearch.length < 2) { setShowMedDrop(false); return; }
    API.get('/medicines', { params: { search: medSearch, limit: 8 } })
      .then(({ data }) => { setMedicines(data.medicines); setShowMedDrop(true); });
  }, [medSearch]);

  /* ── Add medicine from search ── */
  const addMedicineFromSearch = (med) => {
    setMedSearch(''); setShowMedDrop(false);
    setItems(prev => [...prev, {
      ...emptyItem(),
      medicine:     med._id,
      medicineName: med.name,
    }]);
  };

  /* ── Add blank row ── */
  const addBlankRow = () => setItems(prev => [...prev, emptyItem()]);

  /* ── Update item field ── */
  const updateItem = (key, field, value) =>
    setItems(prev => prev.map(i => i._key === key ? { ...i, [field]: value } : i));

  /* ── Remove item ── */
  const removeItem = (key) => {
    if (items.length === 1) return;
    setItems(prev => prev.filter(i => i._key !== key));
  };

  /* ── Submit ── */
  const handleSubmit = async () => {
    if (!selectedPat)       { toast.error('Select a patient'); return; }
    if (!doctorName.trim()) { toast.error('Doctor name is required'); return; }
    if (items.some(i => !i.medicineName.trim())) {
      toast.error('Fill in medicine names for all rows'); return;
    }
    setSaving(true);
    try {
      const payload = {
        patient:    selectedPat._id,
        doctorName: doctorName.trim(),
        diagnosis:  diagnosis.trim(),
        notes:      notes.trim(),
        validDays,
        items:      items.map(({ _key, ...rest }) => rest),
      };
      const { data } = await API.post('/prescriptions', payload);
      toast.success(`Prescription ${data.prescription.rxNumber} created!`);
      navigate('/prescriptions');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create prescription');
    } finally { setSaving(false); }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <button className="btn btn-ghost btn-sm" style={{ marginBottom: 6 }}
            onClick={() => navigate('/prescriptions')}>
            <MdArrowBack /> Back
          </button>
          <h1>Write Prescription</h1>
          <p>Create a new digital prescription for a patient</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, alignItems: 'start' }}>
        {/* ── Left column ── */}
        <div>
          {/* Patient + Doctor */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header"><div className="card-title">Patient & Doctor</div></div>
            <div className="form-row">
              {/* Patient search */}
              <div className="form-group">
                <label className="form-label required">Patient</label>
                {selectedPat ? (
                  <div className="flex-between" style={{ background: 'var(--bg-tertiary)', borderRadius: 10, padding: '10px 14px' }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{selectedPat.name}</div>
                      <div className="text-muted text-sm">{selectedPat.patientId} · Age {selectedPat.age}</div>
                    </div>
                    <button className="btn btn-secondary btn-sm" onClick={() => { setSelectedPat(null); setPatSearch(''); }}>
                      Change
                    </button>
                  </div>
                ) : (
                  <div style={{ position: 'relative' }}>
                    <div className="input-group">
                      <MdSearch className="input-icon" />
                      <input className="form-control" placeholder="Search patient..."
                        value={patSearch} onChange={e => setPatSearch(e.target.value)}
                        onFocus={() => patSearch.length > 1 && setShowPatDrop(true)} />
                    </div>
                    {showPatDrop && patients.length > 0 && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 10, zIndex: 100, boxShadow: 'var(--shadow-lg)', marginTop: 4 }}>
                        {patients.map(p => (
                          <div key={p._id} style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border-light)' }}
                            onMouseDown={() => { setSelectedPat(p); setPatSearch(''); setShowPatDrop(false); }}>
                            <div style={{ fontWeight: 600 }}>{p.name}</div>
                            <div className="text-muted text-sm">{p.patientId} · Age {p.age}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Doctor */}
              <div className="form-group">
                <label className="form-label required">Doctor Name</label>
                <input className="form-control" value={doctorName}
                  onChange={e => setDoctorName(e.target.value)} placeholder="Dr. Ahmad Khan" />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Diagnosis / Complaint</label>
                <input className="form-control" value={diagnosis}
                  onChange={e => setDiagnosis(e.target.value)}
                  placeholder="e.g. Upper respiratory tract infection" />
              </div>
              <div className="form-group">
                <label className="form-label">Valid For (days)</label>
                <select className="form-control" value={validDays} onChange={e => setValidDays(e.target.value)}>
                  {[7, 14, 30, 60, 90].map(d => <option key={d} value={d}>{d} days</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Medicines */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header">
              <div className="card-title">Prescribed Medicines</div>
              <button className="btn btn-secondary btn-sm" onClick={addBlankRow}>
                <MdAdd /> Add Row
              </button>
            </div>

            {/* Quick-add from inventory */}
            <div style={{ position: 'relative', marginBottom: 16 }}>
              <div className="input-group">
                <MdSearch className="input-icon" />
                <input className="form-control" placeholder="Quick-add from inventory..."
                  value={medSearch} onChange={e => setMedSearch(e.target.value)} />
              </div>
              {showMedDrop && medicines.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 10, zIndex: 100, boxShadow: 'var(--shadow-lg)', marginTop: 4 }}>
                  {medicines.map(m => (
                    <div key={m._id} style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between' }}
                      onMouseDown={() => addMedicineFromSearch(m)}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{m.name}</div>
                        <div className="text-muted text-sm">{m.dosageForm} {m.strength} · Stock: {m.stock}</div>
                      </div>
                      <span className="badge badge-success">In Stock</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Items table */}
            {items.map((item, idx) => (
              <div key={item._key} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 12 }}>
                <div className="flex-between" style={{ marginBottom: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-secondary)' }}>
                    Medicine #{idx + 1}
                  </div>
                  {items.length > 1 && (
                    <button className="btn btn-danger btn-sm btn-icon" onClick={() => removeItem(item._key)}>
                      <MdDelete />
                    </button>
                  )}
                </div>

                {/* Medicine name */}
                <div className="form-group">
                  <label className="form-label required">Medicine Name</label>
                  <input className="form-control"
                    value={item.medicineName}
                    onChange={e => updateItem(item._key, 'medicineName', e.target.value)}
                    placeholder="Type medicine name or use quick-add above" />
                </div>

                <div className="form-row">
                  {/* Dosage */}
                  <div className="form-group">
                    <label className="form-label required">Dosage</label>
                    <select className="form-control" value={item.dosage}
                      onChange={e => updateItem(item._key, 'dosage', e.target.value)}>
                      {DOSAGE_OPTS.map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>

                  {/* Frequency */}
                  <div className="form-group">
                    <label className="form-label required">Frequency</label>
                    <select className="form-control" value={item.frequency}
                      onChange={e => updateItem(item._key, 'frequency', e.target.value)}>
                      {FREQUENCY_OPTS.map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>

                  {/* Duration */}
                  <div className="form-group">
                    <label className="form-label required">Duration</label>
                    <select className="form-control" value={item.duration}
                      onChange={e => updateItem(item._key, 'duration', e.target.value)}>
                      {DURATION_OPTS.map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  {/* Quantity */}
                  <div className="form-group">
                    <label className="form-label required">Total Qty to Dispense</label>
                    <input className="form-control" type="number" min={1}
                      value={item.quantity}
                      onChange={e => updateItem(item._key, 'quantity', Number(e.target.value))} />
                  </div>

                  {/* Route */}
                  <div className="form-group">
                    <label className="form-label">Route</label>
                    <select className="form-control" value={item.route}
                      onChange={e => updateItem(item._key, 'route', e.target.value)}>
                      {ROUTE_OPTS.map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>

                  {/* Instructions */}
                  <div className="form-group">
                    <label className="form-label">Instructions</label>
                    <input className="form-control" value={item.instructions}
                      onChange={e => updateItem(item._key, 'instructions', e.target.value)}
                      placeholder="e.g. Take after meals" />
                  </div>
                </div>

                {/* Preview line */}
                <div style={{ marginTop: 8, padding: '8px 12px', background: 'var(--accent-light)', borderRadius: 8, fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>
                  📋 {item.medicineName || 'Medicine'} — {item.dosage} {item.frequency} for {item.duration} ({item.quantity} units)
                  {item.instructions ? ` · ${item.instructions}` : ''}
                </div>
              </div>
            ))}

            <button className="btn btn-secondary w-full" onClick={addBlankRow}>
              <MdAdd /> Add Another Medicine
            </button>
          </div>

          {/* Notes */}
          <div className="card">
            <div className="card-header"><div className="card-title">Doctor's Notes</div></div>
            <textarea className="form-control" rows={3} value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Special instructions, dietary advice, follow-up date..." />
          </div>
        </div>

        {/* ── Right column: Summary ── */}
        <div style={{ position: 'sticky', top: 0 }}>
          <div className="card">
            <div className="card-header"><div className="card-title">Prescription Summary</div></div>

            <div style={{ marginBottom: 16 }}>
              <div className="text-muted text-sm" style={{ marginBottom: 4 }}>Patient</div>
              <div style={{ fontWeight: 700 }}>{selectedPat?.name || '—'}</div>

              <div className="divider" />

              <div className="text-muted text-sm" style={{ marginBottom: 4 }}>Doctor</div>
              <div style={{ fontWeight: 700 }}>Dr. {doctorName || '—'}</div>

              {diagnosis && (
                <>
                  <div className="divider" />
                  <div className="text-muted text-sm" style={{ marginBottom: 4 }}>Diagnosis</div>
                  <div style={{ fontWeight: 600 }}>{diagnosis}</div>
                </>
              )}

              <div className="divider" />

              <div className="text-muted text-sm" style={{ marginBottom: 8 }}>Medicines ({items.length})</div>
              {items.map((item, i) => (
                <div key={item._key} style={{ fontSize: 13, marginBottom: 6, paddingLeft: 8, borderLeft: '2px solid var(--accent)' }}>
                  <div style={{ fontWeight: 600 }}>{item.medicineName || `Medicine #${i+1}`}</div>
                  <div className="text-muted" style={{ fontSize: 11 }}>
                    {item.dosage} · {item.frequency} · {item.duration}
                  </div>
                </div>
              ))}

              <div className="divider" />

              <div className="text-muted text-sm">Valid for <strong>{validDays} days</strong></div>
            </div>

            <button className="btn btn-primary w-full btn-lg" onClick={handleSubmit} disabled={saving}>
              <MdMedicalServices />
              {saving ? 'Saving...' : 'Create Prescription'}
            </button>

            <div className="text-muted text-sm" style={{ textAlign: 'center', marginTop: 10 }}>
              You can print the PDF after saving
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}