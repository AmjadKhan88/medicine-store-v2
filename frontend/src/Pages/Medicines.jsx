import { useState, useEffect, useCallback } from 'react';
import PermissionGate from '../Components/PermissionGate';
import { useAI } from '../context/AIContext';
import { MdAdd, MdAutoAwesome, MdEdit, MdDelete, MdSearch, MdMedicalServices, MdWarning, MdSwapHoriz } from 'react-icons/md';
import toast from 'react-hot-toast';
import API from '../utils/api';
import { useSocketEvent } from '../hooks/useSocketEvent';
import {useWindowWidth} from '../hooks/useWindowWidth';


const CATEGORIES = ['All', 'Antibiotic', 'Analgesic', 'Antiviral', 'Antifungal', 'Cardiovascular', 'Diabetes', 'Respiratory', 'Gastrointestinal', 'Neurological', 'Vitamin & Supplement', 'Dermatological', 'Other'];
const FORMS = ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream', 'Drops', 'Inhaler', 'Patch', 'Other'];
const UNITS = ['Pcs', 'Strip', 'Box', 'Bottle', 'Vial', 'Tube'];
const STATUSES = [
  { id: '', label: 'All' }, { id: 'expiring', label: 'Expiring Soon' },
  { id: 'expired', label: 'Expired' }, { id: 'lowstock', label: 'Low Stock' },
];

const empty = { name: '', genericName: '', category: 'Other', manufacturer: '', batchNumber: '', dosageForm: 'Tablet', strength: '', unit: 'Strip', purchasePrice: '', salePrice: '', stock: '', minStock: '10', expiryDate: '', manufacturingDate: '', location: '', requiresPrescription: false, description: '' };

function getExpiryBadge(med) {
  const now = new Date();
  const exp = new Date(med.expiryDate);
  const d30 = new Date(); d30.setDate(d30.getDate() + 30);
  if (exp < now) return <span className="badge badge-danger">Expired</span>;
  if (exp <= d30) return <span className="badge badge-warning">Expiring Soon</span>;
  return <span className="badge badge-success">Valid</span>;
}

export default function Medicines() {
  const [medicines, setMedicines] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const [subsModal, setSubsModal] = useState(null); // medicine being edited for substitutes
  const [allMeds, setAllMeds] = useState([]);
  const [selectedSubs, setSelectedSubs] = useState([]);

  const { selectedModel } = useAI();
  const [suggesting, setSuggesting] = useState(false);

  const width = useWindowWidth();

  const fetchMedicines = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (search) params.search = search;
      if (category && category !== 'All') params.category = category;
      if (status) params.status = status;
      const { data } = await API.get('/medicines', { params });
      setMedicines(data.medicines); setTotal(data.total); setTotalPages(data.totalPages);
    } catch { toast.error('Failed to load medicines'); }
    finally { setLoading(false); }
  }, [page, search, category, status]);

  useEffect(() => { fetchMedicines(); }, [fetchMedicines]);
  useEffect(() => { setPage(1); }, [search, category, status]);

  const openAdd = () => { setForm(empty); setEditing(null); setModal(true); };
  const openEdit = (m) => {
    setForm({ ...m, expiryDate: m.expiryDate?.slice(0, 10), manufacturingDate: m.manufacturingDate?.slice(0, 10) || '' });
    setEditing(m._id); setModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editing) { await API.put(`/medicines/${editing}`, form); toast.success('Medicine updated!'); }
      else { await API.post('/medicines', form); toast.success('Medicine added!'); }
      setModal(false); fetchMedicines();
    } catch (err) { toast.error(err.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try { await API.delete(`/medicines/${deleteId}`); toast.success('Medicine deleted'); setDeleteId(null); fetchMedicines(); }
    catch { toast.error('Delete failed'); }
  };


  const openSubstitutes = async (med) => {
    setSubsModal(med);
    setSelectedSubs((med.substitutes || []).map(s => typeof s === 'object' ? s._id : s));
    try {
      const { data } = await API.get('/medicines', { params: { limit: 200 } });
      setAllMeds(data.medicines.filter(m => m._id !== med._id));
    } catch { toast.error('Failed to load medicines'); }
  };

  const toggleSub = (id) => {
    setSelectedSubs(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const saveSubstitutes = async () => {
    try {
      await API.put(`/medicines/${subsModal._id}/substitutes`, { substitutes: selectedSubs });
      toast.success('Substitutes linked!');
      setSubsModal(null);
      fetchMedicines();
    } catch { toast.error('Failed to save'); }
  };

  const handleAISuggest = async () => {
    if (!form.name?.trim()) { toast.error('Enter medicine name first'); return; }
    setSuggesting(true);
    try {
      const { data } = await API.post('/ai/suggest-medicine', {
        name: form.name,
        modelKey: selectedModel,
      });
      if (data.suggestion) {
        setForm(p => ({
          ...p,
          genericName: data.suggestion.genericName || p.genericName,
          category: data.suggestion.category || p.category,
          dosageForm: data.suggestion.dosageForm || p.dosageForm,
          strength: data.suggestion.strength || p.strength,
          requiresPrescription: data.suggestion.requiresPrescription ?? p.requiresPrescription,
          description: data.suggestion.description || p.description,
        }));
        toast.success('AI filled in medicine details!');
      }
    } catch (err) {
      toast.error('AI suggestion failed');
    } finally { setSuggesting(false); }
  };

  useSocketEvent('stock:updated', (data) => {
    setMedicines(prev =>
      prev.map(m => m._id === data._id ? { ...m, stock: data.stock, isLow: data.isLow } : m)
    );
  }, []);

  useSocketEvent('medicine:created', () => {
    // Refetch if on first page — new medicine may have been added by another user
    if (page === 1) fetchMedicines();
  }, [page]);

  useSocketEvent('medicine:updated', (data) => {
    setMedicines(prev =>
      prev.map(m => m._id === data._id ? { ...m, ...data } : m)
    );
  }, []);

  const fld = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1 style={{fontSize: width < 460 ? 16 : 24}}>Medicines</h1>
          <p style={{fontSize: width < 460 ? 11 : 14}}>{total} medicines in inventory</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd} style={{fontSize: width < 460 ? 11 : 14}}><MdAdd /> Add Medicine</button>
      </div>

      <div className="card" style={{ marginBottom: 16, padding: width < 350 ? 12 : 24 }}>
        <div className="toolbar" style={{ marginBottom: 0 }}>
          <div className="search-box">
            <MdSearch className="search-icon" />
            <input placeholder="Search by name, generic name, batch..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="form-control" style={{ width: 160, padding: width < 460 ? '6px 10px': '10px 14px', fontSize: width < 460 ? 11 : 14 }} value={category} onChange={e => setCategory(e.target.value)}>
            {CATEGORIES.map(c => <option key={c} value={c === 'All' ? '' : c}>{c}</option>)}
          </select>
          <div className="flex gap-2">
            {STATUSES.map(s => (
              <button key={s.id} className={`pill${status === s.id ? ' active' : ''}`} style={{padding: width < 460 ? '5px 10px' : '5px 14px', fontSize: width < 460 ? 9 : 13}} onClick={() => setStatus(s.id)}>{s.label}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{padding: width < 460 ? 10 : 24}}>
        {loading ? (
          <div className="flex-center" style={{ height: 200 }}><div className="text-muted">Loading...</div></div>
        ) : medicines.length === 0 ? (
          <div className="empty-state"><MdMedicalServices size={52} style={{ opacity: 0.3 }} /><h3>No medicines found</h3><p>Add your first medicine or adjust filters</p></div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr ><th>Medicine</th><th>Category</th><th>Stock</th><th>Purchase</th><th>Sale Price</th><th>Expiry</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {medicines.map(m => (
                  <tr key={m._id}>
                    <td>
                      <div style={{ fontWeight:width < 460 ? 500 : 600 }}>{m.name}</div>
                      <div className="text-muted text-sm" style={{ fontSize:width < 460 ? 9 : 13 }}>{m.genericName} · {m.dosageForm} {m.strength}</div>
                      {m.requiresPrescription && <span className="badge badge-info" style={{ marginTop: 2, fontSize: 10 }}>Rx</span>}
                    </td>
                    <td><span className="badge badge-default" style={{ fontSize:width < 460 ? 9 : 12 }}>{m.category}</span></td>
                    <td>
                      <div style={{ fontWeight: m.isLowStock ? 700 : 400, color: m.isLowStock ? 'var(--danger)' : 'var(--text-primary)' }}>
                        {m.stock} {m.unit}
                        {m.isLowStock && <MdWarning style={{ marginLeft: 4, color: 'var(--warning)' }} />}
                      </div>
                      <div className="text-muted text-sm" style={{ fontSize:width < 460 ? 9 : 13 }}>Min: {m.minStock}</div>
                    </td>
                    <td>₨ {m.purchasePrice?.toLocaleString()}</td>
                    <td className="fw-semibold text-success">₨ {m.salePrice?.toLocaleString()}</td>
                    <td>{new Date(m.expiryDate).toLocaleDateString('en-PK')}</td>
                    <td>{getExpiryBadge(m)}</td>
                    <td>
                      <div className="table-actions">
                        <button className="btn btn-secondary btn-sm btn-icon" onClick={() => openEdit(m)} title="Edit"><MdEdit /></button>
                        <button className="btn btn-secondary btn-sm btn-icon" onClick={() => openSubstitutes(m)} title="Link Substitutes">
                          <MdSwapHoriz />
                        </button>
                        <PermissionGate permission="deleteMedicine">
                          <button className="btn btn-danger btn-sm btn-icon"
                            onClick={() => setDeleteId(m._id)}><MdDelete /></button>
                        </PermissionGate>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="pagination">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1).map((p, i, arr) => (
              <span key={p}>{i > 0 && arr[i - 1] !== p - 1 && <button disabled>...</button>}
                <button className={page === p ? 'active' : ''} onClick={() => setPage(p)}>{p}</button>
              </span>
            ))}
            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</button>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <div className="modal-title">{editing ? 'Edit Medicine' : 'Add New Medicine'}</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label required">Medicine Name</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input className="form-control" value={form.name} onChange={fld('name')} required placeholder="e.g. Panadol Extra" style={{ flex: 1 }} />
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={handleAISuggest}
                      disabled={suggesting || !form.name}
                      title="Auto-fill details using AI"
                      style={{ flexShrink: 0 }}
                    >
                      {suggesting
                        ? <span className="spin" style={{ display: 'inline-block', fontSize: 11 }}>⏳</span>
                        : <MdAutoAwesome size={16} style={{ color: 'var(--accent)' }} />}
                    </button>
                  </div>
                  {!suggesting && form.name && (
                    <div className="form-hint">
                      Click ✦ to auto-fill category, generic name and details with AI
                    </div>
                  )}
                </div>
                {/* <div className="form-group">
                  <label className="form-label required">Medicine Name</label>
                  <input className="form-control" value={form.name} onChange={fld('name')} required placeholder="e.g. Panadol Extra" />
                </div> */}
                <div className="form-group"><label className="form-label">Generic Name</label><input className="form-control" value={form.genericName} onChange={fld('genericName')} placeholder="e.g. Paracetamol" /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Category</label><select className="form-control" value={form.category} onChange={fld('category')}>{CATEGORIES.filter(c => c !== 'All').map(c => <option key={c}>{c}</option>)}</select></div>
                <div className="form-group"><label className="form-label">Dosage Form</label><select className="form-control" value={form.dosageForm} onChange={fld('dosageForm')}>{FORMS.map(f => <option key={f}>{f}</option>)}</select></div>
                <div className="form-group"><label className="form-label">Unit</label><select className="form-control" value={form.unit} onChange={fld('unit')}>{UNITS.map(u => <option key={u}>{u}</option>)}</select></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Manufacturer</label><input className="form-control" value={form.manufacturer} onChange={fld('manufacturer')} placeholder="GSK, Abbott..." /></div>
                <div className="form-group"><label className="form-label">Batch Number</label><input className="form-control" value={form.batchNumber} onChange={fld('batchNumber')} placeholder="B001" /></div>
                <div className="form-group"><label className="form-label">Strength</label><input className="form-control" value={form.strength} onChange={fld('strength')} placeholder="500mg" /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label required">Purchase Price (₨)</label><input className="form-control" type="number" value={form.purchasePrice} onChange={fld('purchasePrice')} required min="0" /></div>
                <div className="form-group"><label className="form-label required">Sale Price (₨)</label><input className="form-control" type="number" value={form.salePrice} onChange={fld('salePrice')} required min="0" /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label required">Stock Quantity</label><input className="form-control" type="number" value={form.stock} onChange={fld('stock')} required min="0" /></div>
                <div className="form-group"><label className="form-label">Min Stock Alert</label><input className="form-control" type="number" value={form.minStock} onChange={fld('minStock')} min="0" /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label required">Expiry Date</label><input className="form-control" type="date" value={form.expiryDate} onChange={fld('expiryDate')} required /></div>
                <div className="form-group"><label className="form-label">Manufacturing Date</label><input className="form-control" type="date" value={form.manufacturingDate} onChange={fld('manufacturingDate')} /></div>
                <div className="form-group"><label className="form-label">Storage Location</label><input className="form-control" value={form.location} onChange={fld('location')} placeholder="Shelf A, Row 2" /></div>
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>
                  <input type="checkbox" checked={form.requiresPrescription} onChange={fld('requiresPrescription')} />
                  Requires Prescription (Rx)
                </label>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : editing ? 'Update Medicine' : 'Add Medicine'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Link Substitutes Modal */}
      {subsModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSubsModal(null)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <div>
                <div className="modal-title">Link Substitutes</div>
                <div className="text-muted text-sm">for {subsModal.name}</div>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setSubsModal(null)}>✕</button>
            </div>

            <div style={{
              background: 'var(--accent-light)', border: '1px solid var(--accent)',
              borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--accent)',
            }}>
              💡 Select medicines that can be used as an alternative when "{subsModal.name}" is out of stock or expired.
            </div>

            <div style={{ maxHeight: 360, overflowY: 'auto' }}>
              {allMeds
                .filter(m => m.category === subsModal.category) // suggest same category first
                .concat(allMeds.filter(m => m.category !== subsModal.category))
                .map(m => (
                  <label key={m._id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                    border: '1px solid var(--border)', marginBottom: 6,
                    background: selectedSubs.includes(m._id) ? 'var(--accent-light)' : 'var(--card-bg)',
                  }}>
                    <input
                      type="checkbox"
                      checked={selectedSubs.includes(m._id)}
                      onChange={() => toggleSub(m._id)}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{m.name}</div>
                      <div className="text-muted text-sm">
                        {m.genericName} · {m.category} · Stock: {m.stock} {m.unit}
                      </div>
                    </div>
                    {m.category === subsModal.category && (
                      <span className="badge badge-accent" style={{ fontSize: 10 }}>Same category</span>
                    )}
                  </label>
                ))}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSubsModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveSubstitutes}>
                <MdSwapHoriz /> Save {selectedSubs.length} Substitute{selectedSubs.length !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 400, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🗑️</div>
            <div className="modal-title" style={{ marginBottom: 8 }}>Delete Medicine?</div>
            <p className="text-muted text-sm" style={{ marginBottom: 24 }}>This will remove the medicine from inventory. This action cannot be undone.</p>
            <div className="modal-footer" style={{ justifyContent: 'center', border: 'none', paddingTop: 0, marginTop: 0 }}>
              <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete}>Yes, Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
