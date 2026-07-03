import { useState, useEffect, useCallback } from 'react';
import {
  MdAdd, MdSearch, MdEdit, MdDelete, MdVisibility,
  MdLocalShipping, MdPayment, MdStar, MdStarBorder,
  MdMedicalServices, MdHistory, MdWarning,
  MdCheckCircle, MdClose, MdTrendingDown,
} from 'react-icons/md';
import toast from 'react-hot-toast';
import API from '../utils/api';
import { usePermissions } from '../hooks/usePermissions';

/* ── helpers ── */
const PKR     = (n) => `₨ ${Number(n || 0).toLocaleString('en-PK')}`;
const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—';

/* ── Star rating display ── */
function StarRating({ value = 0, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(star => (
        <span
          key={star}
          onClick={() => onChange?.(star)}
          style={{ cursor: onChange ? 'pointer' : 'default', color: star <= value ? '#f59e0b' : 'var(--border)', fontSize: 20 }}
        >
          {star <= value ? <MdStar /> : <MdStarBorder />}
        </span>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════
   ADD / EDIT SUPPLIER MODAL
═══════════════════════════════════════════ */
function SupplierFormModal({ supplier, onClose, onSaved }) {
  const empty = {
    name: '', company: '', phone: '', phone2: '', email: '',
    address: '', city: '', ntn: '', bankName: '', bankAccount: '',
    bankIBAN: '', paymentTerms: '', creditLimit: 0, notes: '',
  };
  const [form, setForm]   = useState(supplier ? { ...supplier } : empty);
  const [saving, setSaving] = useState(false);
  const [tab, setTab]     = useState('basic'); // basic | bank | notes

  const fld = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Supplier name is required'); return; }
    if (!form.phone.trim()){ toast.error('Phone number is required'); return; }
    setSaving(true);
    try {
      if (supplier) {
        await API.put(`/suppliers/${supplier._id}`, form);
        toast.success('Supplier updated!');
      } else {
        await API.post('/suppliers', form);
        toast.success('Supplier added!');
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  const tabs = [
    { id: 'basic', label: 'Basic Info'    },
    { id: 'bank',  label: 'Bank Details'  },
    { id: 'notes', label: 'Terms & Notes' },
  ];

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <div className="modal-title">{supplier ? 'Edit Supplier' : 'Add New Supplier'}</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2" style={{ marginBottom: 20 }}>
          {tabs.map(t => (
            <button key={t.id} className={`pill${tab === t.id ? ' active' : ''}`}
              onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </div>

        {/* Basic */}
        {tab === 'basic' && (
          <>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label required">Contact Name</label>
                <input className="form-control" value={form.name} onChange={fld('name')} placeholder="Muhammad Bilal" />
              </div>
              <div className="form-group">
                <label className="form-label">Company / Distributor</label>
                <input className="form-control" value={form.company} onChange={fld('company')} placeholder="Al-Habib Pharmaceuticals" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label required">Phone</label>
                <input className="form-control" value={form.phone} onChange={fld('phone')} placeholder="0300-1234567" />
              </div>
              <div className="form-group">
                <label className="form-label">Alternate Phone</label>
                <input className="form-control" value={form.phone2} onChange={fld('phone2')} placeholder="0321-7654321" />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-control" type="email" value={form.email} onChange={fld('email')} placeholder="supplier@company.com" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">City</label>
                <input className="form-control" value={form.city} onChange={fld('city')} placeholder="Lahore" />
              </div>
              <div className="form-group">
                <label className="form-label">NTN Number</label>
                <input className="form-control" value={form.ntn} onChange={fld('ntn')} placeholder="1234567-8" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Address</label>
              <textarea className="form-control" rows={2} value={form.address} onChange={fld('address')} placeholder="Full address..." />
            </div>
          </>
        )}

        {/* Bank */}
        {tab === 'bank' && (
          <>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Bank Name</label>
                <input className="form-control" value={form.bankName} onChange={fld('bankName')} placeholder="HBL, UBL, Meezan..." />
              </div>
              <div className="form-group">
                <label className="form-label">Account Number</label>
                <input className="form-control" value={form.bankAccount} onChange={fld('bankAccount')} placeholder="0123-456789012" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">IBAN</label>
              <input className="form-control" value={form.bankIBAN} onChange={fld('bankIBAN')} placeholder="PK00XXXX0000000000000000" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Payment Terms</label>
                <input className="form-control" value={form.paymentTerms} onChange={fld('paymentTerms')} placeholder="e.g. Net 30, Advance, On Delivery" />
              </div>
              <div className="form-group">
                <label className="form-label">Credit Limit (₨)</label>
                <input className="form-control" type="number" min={0} value={form.creditLimit} onChange={fld('creditLimit')} />
              </div>
            </div>
          </>
        )}

        {/* Notes */}
        {tab === 'notes' && (
          <div className="form-group">
            <label className="form-label">Internal Notes</label>
            <textarea className="form-control" rows={6} value={form.notes} onChange={fld('notes')}
              placeholder="Special terms, contact preferences, product specialties, important notes about this supplier..." />
          </div>
        )}

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : supplier ? 'Update Supplier' : 'Add Supplier'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   SUPPLIER DETAIL MODAL
═══════════════════════════════════════════ */
function SupplierDetailModal({ id, onClose, onEdit, onSaved }) {
  const [supplier, setSupplier] = useState(null);
  const [orders, setOrders]     = useState([]);
  const [history, setHistory]   = useState(null);
  const [tab, setTab]           = useState('overview');
  const [payModal, setPayModal] = useState(false);
  const [payAmt, setPayAmt]     = useState('');
  const [perfModal, setPerfModal] = useState(false);
  const [linkModal, setLinkModal] = useState(false);

  const fetchDetail = async () => {
    try {
      const { data } = await API.get(`/suppliers/${id}`);
      setSupplier(data.supplier);
      setOrders(data.recentOrders || []);
    } catch { toast.error('Failed to load supplier'); }
  };

  const fetchHistory = async () => {
    try {
      const { data } = await API.get(`/suppliers/${id}/purchase-history`);
      setHistory(data);
    } catch {}
  };

  useEffect(() => { fetchDetail(); }, [id]);
  useEffect(() => { if (tab === 'history') fetchHistory(); }, [tab]);

  const handlePay = async () => {
    if (!payAmt || Number(payAmt) <= 0) { toast.error('Enter valid amount'); return; }
    try {
      await API.post(`/suppliers/${id}/payment`, { amount: payAmt });
      toast.success('Payment recorded!');
      setPayModal(false); setPayAmt('');
      fetchDetail(); onSaved();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handlePerf = async (event, rating) => {
    try {
      await API.post(`/suppliers/${id}/performance`, { event, rating });
      toast.success('Performance updated!');
      setPerfModal(false); fetchDetail(); onSaved();
    } catch { toast.error('Failed'); }
  };

  const handleRating = async (rating) => {
    try {
      await API.post(`/suppliers/${id}/performance`, { event: null, rating });
      fetchDetail(); onSaved();
    } catch {}
  };

  if (!supplier) return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="flex-center" style={{ height: 120 }}><div className="text-muted">Loading...</div></div>
      </div>
    </div>
  );

  const outstanding = Math.max(0, supplier.totalOrdered - supplier.totalPaid);
  const score = supplier.deliveryScore;

  const tabs = [
    { id: 'overview',   label: 'Overview'        },
    { id: 'medicines',  label: 'Medicines'        },
    { id: 'history',    label: 'Purchase History' },
    { id: 'performance',label: 'Performance'      },
  ];

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-xl" style={{ maxHeight: '92vh', overflowY: 'auto' }}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <div className="modal-title">{supplier.name}</div>
            {supplier.company && <div className="text-muted text-sm">{supplier.company}</div>}
          </div>
          <div className="flex gap-2">
            <button className="btn btn-secondary btn-sm" onClick={() => onEdit(supplier)}>
              <MdEdit /> Edit
            </button>
            <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Quick stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Total Ordered', value: PKR(supplier.totalOrdered),  color: 'var(--text-primary)' },
            { label: 'Total Paid',    value: PKR(supplier.totalPaid),     color: 'var(--success)'      },
            { label: 'Outstanding',   value: PKR(outstanding),            color: outstanding > 0 ? 'var(--danger)' : 'var(--success)' },
            { label: 'Rating',        value: `${supplier.performance?.rating || 0}/5`, color: '#f59e0b' },
          ].map((s, i) => (
            <div key={i} style={{ background: 'var(--bg-tertiary)', borderRadius: 10, padding: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div className="text-muted text-sm">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
          {outstanding > 0 && (
            <button className="btn btn-success btn-sm" onClick={() => setPayModal(true)}>
              <MdPayment /> Record Payment
            </button>
          )}
          <button className="btn btn-secondary btn-sm" onClick={() => setPerfModal(true)}>
            <MdLocalShipping /> Log Delivery Event
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => setLinkModal(true)}>
            <MdMedicalServices /> Link Medicines
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2" style={{ marginBottom: 16 }}>
          {tabs.map(t => (
            <button key={t.id} className={`pill${tab === t.id ? ' active' : ''}`}
              onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </div>

        {/* Overview */}
        {tab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10 }}>CONTACT</div>
              {[
                { label: 'Phone',    value: supplier.phone    },
                { label: 'Phone 2',  value: supplier.phone2   },
                { label: 'Email',    value: supplier.email    },
                { label: 'City',     value: supplier.city     },
                { label: 'Address',  value: supplier.address  },
                { label: 'NTN',      value: supplier.ntn      },
              ].filter(r => r.value).map((r, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 8, fontSize: 14 }}>
                  <span className="text-muted" style={{ minWidth: 70 }}>{r.label}</span>
                  <span style={{ fontWeight: 500 }}>{r.value}</span>
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10 }}>BANK & TERMS</div>
              {[
                { label: 'Bank',     value: supplier.bankName     },
                { label: 'Account',  value: supplier.bankAccount  },
                { label: 'IBAN',     value: supplier.bankIBAN     },
                { label: 'Terms',    value: supplier.paymentTerms },
                { label: 'Limit',    value: supplier.creditLimit ? PKR(supplier.creditLimit) : null },
              ].filter(r => r.value).map((r, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 8, fontSize: 14 }}>
                  <span className="text-muted" style={{ minWidth: 70 }}>{r.label}</span>
                  <span style={{ fontWeight: 500 }}>{r.value}</span>
                </div>
              ))}
              {supplier.notes && (
                <div style={{ marginTop: 12, background: 'var(--warning-bg)', borderRadius: 8, padding: 12, fontSize: 13 }}>
                  <strong>Notes:</strong> {supplier.notes}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Medicines linked */}
        {tab === 'medicines' && (
          <div>
            {supplier.medicines?.length === 0 ? (
              <div className="empty-state"><MdMedicalServices size={48} style={{ opacity: 0.3 }} /><h3>No medicines linked</h3><p>Click "Link Medicines" to associate medicines with this supplier</p></div>
            ) : (
              <div className="table-container">
                <table>
                  <thead><tr><th>Medicine</th><th>Category</th><th>Our Price</th><th>Preferred</th></tr></thead>
                  <tbody>
                    {supplier.medicines.map((m, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{m.medicineName || m.medicine?.name}</td>
                        <td><span className="badge badge-default">{m.medicine?.category || '—'}</span></td>
                        <td>{m.ourPrice ? PKR(m.ourPrice) : '—'}</td>
                        <td>{m.isPreferred ? <MdCheckCircle style={{ color: 'var(--success)' }} /> : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Purchase history */}
        {tab === 'history' && (
          <div>
            {history && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
                {[
                  { label: 'Total Orders', value: history.stats.totalOrders              },
                  { label: 'Total Value',  value: PKR(history.stats.totalValue)           },
                  { label: 'Total Paid',   value: PKR(history.stats.totalPaid)            },
                  { label: 'Outstanding',  value: PKR(history.stats.outstanding)          },
                ].map((s, i) => (
                  <div key={i} style={{ background: 'var(--bg-tertiary)', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                    <div style={{ fontWeight: 800, fontSize: 16 }}>{s.value}</div>
                    <div className="text-muted text-sm">{s.label}</div>
                  </div>
                ))}
              </div>
            )}
            {!history ? (
              <div className="flex-center" style={{ height: 100 }}><div className="text-muted">Loading...</div></div>
            ) : history.orders.length === 0 ? (
              <div className="empty-state"><MdHistory size={48} style={{ opacity: 0.3 }} /><h3>No purchase history</h3></div>
            ) : (
              <div className="table-container">
                <table>
                  <thead><tr><th>PO #</th><th>Date</th><th>Items</th><th>Total</th><th>Paid</th><th>Status</th></tr></thead>
                  <tbody>
                    {history.orders.map(o => (
                      <tr key={o._id}>
                        <td style={{ color: 'var(--accent)', fontWeight: 700 }}>{o.poNumber}</td>
                        <td className="text-sm">{fmtDate(o.createdAt)}</td>
                        <td><span className="badge badge-default">{o.items?.length || 0}</span></td>
                        <td className="fw-bold">{PKR(o.totalAmount)}</td>
                        <td className="text-success">{PKR(o.amountPaid)}</td>
                        <td><span className={`badge ${o.status === 'Received' ? 'badge-success' : o.status === 'Cancelled' ? 'badge-danger' : 'badge-warning'}`}>{o.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Performance */}
        {tab === 'performance' && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10 }}>OVERALL RATING</div>
              <StarRating value={supplier.performance?.rating || 0} onChange={handleRating} />
              <div className="text-muted text-sm" style={{ marginTop: 4 }}>Click to update rating</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12, marginBottom: 16 }}>
              {[
                { label: 'Total Orders',     value: supplier.performance?.totalOrders || 0,      color: 'var(--accent)' },
                { label: 'On-Time Delivery', value: supplier.performance?.onTimeDeliveries || 0,  color: 'var(--success)' },
                { label: 'Late Deliveries',  value: supplier.performance?.lateDeliveries || 0,   color: 'var(--warning)' },
                { label: 'Quality Issues',   value: supplier.performance?.qualityIssues || 0,    color: 'var(--danger)'  },
                { label: 'Returned Orders',  value: supplier.performance?.returnedOrders || 0,   color: 'var(--danger)'  },
                { label: 'Delivery Score',   value: score != null ? `${score}%` : 'N/A',         color: score >= 80 ? 'var(--success)' : score >= 60 ? 'var(--warning)' : 'var(--danger)' },
              ].map((s, i) => (
                <div key={i} style={{ background: 'var(--bg-tertiary)', borderRadius: 10, padding: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="text-muted text-sm">{s.label}</span>
                  <span style={{ fontWeight: 800, fontSize: 18, color: s.color }}>{s.value}</span>
                </div>
              ))}
            </div>

            {/* Delivery score bar */}
            {score != null && (
              <div style={{ marginBottom: 16 }}>
                <div className="flex-between text-sm" style={{ marginBottom: 6 }}>
                  <span className="text-muted">Delivery Score</span>
                  <span style={{ fontWeight: 700, color: score >= 80 ? 'var(--success)' : score >= 60 ? 'var(--warning)' : 'var(--danger)' }}>{score}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{
                    width: `${score}%`,
                    background: score >= 80 ? 'var(--success)' : score >= 60 ? 'var(--warning)' : 'var(--danger)',
                  }} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Payment modal */}
        {payModal && (
          <div className="modal-overlay" style={{ zIndex: 1100 }}>
            <div className="modal" style={{ maxWidth: 380 }}>
              <div className="modal-header">
                <div className="modal-title">Record Payment to {supplier.name}</div>
                <button className="btn btn-ghost btn-icon" onClick={() => setPayModal(false)}>✕</button>
              </div>
              <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger)', borderRadius: 10, padding: 14, marginBottom: 16 }}>
                <div style={{ color: 'var(--danger)', fontWeight: 700, fontSize: 18 }}>Outstanding: {PKR(outstanding)}</div>
              </div>
              <div className="form-group">
                <label className="form-label required">Amount to Pay (₨)</label>
                <input className="form-control" type="number" value={payAmt} onChange={e => setPayAmt(e.target.value)} min={1} max={outstanding} placeholder="Enter amount..." />
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setPayModal(false)}>Cancel</button>
                <button className="btn btn-success" onClick={handlePay}><MdPayment /> Record Payment</button>
              </div>
            </div>
          </div>
        )}

        {/* Performance event modal */}
        {perfModal && (
          <div className="modal-overlay" style={{ zIndex: 1100 }}>
            <div className="modal" style={{ maxWidth: 400 }}>
              <div className="modal-header">
                <div className="modal-title">Log Delivery Event</div>
                <button className="btn btn-ghost btn-icon" onClick={() => setPerfModal(false)}>✕</button>
              </div>
              <div style={{ display: 'grid', gap: 10 }}>
                {[
                  { event: 'onTime',       label: 'Delivered On Time', icon: <MdCheckCircle />, cls: 'btn-success' },
                  { event: 'late',         label: 'Late Delivery',     icon: <MdWarning />,     cls: 'btn-danger'  },
                  { event: 'qualityIssue', label: 'Quality Issue',     icon: <MdTrendingDown />,cls: 'btn-danger'  },
                  { event: 'returned',     label: 'Order Returned',    icon: <MdClose />,       cls: 'btn-danger'  },
                ].map(e => (
                  <button key={e.event} className={`btn ${e.cls}`} onClick={() => handlePerf(e.event)}>
                    {e.icon} {e.label}
                  </button>
                ))}
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setPerfModal(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Link medicines modal */}
        {linkModal && (
          <LinkMedicinesModal
            supplier={supplier}
            onClose={() => setLinkModal(false)}
            onSaved={() => { setLinkModal(false); fetchDetail(); onSaved(); }}
          />
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   LINK MEDICINES MODAL
═══════════════════════════════════════════ */
function LinkMedicinesModal({ supplier, onClose, onSaved }) {
  const [medSearch, setMedSearch] = useState('');
  const [medicines, setMedicines] = useState([]);
  const [showDrop, setShowDrop]   = useState(false);
  const [linked, setLinked]       = useState(
    (supplier.medicines || []).map(m => ({
      medicine:     m.medicine?._id || m.medicine,
      medicineName: m.medicineName || m.medicine?.name || '',
      ourPrice:     m.ourPrice || '',
      isPreferred:  m.isPreferred || false,
    }))
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (medSearch.length < 2) { setShowDrop(false); return; }
    API.get('/medicines', { params: { search: medSearch, limit: 8 } })
      .then(({ data }) => { setMedicines(data.medicines); setShowDrop(true); });
  }, [medSearch]);

  const addMed = (med) => {
    setMedSearch(''); setShowDrop(false);
    if (linked.find(l => l.medicine === med._id)) return;
    setLinked(prev => [...prev, { medicine: med._id, medicineName: med.name, ourPrice: med.purchasePrice || '', isPreferred: false }]);
  };

  const updateLinked = (id, field, val) =>
    setLinked(prev => prev.map(l => l.medicine === id ? { ...l, [field]: val } : l));

  const removeLinked = (id) => setLinked(prev => prev.filter(l => l.medicine !== id));

  const handleSave = async () => {
    setSaving(true);
    try {
      await API.put(`/suppliers/${supplier._id}/medicines`, { medicines: linked });
      toast.success('Medicines linked!');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div className="modal modal-lg" style={{ maxHeight: '88vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <div className="modal-title">Link Medicines — {supplier.name}</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <div className="input-group">
            <MdSearch className="input-icon" />
            <input className="form-control" placeholder="Search medicine to add..."
              value={medSearch} onChange={e => setMedSearch(e.target.value)} />
          </div>
          {showDrop && medicines.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 10, zIndex: 200, boxShadow: 'var(--shadow-lg)', marginTop: 4 }}>
              {medicines.map(m => (
                <div key={m._id} style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between' }}
                  onMouseDown={() => addMed(m)}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{m.name}</div>
                    <div className="text-muted text-sm">{m.category} · Buy: {PKR(m.purchasePrice)}</div>
                  </div>
                  <MdAdd size={20} style={{ color: 'var(--accent)' }} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Linked medicines */}
        {linked.length === 0 ? (
          <div className="empty-state" style={{ padding: 32 }}><p>Search and add medicines above</p></div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr><th>Medicine</th><th>Our Price (₨)</th><th>Preferred</th><th></th></tr>
              </thead>
              <tbody>
                {linked.map(m => (
                  <tr key={m.medicine}>
                    <td style={{ fontWeight: 600 }}>{m.medicineName}</td>
                    <td>
                      <input className="form-control" type="number" min={0} value={m.ourPrice}
                        onChange={e => updateLinked(m.medicine, 'ourPrice', e.target.value)}
                        style={{ width: 120 }} placeholder="0" />
                    </td>
                    <td>
                      <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input type="checkbox" checked={m.isPreferred}
                          onChange={e => updateLinked(m.medicine, 'isPreferred', e.target.checked)} />
                        <span style={{ fontSize: 13 }}>Preferred</span>
                      </label>
                    </td>
                    <td>
                      <button className="btn btn-danger btn-sm btn-icon" onClick={() => removeLinked(m.medicine)}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : `Link ${linked.length} Medicine${linked.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   OUTSTANDING DASHBOARD TAB
═══════════════════════════════════════════ */
function OutstandingTab({ onPaySaved }) {
  const [data, setData]       = useState({ suppliers: [], totalOutstanding: 0 });
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/suppliers/outstanding');
      setData(data);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'Suppliers with Balance', value: data.suppliers.length,           cls: 'yellow' },
          { label: 'Total Outstanding',       value: PKR(data.totalOutstanding),      cls: 'red'    },
          { label: 'Avg per Supplier',        value: data.suppliers.length > 0 ? PKR(data.totalOutstanding / data.suppliers.length) : '₨ 0', cls: 'blue' },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <div className={`stat-icon ${s.cls}`}><MdPayment /></div>
            <div><div className="stat-value" style={{ fontSize: 18 }}>{s.value}</div><div className="stat-label">{s.label}</div></div>
          </div>
        ))}
      </div>

      <div className="card">
        {loading ? (
          <div className="flex-center" style={{ height: 200 }}><div className="text-muted">Loading...</div></div>
        ) : data.suppliers.length === 0 ? (
          <div className="empty-state"><MdCheckCircle size={52} style={{ opacity: 0.3 }} /><h3>No outstanding balances!</h3><p>All supplier payments are cleared.</p></div>
        ) : (
          <div className="table-container">
            <table>
              <thead><tr><th>#</th><th>Supplier</th><th>Phone</th><th>Total Ordered</th><th>Paid</th><th>Outstanding</th><th>Rating</th></tr></thead>
              <tbody>
                {data.suppliers.map((s, i) => (
                  <tr key={s._id}>
                    <td style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{i + 1}</td>
                    <td>
                      <div style={{ fontWeight: 700 }}>{s.name}</div>
                      {s.company && <div className="text-muted text-sm">{s.company}</div>}
                      {s.city && <div className="text-muted text-sm">{s.city}</div>}
                    </td>
                    <td className="text-sm">{s.phone || '—'}</td>
                    <td className="fw-semibold">{PKR(s.totalOrdered)}</td>
                    <td className="text-success fw-semibold">{PKR(s.totalPaid)}</td>
                    <td><span className="badge badge-danger" style={{ fontSize: 13 }}>{PKR(s.outstanding)}</span></td>
                    <td><StarRating value={s.rating} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════ */
export default function Suppliers() {
  const { isAdmin }               = usePermissions();
  const [suppliers, setSuppliers] = useState([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch]       = useState('');
  const [loading, setLoading]     = useState(true);
  const [stats, setStats]         = useState({});
  const [mainTab, setMainTab]     = useState('list');

  const [formModal, setFormModal]     = useState(false);
  const [editSupplier, setEditSupplier] = useState(null);
  const [viewId, setViewId]           = useState(null);

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/suppliers', { params: { page, limit: 15, search } });
      setSuppliers(data.suppliers);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch { toast.error('Failed to load suppliers'); }
    finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);
  useEffect(() => {
    API.get('/suppliers/stats').then(({ data }) => setStats(data.stats)).catch(() => {});
  }, []);
  useEffect(() => { setPage(1); }, [search]);

  const handleDelete = async (id) => {
    if (!confirm('Remove this supplier?')) return;
    try {
      await API.delete(`/suppliers/${id}`);
      toast.success('Supplier removed');
      fetchSuppliers();
    } catch { toast.error('Failed'); }
  };

  const afterSave = () => {
    setFormModal(false); setEditSupplier(null);
    fetchSuppliers();
    API.get('/suppliers/stats').then(({ data }) => setStats(data.stats)).catch(() => {});
  };

  const mainTabs = [
    { id: 'list',        label: 'All Suppliers'     },
    { id: 'outstanding', label: `Outstanding Payments ${stats.withBalance ? `(${stats.withBalance})` : ''}` },
  ];

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Supplier Management</h1>
          <p>Manage suppliers, track payments and performance</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => { setEditSupplier(null); setFormModal(true); }}>
            <MdAdd /> Add Supplier
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom: 20 }}>
        {[
          { label: 'Total Suppliers',    value: stats.total            || 0,   cls: 'blue'   },
          { label: 'Total Outstanding',  value: PKR(stats.totalOutstanding || 0), cls: 'red' },
          { label: 'With Balance',       value: stats.withBalance      || 0,   cls: 'yellow' },
          { label: 'Avg Rating',         value: `${stats.avgRating || 0}/5`,   cls: 'green'  },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <div className={`stat-icon ${s.cls}`}><MdLocalShipping /></div>
            <div>
              <div className="stat-value" style={{ fontSize: typeof s.value === 'string' && s.value.includes('₨') ? 16 : 24 }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main tabs */}
      <div className="flex gap-3" style={{ marginBottom: 16 }}>
        {mainTabs.map(t => (
          <button key={t.id} className={`pill${mainTab === t.id ? ' active' : ''}`}
            onClick={() => setMainTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {/* Outstanding tab */}
      {mainTab === 'outstanding' && <OutstandingTab onPaySaved={afterSave} />}

      {/* Supplier list */}
      {mainTab === 'list' && (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="search-box">
              <MdSearch className="search-icon" />
              <input placeholder="Search by name, company, phone, email..."
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>

          <div className="card">
            {loading ? (
              <div className="flex-center" style={{ height: 200 }}><div className="text-muted">Loading...</div></div>
            ) : suppliers.length === 0 ? (
              <div className="empty-state">
                <MdLocalShipping size={52} style={{ opacity: 0.3, marginBottom: 16 }} />
                <h3>No suppliers yet</h3>
                <p>Add your first medicine supplier to get started</p>
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Supplier</th><th>Phone</th><th>City</th>
                      <th>Total Ordered</th><th>Paid</th><th>Outstanding</th>
                      <th>Rating</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suppliers.map(s => {
                      const outstanding = Math.max(0, s.totalOrdered - s.totalPaid);
                      return (
                        <tr key={s._id}>
                          <td>
                            <div style={{ fontWeight: 700 }}>{s.name}</div>
                            {s.company && <div className="text-muted text-sm">{s.company}</div>}
                          </td>
                          <td className="text-sm">{s.phone || '—'}</td>
                          <td className="text-sm">{s.city || '—'}</td>
                          <td className="fw-semibold">{PKR(s.totalOrdered)}</td>
                          <td className="text-success fw-semibold">{PKR(s.totalPaid)}</td>
                          <td>
                            {outstanding > 0
                              ? <span className="badge badge-danger">{PKR(outstanding)}</span>
                              : <span className="badge badge-success">Cleared</span>}
                          </td>
                          <td><StarRating value={s.performance?.rating || 0} /></td>
                          <td>
                            <div className="table-actions">
                              <button className="btn btn-secondary btn-sm btn-icon"
                                onClick={() => setViewId(s._id)} title="View Detail">
                                <MdVisibility />
                              </button>
                              {isAdmin && (
                                <>
                                  <button className="btn btn-secondary btn-sm btn-icon"
                                    onClick={() => { setEditSupplier(s); setFormModal(true); }} title="Edit">
                                    <MdEdit />
                                  </button>
                                  <button className="btn btn-danger btn-sm btn-icon"
                                    onClick={() => handleDelete(s._id)} title="Remove">
                                    <MdDelete />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {totalPages > 1 && (
              <div className="pagination">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button key={p} className={page === p ? 'active' : ''} onClick={() => setPage(p)}>{p}</button>
                ))}
                <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Modals */}
      {formModal && (
        <SupplierFormModal
          supplier={editSupplier}
          onClose={() => { setFormModal(false); setEditSupplier(null); }}
          onSaved={afterSave}
        />
      )}

      {viewId && (
        <SupplierDetailModal
          id={viewId}
          onClose={() => setViewId(null)}
          onEdit={(s) => { setViewId(null); setEditSupplier(s); setFormModal(true); }}
          onSaved={() => { fetchSuppliers(); API.get('/suppliers/stats').then(({ data }) => setStats(data.stats)).catch(()=>{}); }}
        />
      )}
    </div>
  );
}