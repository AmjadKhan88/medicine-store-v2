import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { usePermissions } from '../hooks/usePermissions';
import { useTheme } from '../context/ThemeContext';
import { NavVisibilityProvider, useNavVisibility } from '../context/NavVisibilityContext';
import RealTimeIndicator from '../Components/RealTimeIndicator';
import { useState, Suspense } from 'react';
import {
  MdDashboard, MdReceipt, MdFolderOpen, MdTrendingUp,
  MdSupportAgent, MdAutoAwesome, MdCalendarToday, MdStorefront,
  MdScience, MdMedicalServices, MdAssignment, MdStar,
  MdAdminPanelSettings, MdPeople, MdBackup, MdAccountBalance,
  MdBarChart, MdSettings, MdLogout, MdSunny, MdDarkMode,
  MdMenu, MdClose, MdShoppingCart, MdHistory, MdWarning,
  MdLocalHotel, MdLocalHospital, MdBloodtype, MdImage,
  MdFavorite, MdAccountBox, MdShield, MdAttachMoney,
  MdWhatsapp, MdMergeType, MdCameraAlt,
  MdBrandingWatermark,
} from 'react-icons/md';
import NotificationCenter from '../Components/NotificationCenter';
import { useNotifications } from '../context/NotificationContext';
import { useWindowWidth } from '../hooks/useWindowWidth';
import EliteHMSLoader from '../Components/EliteHMSLoader';

/* ── All nav items — single source of truth ── */
export const ALL_NAV_ITEMS = [
  { to: '/app/subscription',     icon: '⭐',  label: 'My Subscription',   group: 'core'          },
  { to: '/app',                  icon: '🏠',  label: 'Dashboard',         group: 'core', exact: true },
  { to: '/app/ai-assistant',     icon: '✨',  label: 'AI Assistant',      group: 'core'          },
  { to: '/app/medicines',        icon: '💊',  label: 'Medicines',         group: 'pharmacy'      },
  { to: '/app/patients',         icon: '👥',  label: 'Patients',          group: 'pharmacy'      },
  { to: '/app/billing',          icon: '🧾',  label: 'Billing & Invoices',group: 'pharmacy'      },
  { to: '/app/prescriptions',    icon: '📋',  label: 'Prescriptions',     group: 'pharmacy'      },
  { to: '/app/appointments',     icon: '📅',  label: 'Appointments',      group: 'pharmacy'      },
  { to: '/app/lab-tests',        icon: '🔬',  label: 'Lab Tests',         group: 'pharmacy'      },
  { to: '/app/wards',            icon: '🛏',  label: 'Ward & Beds',       group: 'hospital'      },
  { to: '/app/ipd',              icon: '🏥',  label: 'IPD Management',    group: 'hospital'      },
  { to: '/app/opd',              icon: '🩺',  label: 'OPD Queue',         group: 'hospital'      },
  { to: '/app/nurse',            icon: '👩‍⚕️', label: 'Nurse Station',    group: 'hospital'      },
  { to: '/app/ot',               icon: '🫀',  label: 'OT Scheduling',     group: 'hospital'      },
  { to: '/app/blood-bank',       icon: '🩸',  label: 'Blood Bank',        group: 'hospital'      },
  { to: '/app/doctor-orders',    icon: '📝',  label: 'Orders & Notes',    group: 'hospital'      },
  { to: '/app/radiology',        icon: '🖼',  label: 'Radiology',         group: 'hospital'      },
  { to: '/app/vitals',           icon: '❤️',  label: 'Vital Signs',       group: 'hospital'      },
  { to: '/app/emr',              icon: '📂',  label: 'EMR',               group: 'hospital'      },
  { to: '/app/accounting',       icon: '💰',  label: 'Accounting',        group: 'finance'       },
  { to: '/app/insurance',        icon: '🛡',  label: 'Insurance',         group: 'finance'       },
  { to: '/app/payroll',          icon: '💳',  label: 'Payroll',           group: 'finance'       },
  { to: '/app/broadcast',        icon: '📲',  label: 'Broadcast',         group: 'communication' },
  { to: '/app/feedback',         icon: '⭐',  label: 'Feedback',          group: 'communication' },
  { to: '/app/booking',          icon: '📅',  label: 'Online Booking',    group: 'communication' },
  { to: '/app/patient-matching', icon: '🔍',  label: 'Deduplication',     group: 'ai'            },
  { to: '/app/prescription-ocr', icon: '📸',  label: 'Rx OCR Scanner',    group: 'ai'            },
  { to: '/app/diagnosis',        icon: '🧠',  label: 'AI Diagnosis',      group: 'ai'            },
  { to: '/app/demand',           icon: '📈',  label: 'Demand Forecast',   group: 'ai'            },
  { to: '/app/drap',             icon: '📜',  label: 'DRAP Compliance',   group: 'ai'            },
];

export const ALL_ALERT_ITEMS = [
  { to: '/app/expiry-alerts',    icon: '⚠️',  label: 'Expiry Alerts',     group: 'management', alwaysShow: true },
  { to: '/app/patient-balance',  icon: '💵',  label: 'Patient Balances',  group: 'management' },
  { to: '/app/purchase-orders',  icon: '🛒',  label: 'Purchase Orders',   group: 'management', permission: 'purchaseOrders' },
  { to: '/app/suppliers',        icon: '🏪',  label: 'Suppliers',         group: 'management', permission: 'purchaseOrders' },
  { to: '/app/reports',          icon: '📊',  label: 'Reports & Analytics',group: 'management', permission: 'viewReports' },
  { to: '/app/support',          icon: '🎧',  label: 'Support Center',    group: 'management' },
  { to: '/app/audit-log',        icon: '📖',  label: 'Audit Log',         group: 'management', permission: 'viewAuditLog' },
  { to: '/app/staff',            icon: '👤',  label: 'Staff Management',  group: 'management', permission: 'manageStaff' },
  { to: '/app/backup',           icon: '💾',  label: 'Backup & Restore',  group: 'management', permission: 'storeSettings' },
  { to: '/app/invoice-settings', icon: '🧾',  label: 'Invoice Templates', group: 'management', permission: 'settings' },
  { to: '/app/documents',        icon: '📁',  label: 'Documents',         group: 'management' },
  { to: '/app/rag-admin',        icon: '🧠',  label: 'RAG Knowledge Base',group: 'management', superAdminOnly: true },
  { to: '/app/settings',         icon: '⚙️',  label: 'Settings',          group: 'management', alwaysShow: true, permission: 'storeSettings' },
];

/* ── Icons for the sidebar (React icon components) ── */
const ICON_MAP = {
  '/app/subscription':    <MdStar />,
  '/app':                 <MdDashboard />,
  '/app/ai-assistant':    <MdAutoAwesome />,
  '/app/medicines':       <MdMedicalServices />,
  '/app/patients':        <MdPeople />,
  '/app/billing':         <MdReceipt />,
  '/app/prescriptions':   <MdAssignment />,
  '/app/appointments':    <MdCalendarToday />,
  '/app/lab-tests':       <MdScience />,
  '/app/wards':           <MdLocalHotel />,
  '/app/ipd':             <MdMedicalServices />,
  '/app/opd':             <MdPeople />,
  '/app/nurse':           <MdMedicalServices />,
  '/app/ot':              <MdLocalHospital />,
  '/app/blood-bank':      <MdBloodtype />,
  '/app/doctor-orders':   <MdAssignment />,
  '/app/radiology':       <MdImage />,
  '/app/vitals':          <MdFavorite />,
  '/app/emr':             <MdMedicalServices />,
  '/app/accounting':      <MdAccountBox />,
  '/app/insurance':       <MdShield />,
  '/app/payroll':         <MdAttachMoney />,
  '/app/broadcast':       <MdWhatsapp />,
  '/app/feedback':        <MdStar />,
  '/app/booking':         <MdCalendarToday />,
  '/app/patient-matching':<MdMergeType />,
  '/app/prescription-ocr':<MdCameraAlt />,
  '/app/diagnosis':       <MdLocalHospital />,
  '/app/demand':          <MdTrendingUp />,
  '/app/drap':            <MdShield />,
  '/app/expiry-alerts':   <MdWarning />,
  '/app/patient-balance': <MdAccountBalance />,
  '/app/purchase-orders': <MdShoppingCart />,
  '/app/suppliers':       <MdStorefront />,
  '/app/reports':         <MdBarChart />,
  '/app/support':         <MdSupportAgent />,
  '/app/audit-log':       <MdHistory />,
  '/app/staff':           <MdPeople />,
  '/app/backup':          <MdBackup />,
  '/app/invoice-settings':<MdReceipt />,
  '/app/documents':       <MdFolderOpen />,
  '/app/rag-admin':       <MdBrandingWatermark />,
  '/app/settings':        <MdSettings />,
};

/* ══════════════════════════════════════════
   INNER LAYOUT — consumes NavVisibilityContext
══════════════════════════════════════════ */
function LayoutInner() {
  const { user, logout } = useAuth();
  const { can } = usePermissions();
  const { isTrial, daysLeft } = useSubscription();
  const { counts } = useNotifications();
  const { theme, setSpecificTheme } = useTheme();
  const { isVisible } = useNavVisibility();
  const navigate = useNavigate();
  const width = useWindowWidth();
  const [sidebarOpen, setSidebarOpen] = useState(width < 800 ? false : true);

  const handleLogout = () => { logout(); navigate('/login'); };

  const themes = [
    { id: 'light',  color: '#e2e8f0' },
    { id: 'dark',   color: '#111827' },
    { id: 'teal',   color: '#0d9488' },
    { id: 'purple', color: '#7c3aed' },
  ];

  /* ── Filter nav items: permission + user visibility preference ── */
  const visibleNavItems = ALL_NAV_ITEMS.filter(item => isVisible(item.to));

  const visibleAlertItems = ALL_ALERT_ITEMS.filter(item => {
    // Check permission
    if (item.permission && !can[item.permission]) return false;
    // Super admin only
    if (item.to === '/app/super-admin' && user?.email !== import.meta.env.VITE_SUPER_ADMIN_EMAIL) return false;
    // Check user visibility preference
    return isVisible(item.to);
  });

  const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'U';

  return (
    <div className="app-layout">
      <aside className="sidebar" style={{ width: sidebarOpen ? '260px' : '0', overflow: 'scroll' }}>
        <div className="sidebar-logo">
          <h1>Elite<span>HMS</span></h1>
          <p>Hospital Management System</p>
        </div>

        {isTrial && daysLeft <= 7 && (
          <div style={{
            margin: '0 12px 12px',
            background: daysLeft <= 3 ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
            border: `1px solid ${daysLeft <= 3 ? 'var(--danger)' : 'var(--warning)'}`,
            borderRadius: 10, padding: '8px 12px', fontSize: 12,
            color: daysLeft <= 3 ? 'var(--danger)' : 'var(--warning)',
            fontWeight: 600, cursor: 'pointer',
          }} onClick={() => navigate('/subscription')}>
            ⚠️ Trial expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''} — Upgrade now
          </div>
        )}

        <nav style={{ flex: 1 }}>
          <div className="nav-section">
            <div className="nav-section-title">Main Menu</div>
            {visibleNavItems.map(item => (
              <NavLink
                key={item.to}
                onClick={() => width < 900 ? setSidebarOpen(p => !p) : null}
                to={item.to}
                end={item.exact}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              >
                {ICON_MAP[item.to]}{item.label}
              </NavLink>
            ))}
          </div>

          <div className="nav-section">
            <div className="nav-section-title">Management</div>
            {visibleAlertItems.map(item => (
              <NavLink
                key={item.to}
                onClick={() => width < 900 ? setSidebarOpen(p => !p) : null}
                to={item.to}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              >
                {ICON_MAP[item.to]}{item.label}
                {item.to === '/app/expiry-alerts' && counts && (counts.critical > 0 || counts.expiring > 0) && (
                  <span className={`nav-badge ${counts.critical > 0 ? '' : 'warn'}`}>
                    {counts.critical > 0 ? counts.critical : counts.expiring}
                  </span>
                )}
              </NavLink>
            ))}
            {
              user?.email === import.meta.env.VITE_SUPER_ADMIN_EMAIL && 
              <NavLink
                key={"super-admin"}
                onClick={() => width < 900 ? setSidebarOpen(p => !p) : null}
                to={"/app/super-admin"}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              >
                <MdAdminPanelSettings/>
                Super Admin
                </NavLink>
            }
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
            <button className="btn btn-ghost btn-icon" onClick={handleLogout}
              style={{ color: 'var(--sidebar-text)' }}>
              <MdLogout />
            </button>
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
              {width > 460 && (
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                  Welcome back, {user?.name?.split(' ')[0]} 👋
                </div>
              )}
              <div className="text-muted text-sm">
                {new Date().toLocaleDateString('en-PK', {
                  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                })}
              </div>
            </div>
          </div>
          <div className="flex gap-3" style={{ alignItems: 'center' }}>
            <RealTimeIndicator />
            <NotificationCenter />
            <button className="btn btn-ghost btn-icon"
              onClick={() => setSpecificTheme(theme === 'dark' ? 'light' : 'dark')}>
              {theme === 'dark' ? <MdSunny size={18} /> : <MdDarkMode size={18} />}
            </button>
            <div className="avatar" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
              {initials}
            </div>
          </div>
        </header>

        <main className="page-content">
          <Suspense fallback={<EliteHMSLoader />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}

/* ── Wrap with provider so Settings page can consume it ── */
export default function Layout() {
  return (
    <NavVisibilityProvider>
      <LayoutInner />
    </NavVisibilityProvider>
  );
}
