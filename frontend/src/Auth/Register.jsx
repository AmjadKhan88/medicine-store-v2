import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'doctor', phone: '' });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(form);
      toast.success('Account created!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div style={{ maxWidth: 380, width: '100%' }}>
          <div className="auth-logo">Medi<span>Store</span></div>
          <div className="auth-tagline">Join MediStore – The Complete Medicine Store Management Solution</div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, lineHeight: 1.7 }}>
            Manage medicines, track expiry dates, maintain patient records, generate invoices, and monitor your store's financial health — all in one professional system.
          </div>
        </div>
      </div>
      <div className="auth-right">
        <div className="auth-card">
          <h2 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>Create Account</h2>
          <p className="text-muted text-sm" style={{ marginBottom: 28 }}>Fill in the details to get started</p>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label required">Full Name</label>
                <input className="form-control" placeholder="Dr. Muhammad Ali" value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} required />
              </div>
              <div className="form-group">
                <label className="form-label required">Role</label>
                <select className="form-control" value={form.role} onChange={e => setForm(p => ({...p, role: e.target.value}))}>
                  <option value="admin">Admin</option>
                  <option value="doctor">Doctor</option>
                  <option value="pharmacist">Pharmacist</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label required">Email Address</label>
              <input className="form-control" type="email" placeholder="doctor@clinic.com" value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} required />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label required">Password</label>
                <input className="form-control" type="password" placeholder="Min 6 characters" value={form.password} onChange={e => setForm(p => ({...p, password: e.target.value}))} required minLength={6} />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-control" placeholder="0300-1234567" value={form.phone} onChange={e => setForm(p => ({...p, phone: e.target.value}))} />
              </div>
            </div>
            <button className="btn btn-primary btn-lg w-full" type="submit" disabled={loading}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>
          <p className="text-muted text-sm" style={{ textAlign: 'center', marginTop: 20 }}>
            Already have an account? <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}