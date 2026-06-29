import { useState, useEffect } from 'react';
import {
  MdAdd, MdEdit, MdDelete, MdPeople,
  MdLock, MdCheckCircle, MdCancel, MdPerson
} from 'react-icons/md';
import toast from 'react-hot-toast';
import API from '../utils/api';
import { usePermissions } from '../hooks/usePermissions';

const ROLE_BADGE = {
  admin:       { cls: 'badge-danger',  label: 'Admin / Owner' },
  doctor:      { cls: 'badge-accent',  label: 'Doctor'        },
  pharmacist:  { cls: 'badge-success', label: 'Pharmacist'    },
};

const ROLE_PERMS = {
  admin:      ['Full access', 'Manage staff', 'Delete records', 'View reports', 'Store settings'],
  doctor:     ['Add/edit medicines', 'Add/edit patients', 'Create bills', 'View reports'],
  pharmacist: ['Create bills only', 'View medicines', 'View patients'],
};

export default function StaffManagement() {
  const { isAdmin } = usePermissions();
  const [staff, setStaff]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [addModal, setAddModal]     = useState(false);
  const [editModal, setEditModal]   = useState(null);
  const [pwModal, setPwModal]       = useState(null);
  const [newPw, setNewPw]           = useState('');
  const [saving, setSaving]         = useState(false);
  const [form, setForm]             = useState({ name: '', email: '', password: '', role: 'doctor', phone: '' });

  if (!isAdmin) return (
    <div className="empty-state" style={{ paddingTop: 80 }}>
      <MdLock size={52} style={{ opacity: 0.3, marginBottom: 16 }} />
      <h3>Admin Access Required</h3>
      <p>Only the store owner can manage staff accounts</p>
    </div>
  );

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/staff');
      setStaff(data.staff);
    } catch { toast.error('Failed to load staff'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchStaff(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await API.post('/staff', form);
      toast.success('Staff account created!');
      setAddModal(false);
      setForm({ name: '', email: '', password: '', role: 'doctor', phone: '' });
      fetchStaff();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleUpdate = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await API.put(`/staff/${editModal._id}`, editModal);
      toast.success('Staff updated!');
      setEditModal(null);
      fetchStaff();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleToggleActive = async (member) => {
    try {
      await API.put(`/staff/${member._id}`, { isActive: !member.isActive });
      toast.success(member.isActive ? 'Account deactivated' : 'Account activated');
      fetchStaff();
    } catch { toast.error('Failed'); }
  };

  const handleResetPw = async () => {
    if (!newPw || newPw.length < 6) return toast.error('Min 6 characters');
    try {
      await API.patch(`/staff/${pwModal._id}/reset-password`, { newPassword: newPw });
      toast.success('Password reset!');
      setPwModal(null); setNewPw('');
    } catch { toast.error('Failed'); }
  };

  const handleRemove = async (id) => {
    if (!confirm('Remove this staff member? They will lose all access.')) return;
    try {
      await API.delete(`/staff/${id}`);
      toast.success('Staff removed');
      fetchStaff();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const fld = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Staff Management</h1>
          <p>Manage who has access to your store</p>
        </div>
        <button className="btn btn-primary" onClick={() => setAddModal(true)}>
          <MdAdd /> Add Staff Member
        </button>
      </div>

      {/* Role permissions reference */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
        {Object.entries(ROLE_PERMS).map(([role, perms]) => (
          <div key={role} className="card card-sm">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span className={`badge ${ROLE_BADGE[role].cls}`}>{ROLE_BADGE[role].label}</span>
            </div>
            {perms.map(p => (
              <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginBottom: 4, color: 'var(--text-secondary)' }}>
                <MdCheckCircle size={13} style={{ color: 'var(--success)', flexShrink: 0 }} />{p}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Staff list */}
      <div className="card">
        {loading ? (
          <div className="flex-center" style={{ height: 200 }}>
            <div className="text-muted">Loading...</div>
          </div>
        ) : staff.length === 0 ? (
          <div className="empty-state">
            <MdPeople size={52} style={{ opacity: 0.3, marginBottom: 16 }} />
            <h3>No staff members yet</h3>
            <p>Add doctors or pharmacists to give them access</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {staff.map(m => (
                  <tr key={m._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: '50%',
                          background: 'var(--accent-light)', color: 'var(--accent)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 800, fontSize: 13, flexShrink: 0,
                        }}>
                          {m.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div style={{ fontWeight: 600 }}>{m.name}</div>
                      </div>
                    </td>
                    <td className="text-sm">{m.email}</td>
                    <td className="text-sm">{m.phone || '—'}</td>
                    <td>
                      <span className={`badge ${ROLE_BADGE[m.role]?.cls || 'badge-default'}`}>
                        {ROLE_BADGE[m.role]?.label || m.role}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${m.isActive ? 'badge-success' : 'badge-danger'}`}>
                        {m.isActive ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td className="text-sm text-muted">
                      {new Date(m.createdAt).toLocaleDateString('en-PK')}
                    </td>
                    <td>
                      <div className="table-actions">
                        <button className="btn btn-secondary btn-sm btn-icon"
                          onClick={() => setEditModal({ ...m })} title="Edit">
                          <MdEdit />
                        </button>
                        <button className="btn btn-secondary btn-sm btn-icon"
                          onClick={() => { setPwModal(m); setNewPw(''); }} title="Reset Password">
                          <MdLock />
                        </button>
                        <button
                          className={`btn btn-sm btn-icon ${m.isActive ? 'btn-danger' : 'btn-success'}`}
                          onClick={() => handleToggleActive(m)}
                          title={m.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {m.isActive ? <MdCancel /> : <MdCheckCircle />}
                        </button>
                        {m.role !== 'admin' && (
                          <button className="btn btn-danger btn-sm btn-icon"
                            onClick={() => handleRemove(m._id)} title="Remove">
                            <MdDelete />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add modal */}
      {addModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setAddModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">Add Staff Member</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setAddModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAdd}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label required">Full Name</label>
                  <input className="form-control" value={form.name} onChange={fld('name')} required placeholder="Dr. Ahmad" />
                </div>
                <div className="form-group">
                  <label className="form-label required">Role</label>
                  <select className="form-control" value={form.role} onChange={fld('role')}>
                    <option value="doctor">Doctor</option>
                    <option value="pharmacist">Pharmacist</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label required">Email</label>
                <input className="form-control" type="email" value={form.email} onChange={fld('email')} required placeholder="staff@store.com" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label required">Password</label>
                  <input className="form-control" type="password" value={form.password} onChange={fld('password')} required minLength={6} placeholder="Min 6 chars" />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-control" value={form.phone} onChange={fld('phone')} placeholder="0300-0000000" />
                </div>
              </div>

              {/* Permission preview */}
              <div style={{ background: 'var(--bg-tertiary)', borderRadius: 10, padding: 12, marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>
                  THIS ROLE CAN:
                </div>
                {ROLE_PERMS[form.role]?.map(p => (
                  <div key={p} style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', gap: 6, marginBottom: 3 }}>
                    <MdCheckCircle size={13} style={{ color: 'var(--success)', marginTop: 1 }} />{p}
                  </div>
                ))}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setEditModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">Edit Staff Member</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setEditModal(null)}>✕</button>
            </div>
            <form onSubmit={handleUpdate}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input className="form-control" value={editModal.name}
                    onChange={e => setEditModal(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select className="form-control" value={editModal.role}
                    onChange={e => setEditModal(p => ({ ...p, role: e.target.value }))}
                    disabled={editModal.role === 'admin'}>
                    <option value="doctor">Doctor</option>
                    <option value="pharmacist">Pharmacist</option>
                    {editModal.role === 'admin' && <option value="admin">Admin / Owner</option>}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-control" value={editModal.phone || ''}
                  onChange={e => setEditModal(p => ({ ...p, phone: e.target.value }))} />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset password modal */}
      {pwModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setPwModal(null)}>
          <div className="modal" style={{ maxWidth: 380 }}>
            <div className="modal-header">
              <div className="modal-title">Reset Password</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setPwModal(null)}>✕</button>
            </div>
            <p className="text-muted text-sm" style={{ marginBottom: 16 }}>
              Set a new password for <strong>{pwModal.name}</strong>
            </p>
            <div className="form-group">
              <label className="form-label required">New Password</label>
              <input className="form-control" type="password" value={newPw}
                onChange={e => setNewPw(e.target.value)} minLength={6} placeholder="Min 6 characters" />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setPwModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleResetPw}>Reset Password</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}