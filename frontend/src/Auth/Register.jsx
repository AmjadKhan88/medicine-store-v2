import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MdCheckCircle, MdEmail } from 'react-icons/md';
import toast from 'react-hot-toast';
import API from '../utils/api';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [resending, setResending] = useState(false);
  const [resentCount, setResentCount] = useState(0); // prevent spam

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      await API.post('/auth/register', form);
      setDone(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally { setLoading(false); }
  };

  const handleResend = async () => {
    if (resentCount >= 3) { toast.error('Too many resend attempts. Check your spam folder.'); return; }
    setResending(true);
    try {
      await API.post('/auth/resend-verification', { email: form.email });
      setResentCount(c => c + 1);
      toast.success('Verification email resent! Check your inbox.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resend');
    } finally { setResending(false); }
  };

  if (done) return (
    <div className="auth-page">
      <div className="auth-left">
        <div style={{ maxWidth: 380, width: '100%' }}>
          <div className="auth-logo">Medi<span>Store</span></div>
          <div className="auth-tagline">Professional Medicine Store Management</div>
        </div>
      </div>
      <div className="auth-right">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <MdEmail size={36} style={{ color: 'var(--success)' }} />
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Check Your Email!</h2>
          <p className="text-muted" style={{ fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
            We sent a verification link to <strong>{form.email}</strong>.<br />
            Click the link to activate your account and start your free trial.
          </p>
          <div style={{ background: 'var(--bg-tertiary)', borderRadius: 12, padding: 16, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>
            <strong>Didn't get it?</strong> Check your spam folder.<br />
            Link expires in 24 hours.
          </div>
          <button
            className="btn btn-secondary w-full"
            onClick={handleResend}
            disabled={resending || resentCount >= 3}
          >
            {resending ? 'Sending...' : resentCount >= 3 ? 'Max resends reached' : 'Resend Verification Email'}
          </button>
          {resentCount > 0 && resentCount < 3 && (
            <p className="text-muted text-sm" style={{ textAlign: 'center', marginTop: 8 }}>
              Email resent {resentCount} time{resentCount > 1 ? 's' : ''}. Check spam if not received.
            </p>
          )}
          <p className="text-muted text-sm" style={{ marginTop: 16 }}>
            Already verified? <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div style={{ maxWidth: 380, width: '100%' }}>
          <div className="auth-logo">Medi<span>Store</span></div>
          <div className="auth-tagline">Join MediStore — Start your 14-day free trial</div>
          {[
            'Complete pharmacy management system',
            'Expiry alerts & WhatsApp reminders',
            'PDF invoices & professional reports',
            'No credit card required',
          ].map((t, i) => (
            <div key={i} className="auth-feature">
              <div className="auth-feature-icon"><MdCheckCircle /></div>
              <span>{t}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="auth-right">
        <div className="auth-card">
          <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>Create Account</h2>
          <p className="text-muted text-sm" style={{ marginBottom: 28 }}>Free for 14 days · No credit card needed</p>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label required">Full Name</label>
                <input className="form-control" placeholder="Dr. Muhammad Ali" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-control" placeholder="0300-1234567" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label required">Email Address</label>
              <input className="form-control" type="email" placeholder="doctor@pharmacy.com" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="form-label required">Password</label>
              <input className="form-control" type="password" placeholder="Min 6 characters" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required minLength={6} />
            </div>
            <button className="btn btn-primary btn-lg w-full" type="submit" disabled={loading}>
              {loading ? 'Creating Account...' : 'Start Free Trial →'}
            </button>
          </form>
          <p className="text-muted text-sm" style={{ textAlign: 'center', marginTop: 20 }}>
            Already have an account? <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}