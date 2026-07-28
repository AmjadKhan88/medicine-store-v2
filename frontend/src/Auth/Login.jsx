import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { assets } from "../assets/assets"
import toast from 'react-hot-toast';
import { MdEmail, MdLock, MdMedicalServices, MdInventory, MdPeople, MdBarChart } from 'react-icons/md';
import API from '../utils/api';

export default function Login() {
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [unverified, setUnverified] = useState('');
  const [errors, setErrors] = useState(null);
  const [step, setStep] = useState('password');    // 'password' | '2fa'
  const [tempToken, setTempToken] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const { login, verify2FA } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    try {
      const data = await login(form.email, form.password);
      if (data.requires2FA) {
        setTempToken(data.tempToken);
        setStep('2fa');
      } else {
        navigate('/app/dashboard');
      }
    } catch (err) {
      setErrors({ general: err.response?.data?.message || 'Login failed' });
    } finally { setLoading(false); }
  };

  const handle2FA = async (e) => {
    e.preventDefault();
    if (!otpCode.trim()) { setErrors({ otp: 'Enter the 6-digit code' }); return; }
    setOtpLoading(true);
    setErrors({});
    try {
      await verify2FA(tempToken, otpCode.replace(/\s/g, ''));
      navigate('/app/dashboard');
    } catch (err) {
      setErrors({ otp: err.response?.data?.message || 'Invalid code' });
    } finally { setOtpLoading(false); }
  };

  const features = [
    { icon: <MdMedicalServices />, text: 'Complete Medicine Inventory Management' },
    { icon: <MdInventory />, text: 'Expiry Date Tracking & Alerts' },
    { icon: <MdPeople />, text: 'Patient Records & Balance Tracking' },
    { icon: <MdBarChart />, text: 'Sales Reports & Analytics' },
  ];

  return (
    <div className="auth-page">
      <div className="auth-left" style={{ background: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(${assets.medi_img}) center/cover` }}>
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
                {errors?.email && <p style={{ color: 'red', fontSize: 'x-small' }}> {errors.email} </p>}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label required">Password</label>
              <div className="input-group">
                <MdLock className="input-icon" />
                <input className="form-control" type="password" placeholder="••••••••"
                  value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required />
                {errors?.password && <p style={{ color: 'red', fontSize: 'x-small' }}> {errors.password} </p>}
              </div>
            </div>
            {/* <button className="btn btn-primary btn-lg w-full" type="submit" disabled={loading} style={{ marginTop: 8 }}>
              {loading ? 'Signing in...' : 'Sign In to MediStore'}
            </button> */}
            {step === 'password' ? (
              <button className="btn btn-primary btn-lg w-full" type="submit" disabled={loading} style={{ marginTop: 8 }}>
                {loading ? 'Logging in...' : 'Login'}
              </button>
            ) : (
              /* ── 2FA Step ── */
              <div>
                <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 12, padding: '16px 18px', marginBottom: 16, textAlign: 'center' }}>
                  <div style={{ fontSize: 32, marginBottom: 6 }}>🔐</div>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Two-Factor Authentication</div>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>
                    Enter the 6-digit code from your Google Authenticator app, or a recovery code.
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Authenticator Code</label>
                  <input
                    className="form-control"
                    value={otpCode}
                    onChange={e => setOtpCode(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handle2FA(e)}
                    placeholder="000 000"
                    maxLength={10}
                    autoFocus
                    style={{ fontSize: 22, textAlign: 'center', letterSpacing: 6, fontWeight: 700 }}
                  />
                  {errors.otp && <div className="form-error">{errors.otp}</div>}
                </div>

                <button
                  onClick={handle2FA}
                  disabled={otpLoading || !otpCode.trim()}
                  style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', background: '#0ea5e9', color: '#fff', fontWeight: 800, fontSize: 16, cursor: 'pointer', marginBottom: 10 }}>
                  {otpLoading ? 'Verifying...' : 'Verify & Login'}
                </button>

                <button
                  onClick={() => { setStep('password'); setOtpCode(''); setErrors({}); setTempToken(''); }}
                  style={{ width: '100%', background: 'none', border: 'none', color: '#6b7280', fontSize: 13, cursor: 'pointer', padding: '6px 0' }}>
                  ← Back to login
                </button>
              </div>
            )}
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