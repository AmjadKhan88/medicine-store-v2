import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';
import {
  MdNotifications, MdClose, MdRefresh, MdDoneAll,
  MdOpenInNew, MdInfoOutline
} from 'react-icons/md';

/* ── severity config ── */
const SEVERITY = {
  critical: { color: 'var(--danger)',  bg: 'var(--danger-bg)',  dot: '#ef4444', label: 'Critical' },
  high:     { color: 'var(--warning)', bg: 'var(--warning-bg)', dot: '#f59e0b', label: 'High'     },
  medium:   { color: 'var(--info)',    bg: 'var(--info-bg)',    dot: '#6366f1', label: 'Medium'   },
  low:      { color: 'var(--success)', bg: 'var(--success-bg)', dot: '#10b981', label: 'Low'      },
};

const TYPE_LABELS = {
  expired:  'Expired Medicine',
  expiring: 'Expiring Soon',
  lowstock: 'Low / Out of Stock',
  balance:  'Patient Balance',
};

/* ── relative time ── */
function relTime(date) {
  const diff = (new Date() - new Date(date)) / 1000;
  if (diff < 60)   return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)return `${Math.floor(diff / 3600)}h ago`;
  return new Date(date).toLocaleDateString('en-PK', { day: '2-digit', month: 'short' });
}

export default function NotificationCenter() {
  const [open, setOpen]         = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const dropdownRef             = useRef(null);
  const navigate                = useNavigate();

  const {
    notifications, counts, loading,
    lastFetched, dismiss, dismissAll, refresh,
  } = useNotifications();

  /* ── Close on outside click ── */
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ── Filter by tab ── */
  const filtered = activeTab === 'all'
    ? notifications
    : notifications.filter(n => n.type === activeTab);

  /* ── Bell color based on severity ── */
  const bellColor =
    counts.critical > 0 ? 'var(--danger)'  :
    counts.high     > 0 ? 'var(--warning)' :
    counts.total    > 0 ? 'var(--info)'    : 'var(--text-muted)';

  const tabs = [
    { id: 'all',      label: 'All',      count: counts.total    },
    { id: 'expired',  label: 'Expired',  count: counts.expired  },
    { id: 'expiring', label: 'Expiring', count: counts.expiring },
    { id: 'lowstock', label: 'Stock',    count: counts.lowStock },
    { id: 'balance',  label: 'Balance',  count: counts.balance  },
  ];

  const handleNotifClick = (notif) => {
    dismiss(notif.id);
    navigate(notif.link);
    setOpen(false);
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      {/* ── Bell Button ── */}
      <button
        onClick={() => setOpen(p => !p)}
        style={{
          position: 'relative',
          background: open ? 'var(--bg-tertiary)' : 'transparent',
          border: 'none',
          borderRadius: 10,
          width: 38,
          height: 38,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'var(--transition)',
          color: bellColor,
        }}
        title="Notifications"
      >
        <MdNotifications size={22} />

        {/* Count badge */}
        {counts.total > 0 && (
          <span style={{
            position: 'absolute',
            top: 2, right: 2,
            background: counts.critical > 0 ? 'var(--danger)' : counts.high > 0 ? 'var(--warning)' : 'var(--info)',
            color: '#fff',
            fontSize: 10,
            fontWeight: 800,
            borderRadius: 99,
            minWidth: 16,
            height: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 4px',
            border: '2px solid var(--bg-secondary)',
            lineHeight: 1,
          }}>
            {counts.total > 99 ? '99+' : counts.total}
          </span>
        )}

        {/* Pulse ring when critical */}
        {counts.critical > 0 && (
          <span style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 10,
            border: '2px solid var(--danger)',
            animation: 'pulse-ring 1.5s infinite',
            pointerEvents: 'none',
          }} />
        )}
      </button>

      {/* ── Dropdown Panel ── */}
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          right: 0,
          width: 390,
          maxHeight: 560,
          background: 'var(--card-bg)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          boxShadow: 'var(--shadow-xl)',
          zIndex: 999,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'slideUp 0.15s ease',
        }}>
          {/* Header */}
          <div style={{
            padding: '14px 16px 12px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-primary)' }}>
                Notifications
                {counts.total > 0 && (
                  <span style={{
                    marginLeft: 8,
                    background: 'var(--danger-bg)',
                    color: 'var(--danger)',
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '1px 7px',
                    borderRadius: 99,
                  }}>
                    {counts.total} new
                  </span>
                )}
              </div>
              {lastFetched && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  Updated {relTime(lastFetched)}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                onClick={() => { refresh(); }}
                style={{
                  background: 'transparent', border: 'none', borderRadius: 8,
                  width: 30, height: 30, cursor: 'pointer', color: 'var(--text-muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'var(--transition)',
                }}
                title="Refresh"
              >
                <MdRefresh size={17} className={loading ? 'spin' : ''} />
              </button>
              {counts.total > 0 && (
                <button
                  onClick={dismissAll}
                  style={{
                    background: 'transparent', border: 'none', borderRadius: 8,
                    width: 30, height: 30, cursor: 'pointer', color: 'var(--text-muted)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'var(--transition)',
                  }}
                  title="Mark all as read"
                >
                  <MdDoneAll size={17} />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: 'transparent', border: 'none', borderRadius: 8,
                  width: 30, height: 30, cursor: 'pointer', color: 'var(--text-muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <MdClose size={17} />
              </button>
            </div>
          </div>

          {/* Summary strip — only when there are critical/high items */}
          {(counts.critical > 0 || counts.high > 0) && (
            <div style={{
              padding: '8px 16px',
              background: counts.critical > 0 ? 'var(--danger-bg)' : 'var(--warning-bg)',
              borderBottom: '1px solid var(--border)',
              fontSize: 12,
              color: counts.critical > 0 ? 'var(--danger)' : 'var(--warning)',
              fontWeight: 600,
              display: 'flex',
              gap: 16,
              flexShrink: 0,
            }}>
              {counts.critical > 0 && <span>🚨 {counts.critical} critical</span>}
              {counts.high     > 0 && <span>⚠️ {counts.high} high priority</span>}
              {counts.expired  > 0 && <span>💊 {counts.expired} expired</span>}
              {counts.lowStock > 0 && <span>📦 {counts.lowStock} low stock</span>}
            </div>
          )}

          {/* Tabs */}
          <div style={{
            display: 'flex',
            gap: 2,
            padding: '8px 10px',
            borderBottom: '1px solid var(--border)',
            overflowX: 'auto',
            flexShrink: 0,
          }}>
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 99,
                  border: 'none',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'var(--transition)',
                  background: activeTab === t.id ? 'var(--accent)' : 'var(--bg-tertiary)',
                  color:      activeTab === t.id ? '#fff'          : 'var(--text-secondary)',
                  fontFamily: 'var(--font-main)',
                }}
              >
                {t.label}
                {t.count > 0 && (
                  <span style={{
                    marginLeft: 5,
                    background: activeTab === t.id ? 'rgba(255,255,255,0.3)' : 'var(--border)',
                    color: activeTab === t.id ? '#fff' : 'var(--text-muted)',
                    fontSize: 10,
                    fontWeight: 800,
                    padding: '1px 5px',
                    borderRadius: 99,
                  }}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Notification list */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loading && filtered.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                <MdRefresh size={28} className="spin" style={{ marginBottom: 8, display: 'block', margin: '0 auto 8px' }} />
                Checking for alerts...
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: '44px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 38, marginBottom: 10 }}>✅</div>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>All clear!</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  {activeTab === 'all'
                    ? 'No active alerts right now'
                    : `No ${TYPE_LABELS[activeTab] || activeTab} alerts`}
                </div>
              </div>
            ) : (
              filtered.map((notif, idx) => {
                const sev = SEVERITY[notif.severity] || SEVERITY.medium;
                return (
                  <div
                    key={notif.id}
                    style={{
                      display: 'flex',
                      gap: 12,
                      padding: '12px 16px',
                      borderBottom: idx < filtered.length - 1 ? '1px solid var(--border-light)' : 'none',
                      transition: 'background 0.15s',
                      cursor: 'pointer',
                      position: 'relative',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {/* Severity dot */}
                    <div style={{
                      width: 4,
                      borderRadius: 99,
                      background: sev.dot,
                      flexShrink: 0,
                      alignSelf: 'stretch',
                    }} />

                    {/* Icon */}
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: sev.bg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18, flexShrink: 0,
                    }}>
                      {notif.icon}
                    </div>

                    {/* Content — click to navigate */}
                    <div
                      style={{ flex: 1, minWidth: 0 }}
                      onClick={() => handleNotifClick(notif)}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                          {notif.title}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                          <MdOpenInNew size={11} style={{ marginRight: 2 }} />
                          view
                        </div>
                      </div>
                      <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 2, lineHeight: 1.4 }}>
                        {notif.body}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                        {notif.meta}
                      </div>

                      {/* Severity badge */}
                      <span style={{
                        display: 'inline-block',
                        marginTop: 5,
                        padding: '1px 8px',
                        borderRadius: 99,
                        fontSize: 10,
                        fontWeight: 700,
                        background: sev.bg,
                        color: sev.color,
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                      }}>
                        {sev.label}
                      </span>
                    </div>

                    {/* Dismiss button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); dismiss(notif.id); }}
                      style={{
                        background: 'transparent', border: 'none',
                        borderRadius: 6, width: 24, height: 24,
                        cursor: 'pointer', color: 'var(--text-muted)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, alignSelf: 'flex-start', marginTop: 2,
                        transition: 'var(--transition)',
                        fontFamily: 'var(--font-main)',
                      }}
                      title="Dismiss"
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-tertiary)'; e.currentTarget.style.color = 'var(--danger)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                    >
                      <MdClose size={14} />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding: '10px 16px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
            background: 'var(--bg-tertiary)',
          }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Auto-refreshes every 60s
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              {counts.total > 0 && (
                <button
                  onClick={dismissAll}
                  style={{
                    background: 'none', border: 'none', fontSize: 11,
                    color: 'var(--accent)', cursor: 'pointer', fontWeight: 600,
                    fontFamily: 'var(--font-main)',
                  }}
                >
                  Clear all
                </button>
              )}
              <button
                onClick={() => { navigate('/expiry-alerts'); setOpen(false); }}
                style={{
                  background: 'none', border: 'none', fontSize: 11,
                  color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600,
                  fontFamily: 'var(--font-main)',
                }}
              >
                View all alerts →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pulse ring animation */}
      <style>{`
        @keyframes pulse-ring {
          0%   { opacity: 1; transform: scale(1);    }
          70%  { opacity: 0; transform: scale(1.15); }
          100% { opacity: 0; transform: scale(1.15); }
        }
      `}</style>
    </div>
  );
}