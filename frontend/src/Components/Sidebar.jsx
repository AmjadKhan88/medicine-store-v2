import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { to:'/', icon:'🏠', label:'Dashboard', exact:true },
  { to:'/medicines', icon:'💊', label:'Medicines' },
  { to:'/patients', icon:'👥', label:'Patients' },
  { to:'/billing', icon:'🧾', label:'Billing' },
  { to:'/expiry-alerts', icon:'⚠️', label:'Expiry Alerts' },
  { to:'/balances', icon:'💰', label:'Patient Balances' },
  { to:'/reports', icon:'📊', label:'Reports' },
]

export default function Sidebar({ open, setOpen }) {
  const location = useLocation()
  const { user } = useAuth()

  return (
    <>
      {open && <div onClick={() => setOpen(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:99, display:'none' }} className="sidebar-overlay" />}
      <aside className={`sidebar${open ? ' open' : ''}`}>
        {/* Logo */}
        <div style={{ padding:'20px', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            <div style={{ width:'36px', height:'36px', background:'var(--accent)', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', flexShrink:0 }}>💊</div>
            <div>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:'800', fontSize:'16px', color:'white' }}>MediStore</div>
              <div style={{ fontSize:'10px', color:'#475569', letterSpacing:'1px', textTransform:'uppercase' }}>Management System</div>
            </div>
          </div>
        </div>

        {/* User info */}
        <div style={{ padding:'16px 20px', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            <div style={{ width:'32px', height:'32px', background:'linear-gradient(135deg,#3b82f6,#1d4ed8)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', color:'white', fontWeight:700, flexShrink:0 }}>
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div style={{ overflow:'hidden' }}>
              <div style={{ fontSize:'13px', fontWeight:600, color:'var(--text-sidebar-active)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.name}</div>
              <div style={{ fontSize:'11px', color:'#475569', textTransform:'capitalize' }}>{user?.role}</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ padding:'12px 12px', flex:1 }}>
          <div style={{ fontSize:'10px', color:'#334155', fontWeight:700, letterSpacing:'1px', textTransform:'uppercase', padding:'4px 8px 8px' }}>MAIN MENU</div>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              onClick={() => setOpen(false)}
              style={({ isActive }) => ({
                display:'flex', alignItems:'center', gap:'10px',
                padding:'9px 10px', borderRadius:'8px', marginBottom:'2px',
                textDecoration:'none', fontSize:'13px', fontWeight:500,
                color: isActive ? 'var(--text-sidebar-active)' : 'var(--text-sidebar)',
                background: isActive ? 'rgba(59,130,246,0.2)' : 'transparent',
                borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
                transition:'all 0.15s',
              })}
            >
              <span style={{ fontSize:'16px', width:'20px', textAlign:'center' }}>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom */}
        <div style={{ padding:'12px', borderTop:'1px solid rgba(255,255,255,0.06)' }}>
          <NavLink to="/profile" onClick={() => setOpen(false)}
            style={({ isActive }) => ({
              display:'flex', alignItems:'center', gap:'10px',
              padding:'9px 10px', borderRadius:'8px',
              textDecoration:'none', fontSize:'13px', fontWeight:500,
              color: isActive ? 'white' : 'var(--text-sidebar)',
              background: isActive ? 'rgba(59,130,246,0.2)' : 'transparent',
            })}>
            <span style={{ fontSize:'16px' }}>⚙️</span> Settings
          </NavLink>
        </div>
      </aside>
    </>
  )
}
