import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {assets} from "../assets/assets"
import toast from 'react-hot-toast';
import { MdEmail, MdLock, MdMedicalServices, MdInventory, MdPeople, MdBarChart } from 'react-icons/md';
import API from '../utils/api';

export default function Login() {
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [unverified, setUnverified] = useState('');
  const [errors,setErrors] = useState(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {

      const { data } = await API.post('/auth/login', { email: form.email, password: form.password });
      if (data.success) {
        login(data.token, data.user); // single call — sets localStorage + React state atomically
        toast.success('Welcome back!');
        setErrors(null);
        navigate('/app');
      }

    } catch (err) {
      if (err.response?.data?.code === 'EMAIL_NOT_VERIFIED') {
        toast.error('Please verify your email first');
        setUnverified(err.response.data.email);
      } else {
        toast.error(err.response?.data?.message || 'Login failed');
        setErrors(err?.response?.data?.errors || null)
      }
    } finally { setLoading(false); }
  };

  const features = [
    { icon: <MdMedicalServices />, text: 'Complete Medicine Inventory Management' },
    { icon: <MdInventory />, text: 'Expiry Date Tracking & Alerts' },
    { icon: <MdPeople />, text: 'Patient Records & Balance Tracking' },
    { icon: <MdBarChart />, text: 'Sales Reports & Analytics' },
  ];

  return (
    <div className="auth-page">
      <div className="auth-left" style={{background:`linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${assets.medi_img}) center/cover`}}>
        <div style={{ maxWidth: 380, width: '100%' }}>
          <div className="auth-logo">Medi<span>Store</span></div>
          <div className="auth-tagline">Professional Medicine Store Management System</div>
          {features.map((f, i) => (
            <div key={i} className="auth-feature">
              <div className="auth-feature-icon">{f.icon}</div>
              <span>{f.text}</span>
            </div>
          ))}
          
        </div>
      </div>
      <div className="auth-right">
        <div className="auth-card">
          <h2 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>Sign In</h2>
          <p className="text-muted text-sm" style={{ marginBottom: 28 }}>Enter your credentials to access the system</p>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label required">Email Address</label>
              <div className="input-group">
                <MdEmail className="input-icon" />
                <input className="form-control" type="email" placeholder="doctor@medistore.com"
                  value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
                {errors?.email && <p style={{color:'red',fontSize:'x-small'}}> {errors.email} </p> }
              </div>
            </div>
            <div className="form-group">
              <label className="form-label required">Password</label>
              <div className="input-group">
                <MdLock className="input-icon" />
                <input className="form-control" type="password" placeholder="••••••••"
                  value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required />
                  {errors?.password && <p style={{color:'red',fontSize:'x-small'}}> {errors.password} </p> }
              </div>
            </div>
            <button className="btn btn-primary btn-lg w-full" type="submit" disabled={loading} style={{ marginTop: 8 }}>
              {loading ? 'Signing in...' : 'Sign In to MediStore'}
            </button>
          </form>
          {unverified && (
            <div className="alert alert-warning" style={{ marginTop: 12 }}>
              <div className="alert-text">
                <strong>Email not verified.</strong>
                {' '}<button style={{ background: 'none', border: 'none', color: 'var(--accent)', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14 }}
                  onClick={async () => {
                    try { await API.post('/auth/resend-verification', { email: unverified }); toast.success('Verification email resent!'); }
                    catch { toast.error('Failed to resend'); }
                  }}>
                  Resend verification email
                </button>
              </div>
            </div>
          )}
          <p className="text-muted text-sm" style={{ textAlign: 'center', marginTop: 12 }}>
            <Link to="/forgot-password" style={{ color: 'var(--accent)' }}>Forgot password?</Link>
          </p>
          <p className="text-muted text-sm" style={{ textAlign: 'center', marginTop: 20 }}>
            New user? <Link to="/register" style={{ color: 'var(--accent)', fontWeight: 600 }}>Create an account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}