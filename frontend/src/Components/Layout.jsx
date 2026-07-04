import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { usePermissions } from '../hooks/usePermissions';
import { useTheme } from '../context/ThemeContext';
import { useState, Suspense } from 'react';
import { MdDashboard,MdSupportAgent,MdAutoAwesome,MdCalendarToday,MdStorefront,MdScience, MdMedicalServices,MdAssignment, MdStar, MdAdminPanelSettings, MdPeople, MdBackup, MdReceipt, MdAccountBalance, MdBarChart, MdSettings, MdLogout, MdSunny, MdDarkMode, MdMenu, MdClose, MdShoppingCart, MdHistory, MdWarning } from 'react-icons/md';
import NotificationCenter from './NotificationCenter';
import { useNotifications } from '../context/NotificationContext';
import Loader from './Loader';

export default function Layout() {
  const { user, logout } = useAuth();
  const { can, isAdmin } = usePermissions();
  const { isActive, isTrial, daysLeft, plan } = useSubscription();
  const { counts } = useNotifications();
  const { theme, setSpecificTheme } = useTheme();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);


  const handleLogout = () => { logout(); navigate('/login'); };

  const themes = [
    { id: 'light', color: '#e2e8f0' },
    { id: 'dark', color: '#111827' },
    { id: 'teal', color: '#0d9488' },
    { id: 'purple', color: '#7c3aed' },
  ];

  const navItems = [
    { to: '/app/subscription', icon: <MdStar />, label: 'My Subscription', show: true },
    { to: '/app', icon: <MdDashboard />, label: 'Dashboard', exact: true },
    { to: '/app/ai-assistant', icon: <MdAutoAwesome />, label: 'AI Assistant', show: true },
    { to: '/app/medicines', icon: <MdMedicalServices />, label: 'Medicines' },
    { to: '/app/patients', icon: <MdPeople />, label: 'Patients' },
    { to: '/app/billing', icon: <MdReceipt />, label: 'Billing & Invoices' },
    { to: '/app/prescriptions', icon: <MdAssignment />, label: 'Prescriptions' },
    { to: '/app/appointments', icon: <MdCalendarToday />, label: 'Appointments' },
    { to: '/app/lab-tests', icon: <MdScience />, label: 'Lab Tests' },
  ];

  const alertItems = [
    {
      to: '/app/expiry-alerts',
      icon: <MdWarning />,
      label: 'Expiry Alerts',
      show: true,
      badge: counts.critical > 0 ? counts.critical : counts.expiring > 0 ? counts.expiring : null,
      badgeClass: counts.critical > 0 ? '' : 'warn',
    },
    { to: '/app/patient-balance', icon: <MdAccountBalance />, label: 'Patient Balances', show: true },
    { to: '/app/purchase-orders', icon: <MdShoppingCart />, label: 'Purchase Orders', show: can.purchaseOrders },
    { to: '/app/suppliers', icon: <MdStorefront />, label: 'Suppliers', show: can.purchaseOrders },
    { to: '/app/reports', icon: <MdBarChart />, label: 'Reports & Analytics', show: can.viewReports },
    { to: '/app/support', icon: <MdSupportAgent />, label: 'Support Center', show: true },
    { to: '/app/audit-log', icon: <MdHistory />, label: 'Audit Log', show: can.viewAuditLog },
    { to: '/app/staff', icon: <MdPeople />, label: 'Staff Management', show: can.manageStaff },
    { to: '/app/backup', icon: <MdBackup />, label: 'Backup & Restore', show: can.storeSettings },
    // { to: '/app/super-admin', icon: <MdAdminPanelSettings />, label: 'Super Admin Panel', show: user?.email === import.meta.env.VITE_SUPER_ADMIN_EMAIL },
    { to: '/app/super-admin', icon: <MdAdminPanelSettings />, label: 'Super Admin', show: user?.email === import.meta.env.VITE_SUPER_ADMIN_EMAIL },
    { to: '/app/settings', icon: <MdSettings />, label: 'Settings', show: can.storeSettings },
  ];

  const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'U';

  return (
    <div className="app-layout">
      <aside className="sidebar" style={{ width: sidebarOpen ? '260px' : '0', overflow: 'scroll' }}>
        <div className="sidebar-logo">
          <h1>Medi<span>Store</span></h1>
          <p>Medicine Management System</p>
        </div>

        {isTrial && daysLeft <= 7 && (
          <div style={{
            margin: '0 12px 12px',
            background: daysLeft <= 3 ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
            border: `1px solid ${daysLeft <= 3 ? 'var(--danger)' : 'var(--warning)'}`,
            borderRadius: 10, padding: '8px 12px', fontSize: 12,
            color: daysLeft <= 3 ? 'var(--danger)' : 'var(--warning)',
            fontWeight: 600,
            cursor: 'pointer',
          }} onClick={() => navigate('/subscription')}>
            ⚠️ Trial expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''} — Upgrade now
          </div>
        )}

        <nav style={{ flex: 1 }}>
          <div className="nav-section">
            <div className="nav-section-title">Main Menu</div>
            {navItems.map(item => (
              <NavLink key={item.to} to={item.to} end={item.exact} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
                {item.icon}{item.label}
              </NavLink>
            ))}
          </div>
          <div className="nav-section">
            <div className="nav-section-title">Management</div>
            {alertItems.filter(item => item.show).map(item => (
              <NavLink key={item.to} to={item.to}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
                {item.icon}{item.label}
                {item.badge ? <span className={`nav-badge ${item.badgeClass || ''}`}>{item.badge}</span> : null}
              </NavLink>
            ))}
          </div>
        </nav>
        <div className="sidebar-footer">
          <div style={{ display: 'flex', gap: 8, padding: '0 8px', marginBottom: 12 }}>
            {themes.map(t => (
              <div key={t.id} className={`theme-dot${theme === t.id ? ' active' : ''}`}
                style={{ background: t.color }} onClick={() => setSpecificTheme(t.id)} title={t.id} />
            ))}
          </div>
          <div className="sidebar-user">
            <div className="avatar">{initials}</div>
            <div className="sidebar-user-info" style={{ flex: 1, minWidth: 0 }}>
              <div className="name">{user?.name}</div>
              <div className="role">{user?.role}</div>
            </div>
            <button className="btn btn-ghost btn-icon" onClick={handleLogout} style={{ color: 'var(--sidebar-text)' }}><MdLogout /></button>
          </div>
        </div>
      </aside>
      <div className="main-content">
        <header className="top-bar">
          <div className="flex gap-3" style={{ alignItems: 'center' }}>
            <button className="btn btn-ghost btn-icon" onClick={() => setSidebarOpen(p => !p)}>
              {sidebarOpen ? <MdClose /> : <MdMenu />}
            </button>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Welcome back, {user?.name?.split(' ')[0]} 👋</div>
              <div className="text-muted text-sm">{new Date().toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
            </div>
          </div>
          <div className="flex gap-3" style={{ alignItems: 'center' }}>

            <NotificationCenter />
            <button className="btn btn-ghost btn-icon" onClick={() => setSpecificTheme(theme === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark' ? <MdSunny size={18} /> : <MdDarkMode size={18} />}
            </button>
            <div className="avatar" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>{initials}</div>
          </div>
        </header>
        <main className="page-content">
          <Suspense fallback={<Loader />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}