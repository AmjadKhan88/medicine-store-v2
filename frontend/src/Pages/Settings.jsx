import { useState } from 'react';
import TwoFactorSetup from './TwoFactorSetup';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { PushNotificationToggle } from '../Components/PWAInstallBanner';
import { usePWA } from '../hooks/usePWA';
import { MdGetApp, MdPhoneIphone, MdPerson, MdLock, MdPalette, MdStore, MdSave } from 'react-icons/md';
import toast from 'react-hot-toast';
import API from '../utils/api';

const defaultProfile = {
  name: '', address: '', phone: '', email: '', license: '', doctor: '',
};

export default function Settings() {
  const { user, setUser } = useAuth();
  const { theme, setSpecificTheme } = useTheme();

  const [profile, setProfile] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const { canInstall, isInstalled, triggerInstall } = usePWA();

  // Store profile — stored in localStorage
  const [store, setStore] = useState(() => {
    try { return JSON.parse(localStorage.getItem('medistore_profile')) || defaultProfile; }
    catch { return defaultProfile; }
  });
  const [savingStore, setSavingStore] = useState(false);

  const saveProfile = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const { data } = await API.put('/auth/profile', profile);
      setUser(data.user);
      localStorage.setItem('medistore_user', JSON.stringify(data.user));
      toast.success('Profile updated!');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirm) return toast.error('Passwords do not match');
    if (passwords.newPassword.length < 6) return toast.error('Min 6 characters');
    setSavingPw(true);
    try {
      await API.put('/auth/change-password', {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      toast.success('Password changed!');
      setPasswords({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSavingPw(false); }
  };

  const saveStore = async (e) => {
    e.preventDefault();
    setSavingStore(true);
    try {
      // Save to localStorage (for PDF usage)
      localStorage.setItem('medistore_profile', JSON.stringify(store));

      // Save storeName + phone to backend (for email usage in server-side jobs)
      const { data } = await API.put('/auth/profile', {
        name: user.name,
        phone: store.phone || user.phone,
        storeName: store.name,
      });
      setUser(data.user);
      localStorage.setItem('medistore_user', JSON.stringify(data.user));

      toast.success('Store profile saved! It will appear on all invoices and emails.');
    } catch (err) {
      toast.error('Failed to save');
    } finally {
      setSavingStore(false);
    }
  };

  const themes = [
    { id: 'light', label: 'Light', colors: ['#f8fafc', '#0ea5e9'] },
    { id: 'dark', label: 'Dark', colors: ['#111827', '#38bdf8'] },
    { id: 'teal', label: 'Teal', colors: ['#f0fdf9', '#0d9488'] },
    { id: 'purple', label: 'Purple', colors: ['#faf5ff', '#7c3aed'] },
  ];

  return (
    <div style={{ maxWidth: 720 }}>
      <div className="page-header">
        <div className="page-header-left">
          <h1>Settings</h1>
          <p>Manage your account, store profile and preferences</p>
        </div>
      </div>

      {/* ── Store / Clinic Profile ── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MdStore /> Store / Clinic Profile
          </div>
        </div>
        <div
          style={{
            background: 'var(--accent-light)', border: '1px solid var(--accent)',
            borderRadius: 10, padding: '10px 14px', marginBottom: 18, fontSize: 13,
            color: 'var(--accent)',
          }}
        >
          💡 This information appears on every printed invoice PDF — make sure it's accurate.
        </div>
        <form onSubmit={saveStore}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label required">Store / Pharmacy Name</label>
              <input className="form-control" value={store.name}
                onChange={e => setStore(p => ({ ...p, name: e.target.value }))}
                placeholder="Al-Shifa Pharmacy" required />
            </div>
            <div className="form-group">
              <label className="form-label">Doctor / Owner Name</label>
              <input className="form-control" value={store.doctor}
                onChange={e => setStore(p => ({ ...p, doctor: e.target.value }))}
                placeholder="Dr. Ahmad Khan" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label required">Address</label>
            <input className="form-control" value={store.address}
              onChange={e => setStore(p => ({ ...p, address: e.target.value }))}
              placeholder="Shop #5, Saddar Road, Peshawar, KPK" required />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label required">Phone Number</label>
              <input className="form-control" value={store.phone}
                onChange={e => setStore(p => ({ ...p, phone: e.target.value }))}
                placeholder="0300-1234567" required />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-control" type="email" value={store.email}
                onChange={e => setStore(p => ({ ...p, email: e.target.value }))}
                placeholder="pharmacy@email.com" />
            </div>
            <div className="form-group">
              <label className="form-label">Drug License No.</label>
              <input className="form-control" value={store.license}
                onChange={e => setStore(p => ({ ...p, license: e.target.value }))}
                placeholder="DL-KPK-12345" />
            </div>
          </div>
          <button className="btn btn-primary" type="submit" disabled={savingStore}>
            <MdSave /> {savingStore ? 'Saving...' : 'Save Store Profile'}
          </button>
        </form>
      </div>

      {/* PWA Section */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MdPhoneIphone /> Mobile App
          </div>
        </div>

        {/* Install App */}
        <div style={{ marginBottom: 16 }}>
          {isInstalled ? (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 16px', background: 'var(--success-bg)',
              border: '1px solid var(--success)', borderRadius: 12,
            }}>
              <span style={{ fontSize: 22 }}>✓</span>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--success)' }}>App is Installed</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>MediStore is running as an installed app</div>
              </div>
            </div>
          ) : canInstall ? (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 16px', background: 'var(--bg-tertiary)',
              border: '1px solid var(--border)', borderRadius: 12,
            }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Install MediStore App</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  Works offline · Faster access · Home screen shortcut
                </div>
              </div>
              <button className="btn btn-primary btn-sm" onClick={triggerInstall}>
                <MdGetApp /> Install
              </button>
            </div>
          ) : (
            <div style={{
              padding: '12px 16px', background: 'var(--bg-tertiary)',
              border: '1px solid var(--border)', borderRadius: 12,
              fontSize: 13, color: 'var(--text-muted)',
            }}>
              <strong>iOS:</strong> Tap Share → Add to Home Screen<br />
              <strong>Android:</strong> Tap menu → Add to Home Screen
            </div>
          )}
        </div>

        {/* Push notifications */}
        <PushNotificationToggle />
      </div>

      {/* ── Appearance ── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MdPalette /> Appearance
          </div>
        </div>
        <p className="text-muted text-sm" style={{ marginBottom: 16 }}>Choose your preferred theme</p>
        <div className="flex gap-3">
          {themes.map(t => (
            <div key={t.id} onClick={() => setSpecificTheme(t.id)}
              style={{
                cursor: 'pointer', borderRadius: 12, overflow: 'hidden',
                border: `2px solid ${theme === t.id ? 'var(--accent)' : 'var(--border)'}`,
                transition: 'var(--transition)', width: 80,
              }}>
              <div style={{ height: 40, background: t.colors[0], display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: t.colors[1] }} />
              </div>
              <div style={{
                padding: '6px 0', textAlign: 'center', fontSize: 12, fontWeight: 600,
                color: theme === t.id ? 'var(--accent)' : 'var(--text-muted)',
              }}>{t.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Account Profile ── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MdPerson /> Account Profile
          </div>
        </div>
        <div style={{ marginBottom: 16, padding: 14, background: 'var(--bg-tertiary)', borderRadius: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{user?.name}</div>
          <div className="text-muted text-sm">{user?.email} · {user?.role}</div>
        </div>
        <form onSubmit={saveProfile}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-control" value={profile.name}
                onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input className="form-control" value={profile.phone}
                onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
                placeholder="0300-1234567" />
            </div>
          </div>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </div>

      {/* ── Change Password ── */}
      <div className="card">
        <div className="card-header">
          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MdLock /> Change Password
          </div>
        </div>
        <form onSubmit={savePassword}>
          <div className="form-group">
            <label className="form-label required">Current Password</label>
            <input className="form-control" type="password"
              value={passwords.currentPassword}
              onChange={e => setPasswords(p => ({ ...p, currentPassword: e.target.value }))} required />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label required">New Password</label>
              <input className="form-control" type="password"
                value={passwords.newPassword}
                onChange={e => setPasswords(p => ({ ...p, newPassword: e.target.value }))}
                required minLength={6} />
            </div>
            <div className="form-group">
              <label className="form-label required">Confirm Password</label>
              <input className="form-control" type="password"
                value={passwords.confirm}
                onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))} required />
            </div>
          </div>
          <button className="btn btn-primary" type="submit" disabled={savingPw}>
            {savingPw ? 'Updating...' : 'Change Password'}
          </button>
        </form>
      </div>
      <div style={{ marginTop: 24 }}>
      <TwoFactorSetup />
      </div>
    </div>
  );
}