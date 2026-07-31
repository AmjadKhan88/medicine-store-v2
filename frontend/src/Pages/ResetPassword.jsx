import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { MdLock, MdCheckCircle } from 'react-icons/md';
import toast from 'react-hot-toast';
import API from '../utils/api';

export default function ResetPassword() {
  const [params]    = useSearchParams();
  const navigate    = useNavigate();
  const token       = params.get('token');

  const [form, setForm]     = useState({ password: '', confirm: '' });
  const [done, setDone]     = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) { toast.error('Passwords do not match'); return; }
    if (form.password.length < 6)       { toast.error('Min 6 characters'); return; }
    setLoading(true);
    try {
      await API.post('/auth/reset-password', { token, newPassword: form.password });
      setDone(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reset failed');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', padding: 20 }}>
      <div style={{ background: 'var(--card-bg)', borderRadius: 20, padding: 44, maxWidth: 420, width: '100%', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xl)' }}>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 32, textAlign: 'center' }}>
          Medi<span style={{ color: 'var(--accent)' }}>Store</span>
        </div>

        {!done ? (
          <>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Set New Password</h2>
            <p className="text-muted text-sm" style={{ marginBottom: 28 }}>Choose a strong password for your account.</p>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label required">New Password</label>
                <div className="input-group">
                  <MdLock className="input-icon" />
                  <input className="form-control" type="password" placeholder="Min 6 characters"
                    value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required minLength={6} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label required">Confirm Password</label>
                <div className="input-group">
                  <MdLock className="input-icon" />
                  <input className="form-control" type="password" placeholder="Repeat password"
                    value={form.confirm} onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))} required />
                </div>
              </div>
              <button className="btn btn-primary w-full btn-lg" type="submit" disabled={loading}>
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          </>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <MdCheckCircle size={56} style={{ color: 'var(--success)', marginBottom: 16 }} />
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Password Reset!</h2>
            <p className="text-muted text-sm" style={{ marginBottom: 28 }}>Your password has been updated successfully.</p>
            <button className="btn btn-primary w-full" onClick={() => navigate('/login')}>
              Go to Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  );
}