import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { MdSettings, MdPerson, MdLock, MdPalette } from 'react-icons/md';
import toast from 'react-hot-toast';
import API from '../utils/api';

export default function Settings() {
  const { user, setUser } = useAuth();
  const { theme, setSpecificTheme } = useTheme();
  const [profile, setProfile] = useState({ name: user?.name||'', phone: user?.phone||'' });
  const [passwords, setPasswords] = useState({ currentPassword:'', newPassword:'', confirm:'' });
  const [saving, setSaving] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  const saveProfile = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const { data } = await API.put('/auth/profile', profile);
      setUser(data.user); localStorage.setItem('medistore_user', JSON.stringify(data.user));
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
      await API.put('/auth/change-password', { currentPassword: passwords.currentPassword, newPassword: passwords.newPassword });
      toast.success('Password changed!'); setPasswords({ currentPassword:'', newPassword:'', confirm:'' });
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSavingPw(false); }
  };

  const themes = [
    { id:'light', label:'Light', colors:['#f8fafc','#0ea5e9'] },
    { id:'dark', label:'Dark', colors:['#111827','#38bdf8'] },
    { id:'teal', label:'Teal', colors:['#f0fdf9','#0d9488'] },
    { id:'purple', label:'Purple', colors:['#faf5ff','#7c3aed'] },
  ];

  return (
    <div style={{ maxWidth:700 }}>
      <div className="page-header">
        <div className="page-header-left"><h1>Settings</h1><p>Manage your account and preferences</p></div>
      </div>

      {/* Theme */}
      <div className="card" style={{ marginBottom:20 }}>
        <div className="card-header"><div className="card-title" style={{ display:'flex', alignItems:'center', gap:8 }}><MdPalette /> Appearance</div></div>
        <p className="text-muted text-sm" style={{ marginBottom:16 }}>Choose your preferred theme</p>
        <div className="flex gap-3">
          {themes.map(t => (
            <div key={t.id} onClick={() => setSpecificTheme(t.id)}
              style={{ cursor:'pointer', borderRadius:12, overflow:'hidden', border:`2px solid ${theme===t.id?'var(--accent)':'var(--border)'}`, transition:'var(--transition)', width:80 }}>
              <div style={{ height:40, background:t.colors[0], display:'flex', alignItems:'center', justifyContent:'center' }}>
                <div style={{ width:20, height:20, borderRadius:'50%', background:t.colors[1] }} />
              </div>
              <div style={{ padding:'6px 0', textAlign:'center', fontSize:12, fontWeight:600, color:theme===t.id?'var(--accent)':'var(--text-muted)' }}>{t.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Profile */}
      <div className="card" style={{ marginBottom:20 }}>
        <div className="card-header"><div className="card-title" style={{ display:'flex', alignItems:'center', gap:8 }}><MdPerson /> Profile</div></div>
        <div style={{ marginBottom:16, padding:16, background:'var(--bg-tertiary)', borderRadius:10 }}>
          <div style={{ fontWeight:700, fontSize:16 }}>{user?.name}</div>
          <div className="text-muted text-sm">{user?.email} · {user?.role}</div>
        </div>
        <form onSubmit={saveProfile}>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Full Name</label><input className="form-control" value={profile.name} onChange={e => setProfile(p=>({...p,name:e.target.value}))} required /></div>
            <div className="form-group"><label className="form-label">Phone Number</label><input className="form-control" value={profile.phone} onChange={e => setProfile(p=>({...p,phone:e.target.value}))} placeholder="0300-1234567" /></div>
          </div>
          <button className="btn btn-primary" type="submit" disabled={saving}>{saving?'Saving...':'Save Profile'}</button>
        </form>
      </div>

      {/* Password */}
      <div className="card">
        <div className="card-header"><div className="card-title" style={{ display:'flex', alignItems:'center', gap:8 }}><MdLock /> Change Password</div></div>
        <form onSubmit={savePassword}>
          <div className="form-group"><label className="form-label required">Current Password</label><input className="form-control" type="password" value={passwords.currentPassword} onChange={e => setPasswords(p=>({...p,currentPassword:e.target.value}))} required /></div>
          <div className="form-row">
            <div className="form-group"><label className="form-label required">New Password</label><input className="form-control" type="password" value={passwords.newPassword} onChange={e => setPasswords(p=>({...p,newPassword:e.target.value}))} required minLength={6} /></div>
            <div className="form-group"><label className="form-label required">Confirm Password</label><input className="form-control" type="password" value={passwords.confirm} onChange={e => setPasswords(p=>({...p,confirm:e.target.value}))} required /></div>
          </div>
          <button className="btn btn-primary" type="submit" disabled={savingPw}>{savingPw?'Updating...':'Change Password'}</button>
        </form>
      </div>
    </div>
  );
}
