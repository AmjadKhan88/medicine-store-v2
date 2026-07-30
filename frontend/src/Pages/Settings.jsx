import { useState } from 'react';
import TwoFactorSetup from './TwoFactorSetup';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { PushNotificationToggle } from '../Components/PWAInstallBanner';
import { usePWA } from '../hooks/usePWA';
import { useNavVisibility } from '../context/NavVisibilityContext';
import { ALL_NAV_ITEMS, ALL_ALERT_ITEMS } from '../Components/Layout';
import { ALWAYS_VISIBLE_NAV } from '../context/NavVisibilityContext';
import { MdGetApp, MdLock, MdSave, MdRefresh, MdVisibility, MdVisibilityOff } from 'react-icons/md';
import toast from 'react-hot-toast';
import API from '../utils/api';

const defaultProfile = {
  name: '', address: '', phone: '', email: '', license: '', doctor: '',
};

/* ── Nav groups config ── */
const NAV_GROUPS = [
  {
    id:    'core',
    label: '🔒 Core',
    desc:  'Always visible — cannot be hidden',
    locked: true,
    color: '#6b7280',
  },
  {
    id:    'pharmacy',
    label: '💊 Pharmacy',
    desc:  'Medicine, patient and billing features',
    color: '#0ea5e9',
  },
  {
    id:    'hospital',
    label: '🏥 Hospital',
    desc:  'IPD, OPD, wards, nursing and clinical features',
    color: '#10b981',
  },
  {
    id:    'finance',
    label: '💰 Finance',
    desc:  'Accounting, insurance and payroll',
    color: '#f59e0b',
  },
  {
    id:    'communication',
    label: '📲 Communication',
    desc:  'Broadcast, feedback and online booking',
    color: '#8b5cf6',
  },
  {
    id:    'ai',
    label: '🤖 AI & Tools',
    desc:  'AI-powered features and smart tools',
    color: '#ec4899',
  },
  {
    id:    'management',
    label: '📊 Management',
    desc:  'Reports, staff, backup and system settings',
    color: '#64748b',
  },
];

/* ── Toggle switch component ── */
function Toggle({ on, onChange, disabled }) {
  return (
    <div
      onClick={() => !disabled && onChange(!on)}
      style={{
        width: 44, height: 24, borderRadius: 99,
        background: disabled ? '#e2e8f0' : on ? '#10b981' : '#cbd5e1',
        position: 'relative', cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background 0.2s', flexShrink: 0,
      }}
    >
      <div style={{
        width: 18, height: 18, borderRadius: '50%', background: '#fff',
        position: 'absolute', top: 3,
        left: on ? 23 : 3,
        transition: 'left 0.2s',
        boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
      }} />
    </div>
  );
}

/* ── Tab definition ── */
const TABS = [
  { id: 'store',      label: 'Store',      icon: '🏪' },
  { id: 'account',    label: 'Account',    icon: '👤' },
  { id: 'security',   label: 'Security',   icon: '🔒' },
  { id: 'appearance', label: 'Appearance', icon: '🎨' },
  { id: 'navigation', label: 'Navigation', icon: '🧭' },
  { id: 'app',        label: 'Mobile App', icon: '📱' },
];

export default function Settings() {
  const { user, setUser } = useAuth();
  const { theme, setSpecificTheme } = useTheme();
  const { isVisible, toggle, setGroupVisible, reset, hiddenCount } = useNavVisibility();

  const [activeTab, setActiveTab] = useState('store');
  const [profile, setProfile] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const { canInstall, isInstalled, triggerInstall } = usePWA();

  const [store, setStore] = useState(() => {
    try { return JSON.parse(localStorage.getItem('medistore_profile')) || defaultProfile; }
    catch { return defaultProfile; }
  });
  const [savingStore, setSavingStore] = useState(false);

  /* ── All nav items combined for the toggle UI ── */
  const allItems = [
    ...ALL_NAV_ITEMS,
    ...ALL_ALERT_ITEMS,
  ];

  /* ── Save handlers ── */
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
        newPassword:     passwords.newPassword,
      });
      toast.success('Password changed!');
      setPasswords({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSavingPw(false); }
  };

  const saveStore = async (e) => {
    e.preventDefault(); setSavingStore(true);
    try {
      localStorage.setItem('medistore_profile', JSON.stringify(store));
      const { data } = await API.put('/auth/profile', {
        name: user.name, phone: store.phone || user.phone, storeName: store.name,
      });
      setUser(data.user);
      localStorage.setItem('medistore_user', JSON.stringify(data.user));
      toast.success('Store profile saved!');
    } catch { toast.error('Failed to save'); }
    finally { setSavingStore(false); }
  };

  const themes = [
    { id: 'light',  label: 'Light',  colors: ['#f8fafc', '#0ea5e9'] },
    { id: 'dark',   label: 'Dark',   colors: ['#111827', '#38bdf8'] },
    { id: 'teal',   label: 'Teal',   colors: ['#f0fdf9', '#0d9488'] },
    { id: 'purple', label: 'Purple', colors: ['#faf5ff', '#7c3aed'] },
  ];

  /* ── Handle group show/hide all ── */
  const handleGroupToggle = (groupId, value) => {
    const paths = allItems
      .filter(i => i.group === groupId && !ALWAYS_VISIBLE_NAV.includes(i.to))
      .map(i => i.to);
    setGroupVisible(paths, value);
  };

  const isGroupAllVisible = (groupId) =>
    allItems.filter(i => i.group === groupId).every(i => isVisible(i.to));

  return (
    <div style={{ maxWidth: 820 }}>
      {/* ── Page header ── */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>Settings</h1>
          <p>Manage your store, account and security preferences</p>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div style={{
        display: 'flex', gap: 2, marginBottom: 24,
        borderBottom: '2px solid var(--border)',
        overflowX: 'auto',
      }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '10px 16px',
              background: 'none', border: 'none',
              borderBottom: activeTab === tab.id
                ? '2px solid var(--accent)'
                : '2px solid transparent',
              marginBottom: -2,
              color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-muted)',
              fontWeight: activeTab === tab.id ? 700 : 500,
              fontSize: 13, cursor: 'pointer',
              fontFamily: 'var(--font-main)',
              whiteSpace: 'nowrap',
              transition: 'color 0.15s',
              position: 'relative',
            }}
          >
            <span>{tab.icon}</span>
            {tab.label}
            {/* Badge on Navigation tab showing hidden count */}
            {tab.id === 'navigation' && hiddenCount > 0 && (
              <span style={{
                background: 'var(--accent)', color: '#fff',
                fontSize: 10, fontWeight: 700,
                padding: '1px 6px', borderRadius: 99,
                marginLeft: 2,
              }}>
                {hiddenCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ════════════════════════════
          TAB: STORE
      ════════════════════════════ */}
      {activeTab === 'store' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">🏪 Store / Clinic Profile</div>
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
            <div className="card-title">👤 Account Profile</div>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '14px 16px', background: 'var(--bg-tertiary)',
            borderRadius: 12, marginBottom: 20,
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: 'var(--accent)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, fontWeight: 800, flexShrink: 0,
            }}>
              {user?.name?.[0]?.toUpperCase() || '?'}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{user?.name}</div>
              <div className="text-muted text-sm">{user?.email}</div>
              <span style={{
                display: 'inline-block', marginTop: 4,
                background: 'var(--accent-light)', color: 'var(--accent)',
                fontSize: 11, fontWeight: 700, padding: '2px 10px',
                borderRadius: 99, textTransform: 'capitalize',
              }}>
                {user?.role}
              </span>
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
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <div className="card-title">🔑 Change Password</div>
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
                    required minLength={6} placeholder="Min 6 characters" />
                </div>
                <div className="form-group">
                  <label className="form-label required">Confirm New Password</label>
                  <input className="form-control" type="password"
                    value={passwords.confirm}
                    onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))} required />
                </div>
              </div>
              {passwords.newPassword.length > 0 && (
                <div style={{ fontSize: 12, marginBottom: 14, fontWeight: 600 }}>
                  <span style={{ color: passwords.newPassword.length >= 8 ? 'var(--success)' : 'var(--warning)' }}>
                    {passwords.newPassword.length >= 8 ? '✓ Strong password' : `${passwords.newPassword.length}/8 characters`}
                  </span>
                  {passwords.confirm && passwords.confirm !== passwords.newPassword && (
                    <span style={{ color: 'var(--danger)', marginLeft: 12 }}>✗ Don't match</span>
                  )}
                  {passwords.confirm && passwords.confirm === passwords.newPassword && (
                    <span style={{ color: 'var(--success)', marginLeft: 12 }}>✓ Passwords match</span>
                  )}
                </div>
              )}
              <button className="btn btn-primary" type="submit" disabled={savingPw}>
                <MdLock size={16} /> {savingPw ? 'Updating...' : 'Change Password'}
              </button>
            </form>
          </div>
          <TwoFactorSetup />
        </div>
      )}

      {/* ════════════════════════════
          TAB: APPEARANCE
      ════════════════════════════ */}
      {activeTab === 'appearance' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">🎨 Appearance</div>
          </div>
          <p className="text-muted text-sm" style={{ marginBottom: 20 }}>
            Choose your preferred colour theme for the dashboard.
          </p>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            {themes.map(t => (
              <div key={t.id} onClick={() => setSpecificTheme(t.id)} style={{
                cursor: 'pointer', borderRadius: 14, overflow: 'hidden',
                border: `2px solid ${theme === t.id ? 'var(--accent)' : 'var(--border)'}`,
                boxShadow: theme === t.id ? '0 0 0 3px var(--accent-light)' : 'none',
                transition: 'var(--transition)', width: 90,
              }}>
                <div style={{
                  height: 52, background: t.colors[0],
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%',
                    background: t.colors[1], boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                  }} />
                </div>
                <div style={{
                  padding: '8px 0', textAlign: 'center', fontSize: 12, fontWeight: 600,
                  color: theme === t.id ? 'var(--accent)' : 'var(--text-muted)',
                  background: 'var(--card-bg)',
                }}>
                  {theme === t.id && '✓ '}{t.label}
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
          TAB: NAVIGATION
      ════════════════════════════ */}
      {activeTab === 'navigation' && (
        <div>
          {/* Header card */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
                  🧭 Sidebar Navigation
                </div>
                <div className="text-muted text-sm" style={{ lineHeight: 1.6 }}>
                  Toggle which pages appear in your sidebar — like browser extensions.
                  Hidden pages are still accessible via URL. Preferences saved in this browser.
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                {hiddenCount > 0 && (
                  <div style={{
                    background: 'var(--accent-light)', color: 'var(--accent)',
                    fontSize: 12, fontWeight: 700, padding: '6px 12px',
                    borderRadius: 99, display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    <MdVisibilityOff size={14} />
                    {hiddenCount} hidden
                  </div>
                )}
                <button className="btn btn-secondary btn-sm" onClick={() => {
                  reset();
                  toast.success('All navigation items restored!');
                }}>
                  <MdRefresh size={14} /> Reset All
                </button>
              </div>
            </div>
          </div>

          {/* Group sections */}
          {NAV_GROUPS.map(group => {
            const groupItems = allItems.filter(i => i.group === group.id);
            if (!groupItems.length) return null;

            const allOn  = isGroupAllVisible(group.id);
            const someOff = groupItems.some(i => !isVisible(i.to));

            return (
              <div key={group.id} style={{ marginBottom: 16 }}>
                {/* Group header */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: 'var(--bg-tertiary)',
                  borderRadius: '10px 10px 0 0',
                  borderBottom: '1px solid var(--border)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: group.color, flexShrink: 0,
                    }} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{group.label}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{group.desc}</div>
                    </div>
                  </div>

                  {/* Group-level show/hide all — skip for locked groups */}
                  {!group.locked && (
                    <button
                      onClick={() => handleGroupToggle(group.id, !allOn)}
                      style={{
                        background: 'none', border: `1px solid var(--border)`,
                        borderRadius: 8, padding: '4px 12px', cursor: 'pointer',
                        fontSize: 12, fontWeight: 600,
                        color: allOn ? 'var(--text-muted)' : 'var(--accent)',
                        display: 'flex', alignItems: 'center', gap: 5,
                        fontFamily: 'var(--font-main)',
                      }}
                    >
                      {allOn
                        ? <><MdVisibilityOff size={13} /> Hide All</>
                        : <><MdVisibility size={13} /> Show All</>}
                    </button>
                  )}
                </div>

                {/* Items */}
                <div style={{
                  border: '1px solid var(--border)',
                  borderTop: 'none',
                  borderRadius: '0 0 10px 10px',
                  overflow: 'hidden',
                  background: 'var(--card-bg)',
                }}>
                  {groupItems.map((item, idx) => {
                    const locked  = ALWAYS_VISIBLE_NAV.includes(item.to) || group.locked;
                    const visible = isVisible(item.to);

                    return (
                      <div
                        key={item.to}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 14,
                          padding: '12px 16px',
                          borderBottom: idx < groupItems.length - 1 ? '1px solid var(--border-light)' : 'none',
                          background: !visible ? 'var(--bg-tertiary)' : 'transparent',
                          opacity: !visible ? 0.6 : 1,
                          transition: 'all 0.15s',
                        }}
                      >
                        {/* Icon */}
                        <div style={{
                          width: 36, height: 36, borderRadius: 10,
                          background: visible
                            ? `${group.color}18`
                            : 'var(--bg-tertiary)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 18, flexShrink: 0,
                          border: `1px solid ${visible ? group.color + '30' : 'var(--border)'}`,
                          transition: 'all 0.15s',
                        }}>
                          {item.icon}
                        </div>

                        {/* Label + path */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontWeight: 600, fontSize: 14,
                            color: visible ? 'var(--text-primary)' : 'var(--text-muted)',
                          }}>
                            {item.label}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                            {item.to}
                          </div>
                        </div>

                        {/* Status badge */}
                        <div style={{
                          fontSize: 11, fontWeight: 600,
                          color: locked
                            ? '#6b7280'
                            : visible ? '#10b981' : '#94a3b8',
                          minWidth: 48, textAlign: 'center',
                        }}>
                          {locked ? '🔒 Fixed' : visible ? 'Visible' : 'Hidden'}
                        </div>

                        {/* Toggle */}
                        <Toggle
                          on={visible}
                          disabled={locked}
                          onChange={() => {
                            toggle(item.to);
                            toast.success(
                              visible
                                ? `"${item.label}" hidden from sidebar`
                                : `"${item.label}" shown in sidebar`,
                              { duration: 1500 }
                            );
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Info footer */}
          <div style={{
            padding: '12px 16px', borderRadius: 10,
            background: 'var(--bg-tertiary)', fontSize: 12,
            color: 'var(--text-muted)', lineHeight: 1.7,
          }}>
            💡 <strong>Tip:</strong> Only a pharmacy? Hide the Hospital group. Finance only? Hide Communication.
            Preferences are saved in <strong>this browser</strong> only — each device can have different settings.
          </div>
        </div>
      )}

      {/* ════════════════════════════
          TAB: MOBILE APP
      ════════════════════════════ */}
      {activeTab === 'app' && (
        <div>
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <div className="card-title">📱 Install App</div>
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
                <div>🍎 <strong>iOS Safari:</strong> Tap Share → "Add to Home Screen"</div>
                <div>🤖 <strong>Android Chrome:</strong> Tap ⋮ → "Add to Home Screen"</div>
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">🔔 Push Notifications</div>
            </div>
            <PushNotificationToggle />
          </div>
        </div>
      )}
    </div>
  );
}
