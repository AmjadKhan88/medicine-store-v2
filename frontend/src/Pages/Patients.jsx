import { useState, useEffect, useCallback } from 'react';
import PermissionGate from '../Components/PermissionGate';
import { MdAdd, MdEdit, MdDelete, MdSearch, MdPeople, MdPhone, MdAccountBalance, MdArrowForward } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import API from '../utils/api';

const BLOOD = ['A+','A-','B+','B-','AB+','AB-','O+','O-','Unknown'];
const empty = { name:'',age:'',gender:'Male',phone:'',email:'',address:'',city:'',bloodGroup:'Unknown',medicalHistory:'',allergies:'',doctor:'' };

export default function Patients() {
  const [patients, setPatients] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const navigate = useNavigate();

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/patients', { params: { page, limit: 15, search } });
      setPatients(data.patients); setTotal(data.total); setTotalPages(data.totalPages);
    } catch { toast.error('Failed to load patients'); }
    finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { fetchPatients(); }, [fetchPatients]);
  useEffect(() => { setPage(1); }, [search]);

  const openAdd = () => { setForm(empty); setEditing(null); setModal(true); };
  const openEdit = (p) => { setForm({ ...p, allergies: (p.allergies||[]).join(', ') }); setEditing(p._id); setModal(true); };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = { ...form, allergies: form.allergies ? form.allergies.split(',').map(a=>a.trim()).filter(Boolean) : [] };
      if (editing) { await API.put(`/patients/${editing}`, payload); toast.success('Patient updated!'); }
      else { await API.post('/patients', payload); toast.success('Patient registered!'); }
      setModal(false); fetchPatients();
    } catch (err) { toast.error(err.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try { await API.delete(`/patients/${deleteId}`); toast.success('Patient deleted'); setDeleteId(null); fetchPatients(); }
    catch { toast.error('Delete failed'); }
  };

  const fld = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));
  const fmtPKR = (n) => `₨ ${Number(n||0).toLocaleString('en-PK')}`;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Patients</h1>
          <p>{total} registered patients</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={() => navigate('/patient-balance')}><MdAccountBalance /> View Balances</button>
          <button className="btn btn-primary" onClick={openAdd}><MdAdd /> Add Patient</button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="toolbar" style={{ marginBottom: 0 }}>
          <div className="search-box">
            <MdSearch className="search-icon" />
            <input placeholder="Search by name, ID, phone..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="flex-center" style={{ height: 200 }}><div className="text-muted">Loading...</div></div>
        ) : patients.length === 0 ? (
          <div className="empty-state"><MdPeople size={52} style={{ opacity: 0.3 }} /><h3>No patients found</h3><p>Register your first patient</p></div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr><th>Patient</th><th>Contact</th><th>Blood</th><th>Doctor</th><th>Billed</th><th>Paid</th><th>Balance</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {patients.map(p => {
                  const balance = Math.max(0, (p.totalBilled||0) - (p.totalPaid||0));
                  return (
                    <tr key={p._id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{p.name}</div>
                        <div className="text-muted text-sm">{p.patientId} · {p.age}y · {p.gender}</div>
                        {p.city && <div className="text-muted text-sm">{p.city}</div>}
                      </td>
                      <td>
                        {p.phone && <div className="flex gap-2" style={{ alignItems:'center', fontSize:13 }}><MdPhone size={14} />{p.phone}</div>}
                        {p.email && <div className="text-muted text-sm">{p.email}</div>}
                      </td>
                      <td><span className="badge badge-accent">{p.bloodGroup}</span></td>
                      <td className="text-sm">{p.doctor || '—'}</td>
                      <td className="fw-semibold">{fmtPKR(p.totalBilled)}</td>
                      <td className="text-success fw-semibold">{fmtPKR(p.totalPaid)}</td>
                      <td>
                        {balance > 0
                          ? <span className="badge badge-danger">₨ {balance.toLocaleString()}</span>
                          : <span className="badge badge-success">Cleared</span>}
                      </td>
                      <td>
                        <div className="table-actions">
                          <button className="btn btn-secondary btn-sm btn-icon" onClick={() => openEdit(p)}><MdEdit /></button>
                          <PermissionGate permission="deletePatient">
                            <button className="btn btn-danger btn-sm btn-icon" onClick={() => setDeleteId(p._id)}><MdDelete /></button>
                          </PermissionGate>
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
            <button disabled={page===1} onClick={() => setPage(p=>p-1)}>‹</button>
            {Array.from({length:totalPages},(_,i)=>i+1).map(p=><button key={p} className={page===p?'active':''} onClick={()=>setPage(p)}>{p}</button>)}
            <button disabled={page===totalPages} onClick={() => setPage(p=>p+1)}>›</button>
          </div>
        )}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setModal(false)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <div className="modal-title">{editing ? 'Edit Patient' : 'Register New Patient'}</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="form-row">
                <div className="form-group"><label className="form-label required">Full Name</label><input className="form-control" value={form.name} onChange={fld('name')} required placeholder="Muhammad Ali" /></div>
                <div className="form-group"><label className="form-label">Age</label><input className="form-control" type="number" value={form.age} onChange={fld('age')} min="0" max="150" /></div>
                <div className="form-group"><label className="form-label">Gender</label><select className="form-control" value={form.gender} onChange={fld('gender')}><option>Male</option><option>Female</option><option>Other</option></select></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Phone</label><input className="form-control" value={form.phone} onChange={fld('phone')} placeholder="0300-1234567" /></div>
                <div className="form-group"><label className="form-label">Email</label><input className="form-control" type="email" value={form.email} onChange={fld('email')} placeholder="patient@email.com" /></div>
                <div className="form-group"><label className="form-label">Blood Group</label><select className="form-control" value={form.bloodGroup} onChange={fld('bloodGroup')}>{BLOOD.map(b=><option key={b}>{b}</option>)}</select></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">City</label><input className="form-control" value={form.city} onChange={fld('city')} placeholder="Peshawar" /></div>
                <div className="form-group"><label className="form-label">Attending Doctor</label><input className="form-control" value={form.doctor} onChange={fld('doctor')} placeholder="Dr. Ahmed Khan" /></div>
              </div>
              <div className="form-group"><label className="form-label">Address</label><textarea className="form-control" rows={2} value={form.address} onChange={fld('address')} placeholder="Full address..." /></div>
              <div className="form-group"><label className="form-label">Medical History</label><textarea className="form-control" rows={2} value={form.medicalHistory} onChange={fld('medicalHistory')} placeholder="Diabetes, Hypertension..." /></div>
              <div className="form-group"><label className="form-label">Known Allergies</label><input className="form-control" value={form.allergies} onChange={fld('allergies')} placeholder="Penicillin, Aspirin (comma separated)" /></div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : editing ? 'Update Patient' : 'Register Patient'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth:400, textAlign:'center' }}>
            <div style={{ fontSize:48, marginBottom:16 }}>🗑️</div>
            <div className="modal-title" style={{ marginBottom:8 }}>Delete Patient?</div>
            <p className="text-muted text-sm" style={{ marginBottom:24 }}>This will remove the patient record permanently.</p>
            <div className="flex gap-3" style={{ justifyContent:'center' }}>
              <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete}>Yes, Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
