import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MdEmail, MdArrowBack } from 'react-icons/md';
import toast from 'react-hot-toast';
import API from '../utils/api';

export default function ForgotPassword() {
  const [email, setEmail]   = useState('');
  const [sent, setSent]     = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await API.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send email');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', padding: 20 }}>
      <div style={{ background: 'var(--card-bg)', borderRadius: 20, padding: 44, maxWidth: 420, width: '100%', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xl)' }}>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 32, textAlign: 'center' }}>
          Medi<span style={{ color: 'var(--accent)' }}>Store</span>
        </div>

        {!sent ? (
          <>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Forgot Password</h2>
            <p className="text-muted text-sm" style={{ marginBottom: 28 }}>
              Enter your email and we'll send you a reset link.
            </p>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label required">Email Address</label>
                <div className="input-group">
                  <MdEmail className="input-icon" />
                  <input className="form-control" type="email" placeholder="your@email.com"
                    value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
              </div>
              <button className="btn btn-primary w-full btn-lg" type="submit" disabled={loading}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          </>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>📧</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Check your email</h2>
            <p className="text-muted text-sm" style={{ marginBottom: 24 }}>
              We sent a password reset link to <strong>{email}</strong>.<br />
              Link expires in 1 hour.
            </p>
            <p className="text-muted" style={{ fontSize: 13 }}>
              Didn't receive it? Check spam folder or{' '}
              <button onClick={() => setSent(false)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit', fontSize: 13 }}>
                try again
              </button>
            </p>
          </div>
        )}

        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <Link to="/login" style={{ color: 'var(--accent)', fontSize: 14, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <MdArrowBack size={14} /> Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}