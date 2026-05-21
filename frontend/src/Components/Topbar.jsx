import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import toast from 'react-hot-toast'

export default function Topbar({ onMenuClick }) {
  const { user, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    toast.success('Logged out successfully')
    navigate('/login')
  }

  const themes = [
    { value:'light', icon:'☀️', label:'Light' },
    { value:'dark', icon:'🌙', label:'Dark' },
  ]

  return (
    <header className="topbar">
      <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
        <button className="btn btn-ghost btn-icon" onClick={onMenuClick} style={{ display:'none' }} id="menu-btn" aria-label="Menu">☰</button>
        <div>
          <span style={{ fontSize:'18px', marginRight:'6px' }}>👋</span>
          <span style={{ color:'var(--text-secondary)', fontSize:'13px' }}>Welcome back, </span>
          <span style={{ fontWeight:600, color:'var(--text-primary)', fontSize:'13px' }}>{user?.name}</span>
        </div>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
        {/* Theme switcher */}
        <div style={{ display:'flex', background:'var(--bg-surface2)', borderRadius:'8px', border:'1px solid var(--border)', overflow:'hidden' }}>
          {themes.map(t => (
            <button
              key={t.value}
              className="btn btn-ghost btn-sm"
              onClick={() => setTheme(t.value)}
              title={t.label}
              style={{ borderRadius:0, background: theme === t.value ? 'var(--accent)' : 'transparent', color: theme === t.value ? 'white' : 'var(--text-secondary)', padding:'6px 10px' }}
            >
              {t.icon}
            </button>
          ))}
        </div>

        <button className="btn btn-outline btn-sm" onClick={handleLogout} style={{ gap:'6px' }}>
          🚪 Logout
        </button>
      </div>
    </header>
  )
}
