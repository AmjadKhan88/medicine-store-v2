import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { MdCheckCircle, MdError, MdEmail } from 'react-icons/md';
import API from '../utils/api';

export default function VerifyEmail() {
  const [params]   = useSearchParams();
  const navigate   = useNavigate();
  const token      = params.get('token');

  const [status, setStatus]   = useState('verifying'); // verifying | success | error
  const [message, setMessage] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [resending, setResending]     = useState(false);
  const [resent, setResent]           = useState(false);

  useEffect(() => {
    if (!token) { setStatus('error'); setMessage('No verification token found in link.'); return; }

    API.post('/auth/verify-email', { token })
      .then(({ data }) => {
        localStorage.setItem('medistore_token', data.token);
        localStorage.setItem('medistore_user',  JSON.stringify(data.user));
        setStatus('success');
        setTimeout(() => navigate('/app'), 2500);
      })
      .catch(err => {
        setStatus('error');
        setMessage(err.response?.data?.message || 'Verification failed.');
      });
  }, [token]);

  const handleResend = async (e) => {
    e.preventDefault();
    if (!resendEmail) return;
    setResending(true);
    try {
      await API.post('/auth/resend-verification', { email: resendEmail });
      setResent(true);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to resend');
    } finally { setResending(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', padding: 20 }}>
      <div style={{ background: 'var(--card-bg)', borderRadius: 20, padding: 48, maxWidth: 440, width: '100%', textAlign: 'center', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xl)' }}>

        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 32 }}>
          Medi<span style={{ color: 'var(--accent)' }}>Store</span>
        </div>

        {status === 'verifying' && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Verifying your email...</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Please wait a moment.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <MdCheckCircle size={56} style={{ color: 'var(--success)', marginBottom: 16 }} />
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Email Verified! 🎉</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>
              Your account is now active. Your 14-day free trial has started!<br />
              Redirecting to dashboard...
            </p>
            <div style={{ height: 4, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: 'var(--success)', width: '100%', animation: 'shrink 2.5s linear forwards' }} />
            </div>
            <style>{`@keyframes shrink { from { width: 100%; } to { width: 0%; } }`}</style>
          </>
        )}

        {status === 'error' && (
          <>
            <MdError size={56} style={{ color: 'var(--danger)', marginBottom: 16 }} />
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Verification Failed</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 28 }}>{message}</p>

            {!resent ? (
              <>
                <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 12 }}>
                  Enter your email to get a new verification link:
                </p>
                <form onSubmit={handleResend} style={{ display: 'flex', gap: 8 }}>
                  <div className="input-group" style={{ flex: 1 }}>
                    <MdEmail className="input-icon" />
                    <input className="form-control" type="email" placeholder="your@email.com"
                      value={resendEmail} onChange={e => setResendEmail(e.target.value)} required />
                  </div>
                  <button className="btn btn-primary" type="submit" disabled={resending}>
                    {resending ? '...' : 'Resend'}
                  </button>
                </form>
              </>
            ) : (
              <div className="alert alert-success">
                <div className="alert-text">Verification email sent! Check your inbox.</div>
              </div>
            )}

            <Link to="/login" style={{ display: 'block', marginTop: 20, color: 'var(--accent)', fontSize: 14 }}>
              Back to Sign In
            </Link>
          </>
        )}
      </div>
    </div>
  );
}