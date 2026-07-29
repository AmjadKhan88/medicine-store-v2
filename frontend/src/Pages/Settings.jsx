import { useState } from 'react';
import TwoFactorSetup from './TwoFactorSetup';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { PushNotificationToggle } from '../Components/PWAInstallBanner';
import { usePWA } from '../hooks/usePWA';
import { MdGetApp, MdLock, MdSave} from 'react-icons/md';
import toast from 'react-hot-toast';
import API from '../utils/api';

const defaultProfile = {
  name: '', address: '', phone: '', email: '', license: '', doctor: '',
};

/* ── Tab definition ── */
const TABS = [
  { id: 'store',      label: 'Store',      icon: '🏪' },
  { id: 'account',    label: 'Account',    icon: '👤' },
  { id: 'security',   label: 'Security',   icon: '🔒' },
  { id: 'appearance', label: 'Appearance', icon: '🎨' },
  { id: 'app',        label: 'Mobile App', icon: '📱' },
];

export default function Settings() {
  const { user, setUser } = useAuth();
  const { theme, setSpecificTheme } = useTheme();

  const [activeTab, setActiveTab] = useState('store');
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
    <div style={{ maxWidth: 780 }}>
      {/* ── Page header ── */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>Settings</h1>
          <p>Manage your store, account and security preferences</p>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 24,
        borderBottom: '2px solid var(--border)',
        overflowX: 'auto', paddingBottom: 0,
      }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '10px 18px',
              background: 'none', border: 'none',
              borderBottom: activeTab === tab.id
                ? '2px solid var(--accent)'
                : '2px solid transparent',
              marginBottom: -2,
              color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-muted)',
              fontWeight: activeTab === tab.id ? 700 : 500,
              fontSize: 14, cursor: 'pointer',
              fontFamily: 'var(--font-main)',
              whiteSpace: 'nowrap',
              transition: 'color 0.15s',
            }}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ════════════════════════════
          TAB: STORE
      ════════════════════════════ */}
      {activeTab === 'store' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              🏪 Store / Clinic Profile
            </div>
          </div>
          <div style={{
            background: 'var(--accent-light)', border: '1px solid var(--accent)',
            borderRadius: 10, padding: '10px 14px', marginBottom: 18, fontSize: 13,
            color: 'var(--accent)',
          }}>
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
      )}

      {/* ════════════════════════════
          TAB: ACCOUNT
      ════════════════════════════ */}
      {activeTab === 'account' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              👤 Account Profile
            </div>
          </div>

          {/* User info chip */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '14px 16px', background: 'var(--bg-tertiary)',
            borderRadius: 12, marginBottom: 20,
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: 'var(--accent)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, fontWeight: 800, flexShrink: 0,
            }}>
              {user?.name?.[0]?.toUpperCase() || '?'}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{user?.name}</div>
              <div className="text-muted text-sm">{user?.email}</div>
              <div style={{
                display: 'inline-block', marginTop: 4,
                background: 'var(--accent-light)', color: 'var(--accent)',
                fontSize: 11, fontWeight: 700, padding: '2px 10px',
                borderRadius: 99, textTransform: 'capitalize',
              }}>
                {user?.role}
              </div>
            </div>
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
              <MdSave /> {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </div>
      )}

      {/* ════════════════════════════
          TAB: SECURITY
      ════════════════════════════ */}
      {activeTab === 'security' && (
        <div>
          {/* Change Password card */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                🔑 Change Password
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
                    required minLength={6}
                    placeholder="Min 6 characters" />
                </div>
                <div className="form-group">
                  <label className="form-label required">Confirm New Password</label>
                  <input className="form-control" type="password"
                    value={passwords.confirm}
                    onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))} required />
                </div>
              </div>
              {/* Password strength hint */}
              {passwords.newPassword.length > 0 && (
                <div style={{
                  fontSize: 12, marginBottom: 14, fontWeight: 600,
                  color: passwords.newPassword.length >= 8 ? 'var(--success)' : 'var(--warning)',
                }}>
                  {passwords.newPassword.length >= 8
                    ? '✓ Strong password'
                    : `Password strength: ${passwords.newPassword.length}/8 characters`}
                  {passwords.confirm && passwords.confirm !== passwords.newPassword && (
                    <span style={{ color: 'var(--danger)', marginLeft: 16 }}>✗ Passwords don't match</span>
                  )}
                  {passwords.confirm && passwords.confirm === passwords.newPassword && (
                    <span style={{ color: 'var(--success)', marginLeft: 16 }}>✓ Passwords match</span>
                  )}
                </div>
              )}
              <button className="btn btn-primary" type="submit" disabled={savingPw}>
                <MdLock size={16} /> {savingPw ? 'Updating...' : 'Change Password'}
              </button>
            </form>
          </div>

          {/* Two-Factor Auth card */}
          <TwoFactorSetup />
        </div>
      )}

      {/* ════════════════════════════
          TAB: APPEARANCE
      ════════════════════════════ */}
      {activeTab === 'appearance' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              🎨 Appearance
            </div>
          </div>
          <p className="text-muted text-sm" style={{ marginBottom: 20 }}>
            Choose your preferred colour theme for the dashboard.
          </p>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            {themes.map(t => (
              <div
                key={t.id}
                onClick={() => setSpecificTheme(t.id)}
                style={{
                  cursor: 'pointer', borderRadius: 14, overflow: 'hidden',
                  border: `2px solid ${theme === t.id ? 'var(--accent)' : 'var(--border)'}`,
                  boxShadow: theme === t.id ? '0 0 0 3px var(--accent-light)' : 'none',
                  transition: 'var(--transition)', width: 90,
                }}
              >
                <div style={{
                  height: 52, background: t.colors[0],
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%',
                    background: t.colors[1],
                    boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                  }} />
                </div>
                <div style={{
                  padding: '8px 0', textAlign: 'center', fontSize: 12, fontWeight: 600,
                  color: theme === t.id ? 'var(--accent)' : 'var(--text-muted)',
                  background: 'var(--card-bg)',
                }}>
                  {theme === t.id && <span style={{ marginRight: 4 }}>✓</span>}
                  {t.label}
                </div>
              </div>
            ))}
          </div>

          <div style={{
            marginTop: 24, padding: '12px 16px',
            background: 'var(--bg-tertiary)', borderRadius: 10,
            fontSize: 13, color: 'var(--text-muted)',
          }}>
            💡 Theme is saved automatically and synced across your browser tabs.
          </div>
        </div>
      )}

      {/* ════════════════════════════
          TAB: MOBILE APP
      ════════════════════════════ */}
      {activeTab === 'app' && (
        <div>
          {/* Install PWA card */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                📱 Install App
              </div>
            </div>
            {isInstalled ? (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '16px', background: 'var(--success-bg)',
                border: '1px solid var(--success)', borderRadius: 12,
              }}>
                <span style={{ fontSize: 32 }}>✅</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--success)' }}>App is Installed</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                    MediStore is running as an installed app on this device.
                  </div>
                </div>
              </div>
            ) : canInstall ? (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px', background: 'var(--bg-tertiary)',
                border: '1px solid var(--border)', borderRadius: 12, gap: 16,
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Install MediStore App</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                    ✓ Works offline &nbsp;·&nbsp; ✓ Faster access &nbsp;·&nbsp; ✓ Home screen shortcut
                  </div>
                </div>
                <button className="btn btn-primary" onClick={triggerInstall} style={{ flexShrink: 0 }}>
                  <MdGetApp /> Install
                </button>
              </div>
            ) : (
              <div style={{
                padding: '14px 16px', background: 'var(--bg-tertiary)',
                border: '1px solid var(--border)', borderRadius: 12,
                fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.8,
              }}>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>Manual Installation:</div>
                <div>🍎 <strong>iOS Safari:</strong> Tap the Share icon → "Add to Home Screen"</div>
                <div>🤖 <strong>Android Chrome:</strong> Tap menu (⋮) → "Add to Home Screen"</div>
              </div>
            )}
          </div>

          {/* Push notifications card */}
          <div className="card">
            <div className="card-header">
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                🔔 Push Notifications
              </div>
            </div>
            <PushNotificationToggle />
          </div>
        </div>
      )}
    </div>
  );
}