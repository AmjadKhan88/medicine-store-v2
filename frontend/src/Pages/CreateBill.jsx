import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdAdd, MdDelete, MdSearch, MdArrowBack, MdReceipt, MdSwapHoriz } from 'react-icons/md';
import toast from 'react-hot-toast';
import API from '../utils/api';
import SubstitutesPanel from '../Components/SubstitutesPanel';
import DrugInteractionChecker from '../Components/DrugInteractionChecker';

export default function CreateBill() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [patSearch, setPatSearch] = useState('');
  const [medSearch, setMedSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [items, setItems] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);
  const [amountPaid, setAmountPaid] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPatList, setShowPatList] = useState(false);
  const [showMedList, setShowMedList] = useState(false);
  const [outOfStockMed, setOutOfStockMed] = useState(null); // medicine clicked but qty exceeded

  useEffect(() => {
    if (patSearch.length > 1) {
      API.get('/patients', { params: { search: patSearch, limit: 8 } }).then(({ data }) => { setPatients(data.patients); setShowPatList(true); });
    } else { setShowPatList(false); }
  }, [patSearch]);

  useEffect(() => {
    if (medSearch.length > 1) {
      API.get('/medicines', { params: { search: medSearch, limit: 8 } }).then(({ data }) => { setMedicines(data.medicines); setShowMedList(true); });
    } else { setShowMedList(false); }
  }, [medSearch]);

  const addItem = (med) => {
    setMedSearch(''); setShowMedList(false);

    if (med.stock <= 0) {
      setOutOfStockMed(med);  // trigger substitute panel
      return;
    }

    const exists = items.find(i => i.medicine === med._id);
    if (exists) { setItems(prev => prev.map(i => i.medicine === med._id ? { ...i, quantity: i.quantity + 1 } : i)); return; }
    setItems(prev => [...prev, { medicine: med._id, medicineName: med.name, unitPrice: med.salePrice, quantity: 1, maxQty: med.stock }]);
  };

  const updateQty = (id, qty) => {
    const item = items.find(i => i.medicine === id);
    if (qty > item.maxQty) { toast.error(`Only ${item.maxQty} in stock`); return; }
    if (qty < 1) return;
    setItems(prev => prev.map(i => i.medicine === id ? { ...i, quantity: Number(qty) } : i));
  };

  const removeItem = (id) => setItems(prev => prev.filter(i => i.medicine !== id));

  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const total = subtotal - Number(discount) + Number(tax);

  const handleSubmit = async () => {
    if (!selectedPatient) return toast.error('Please select a patient');
    if (items.length === 0) return toast.error('Add at least one medicine');
    setSaving(true);
    try {
      await API.post('/billing', {
        patient: selectedPatient._id,
        items: items.map(i => ({ medicine: i.medicine, quantity: i.quantity })),
        discount: Number(discount), tax: Number(tax), amountPaid: Number(amountPaid), paymentMethod, notes,
      });
      toast.success('Invoice created successfully!');
      navigate('/app/billing');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to create invoice'); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/billing')} style={{ marginBottom: 6 }}><MdArrowBack /> Back</button>
          <h1>Create Invoice</h1>
          <p>Generate a new patient invoice</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
        {/* Left: Patient + Items */}
        <div>
          {/* Patient Selection */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header"><div className="card-title">Select Patient</div></div>
            {selectedPatient ? (
              <div className="flex-between" style={{ padding: '14px 16px', background: 'var(--bg-tertiary)', borderRadius: 10 }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{selectedPatient.name}</div>
                  <div className="text-muted text-sm">{selectedPatient.patientId} · {selectedPatient.phone}</div>
                  {(selectedPatient.totalBilled - selectedPatient.totalPaid) > 0 && (
                    <div className="text-danger text-sm">Outstanding: ₨ {(selectedPatient.totalBilled - selectedPatient.totalPaid).toLocaleString()}</div>
                  )}
                </div>
                <button className="btn btn-secondary btn-sm" onClick={() => setSelectedPatient(null)}>Change</button>
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <div className="input-group">
                  <MdSearch className="input-icon" />
                  <input className="form-control" placeholder="Search patient by name or ID..." value={patSearch} onChange={e => setPatSearch(e.target.value)} onFocus={() => patSearch.length > 1 && setShowPatList(true)} />
                </div>
                {showPatList && patients.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 10, zIndex: 100, boxShadow: 'var(--shadow-lg)', marginTop: 4 }}>
                    {patients.map(p => (
                      <div key={p._id} style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid var(--border-light)' }}
                        onMouseDown={() => { setSelectedPatient(p); setPatSearch(''); setShowPatList(false); }}>
                        <div style={{ fontWeight: 600 }}>{p.name}</div>
                        <div className="text-muted text-sm">{p.patientId} · {p.phone}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Medicine Items */}
          <div className="card">
            <div className="card-header"><div className="card-title">Add Medicines</div></div>
            <div style={{ position: 'relative', marginBottom: 16 }}>
              <div className="input-group">
                <MdSearch className="input-icon" />
                <input className="form-control" placeholder="Search medicine to add..." value={medSearch} onChange={e => setMedSearch(e.target.value)} onFocus={() => medSearch.length > 1 && setShowMedList(true)} />
              </div>
              {showMedList && medicines.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 10, zIndex: 100, boxShadow: 'var(--shadow-lg)', marginTop: 4 }}>
                  {medicines.map(m => (
                    <div key={m._id} style={{
                      padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid var(--border-light)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      opacity: m.stock <= 0 ? 0.6 : 1,
                    }}
                      onMouseDown={() => addItem(m)}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{m.name}</div>
                        <div className="text-muted text-sm">{m.dosageForm} · Stock: {m.stock}</div>
                      </div>
                      {m.stock <= 0 ? (
                        <span className="badge badge-danger">Out of Stock</span>
                      ) : (
                        <span className="text-accent fw-bold">₨ {m.salePrice?.toLocaleString()}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {items.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px 20px' }}>
                <MdAdd size={36} style={{ opacity: 0.3, marginBottom: 8 }} />
                <h3>No medicines added</h3><p>Search and add medicines above</p>
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead><tr><th>Medicine</th><th style={{ textAlign: 'right' }}>Price</th><th style={{ textAlign: 'center' }}>Qty</th><th style={{ textAlign: 'right' }}>Total</th><th></th></tr></thead>
                  <tbody>
                    {items.map(item => (
                      <tr key={item.medicine}>
                        <td><div style={{ fontWeight: 600 }}>{item.medicineName}</div><div className="text-muted text-sm">Max: {item.maxQty}</div></td>
                        <td style={{ textAlign: 'right' }}>₨ {item.unitPrice?.toLocaleString()}</td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                            <button className="btn btn-secondary btn-icon btn-sm" onClick={() => updateQty(item.medicine, item.quantity - 1)}>−</button>
                            <span style={{ minWidth: 30, textAlign: 'center', fontWeight: 700 }}>{item.quantity}</span>
                            <button className="btn btn-secondary btn-icon btn-sm" onClick={() => updateQty(item.medicine, item.quantity + 1)}>+</button>
                          </div>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>₨ {(item.unitPrice * item.quantity).toLocaleString()}</td>
                        <td><button className="btn btn-danger btn-icon btn-sm" onClick={() => removeItem(item.medicine)}><MdDelete /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <DrugInteractionChecker
          medicineIds={items.map(i => i.medicine)}
          medicineNames={items.map(i => i.medicineName)}
        />

        {/* Right: Summary */}
        <div>
          <div className="card" style={{ position: 'sticky', top: 0 }}>
            <div className="card-header"><div className="card-title"><MdReceipt style={{ marginRight: 8 }} />Invoice Summary</div></div>
            <div style={{ marginBottom: 16 }}>
              <div className="flex-between" style={{ marginBottom: 8, fontSize: 14 }}><span className="text-muted">Subtotal</span><span className="fw-semibold">₨ {subtotal.toLocaleString()}</span></div>
              <div className="form-group">
                <label className="form-label">Discount (₨)</label>
                <input className="form-control" type="number" value={discount} onChange={e => setDiscount(e.target.value)} min={0} max={subtotal} />
              </div>
              <div className="form-group">
                <label className="form-label">Tax / Extra (₨)</label>
                <input className="form-control" type="number" value={tax} onChange={e => setTax(e.target.value)} min={0} />
              </div>
              <div className="divider" />
              <div className="flex-between" style={{ fontWeight: 800, fontSize: 18, marginBottom: 16 }}>
                <span>Total</span><span className="text-accent">₨ {total.toLocaleString()}</span>
              </div>
              <div className="form-group">
                <label className="form-label">Amount Paid (₨)</label>
                <input className="form-control" type="number" value={amountPaid} onChange={e => setAmountPaid(e.target.value)} min={0} max={total} />
              </div>
              {(total - amountPaid) > 0 && (
                <div className="flex-between text-sm" style={{ marginBottom: 12 }}>
                  <span className="text-muted">Remaining Balance</span>
                  <span className="text-danger fw-bold">₨ {(total - Number(amountPaid)).toLocaleString()}</span>
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Payment Method</label>
                <select className="form-control" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                  <option>Cash</option><option>Card</option><option>Online</option><option>Pending</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="form-control" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any additional notes..." />
              </div>
              <button className="btn btn-primary w-full btn-lg" onClick={handleSubmit} disabled={saving || !selectedPatient || items.length === 0}>
                {saving ? 'Creating...' : '🧾 Create Invoice'}
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* Out of Stock — Show Substitutes */}
      {outOfStockMed && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setOutOfStockMed(null)}>
          <div className="modal" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <div>
                <div className="modal-title">{outOfStockMed.name} is Out of Stock</div>
                <div className="text-muted text-sm">Here are some alternatives currently in stock</div>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setOutOfStockMed(null)}>✕</button>
            </div>

            <SubstitutesPanel
              medicineId={outOfStockMed._id}
              onSelectSubstitute={(sub) => {
                const exists = items.find(i => i.medicine === sub._id);
                if (exists) {
                  setItems(prev => prev.map(i => i.medicine === sub._id ? { ...i, quantity: i.quantity + 1 } : i));
                } else {
                  setItems(prev => [...prev, {
                    medicine: sub._id, medicineName: sub.name,
                    unitPrice: sub.salePrice, quantity: 1, maxQty: sub.stock,
                  }]);
                }
                toast.success(`${sub.name} added instead!`);
                setOutOfStockMed(null);
              }}
            />

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setOutOfStockMed(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
