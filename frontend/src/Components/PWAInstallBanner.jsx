import { useState } from 'react';
import { usePWA } from '../hooks/usePWA';
import { usePushNotifications } from '../hooks/usePushNotifications';
import {
  MdGetApp, MdClose, MdWifiOff, MdRefresh,
  MdNotifications, MdNotificationsOff, MdCheck,
} from 'react-icons/md';
import toast from 'react-hot-toast';

/* ── Offline Banner ── */
export function OfflineBanner() {
  const { isOnline } = usePWA();
  if (isOnline) return null;

  return (
    <div style={{
      position:   'fixed',
      bottom:     16,
      left:       '50%',
      transform:  'translateX(-50%)',
      zIndex:     2000,
      background: '#1e293b',
      color:      '#fff',
      padding:    '10px 20px',
      borderRadius: 99,
      fontSize:   13,
      fontWeight: 600,
      display:    'flex',
      alignItems: 'center',
      gap:        8,
      boxShadow:  '0 8px 30px rgba(0,0,0,0.3)',
      animation:  'slideUp 0.3s ease',
    }}>
      <MdWifiOff style={{ color: '#f87171' }} />
      You are offline — viewing cached data
    </div>
  );
}

/* ── SW Update Banner ── */
export function UpdateBanner() {
  const { swUpdated, applyUpdate } = usePWA();
  if (!swUpdated) return null;

  return (
    <div style={{
      position:       'fixed',
      top:            0,
      left:           0,
      right:          0,
      zIndex:         2000,
      background:     'var(--accent)',
      color:          '#fff',
      padding:        '10px 20px',
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'space-between',
      fontSize:       14,
      fontWeight:     600,
    }}>
      <span>🔄 A new version of MediStore is available</span>
      <button
        onClick={applyUpdate}
        style={{
          background: '#fff', color: 'var(--accent)',
          border: 'none', borderRadius: 8,
          padding: '6px 16px', fontWeight: 700,
          cursor: 'pointer', fontSize: 13,
          display: 'flex', alignItems: 'center', gap: 6,
        }}
      >
        <MdRefresh /> Update Now
      </button>
    </div>
  );
}

/* ── Install Banner ── */
export function InstallBanner() {
  const { canInstall, triggerInstall } = usePWA();
  const [dismissed, setDismissed]      = useState(
    () => localStorage.getItem('pwa_install_dismissed') === 'true'
  );

  if (!canInstall || dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem('pwa_install_dismissed', 'true');
    setDismissed(true);
  };

  const handleInstall = async () => {
    const accepted = await triggerInstall();
    if (accepted) toast.success('MediStore installed on your device!');
  };

  return (
    <div style={{
      position:   'fixed',
      bottom:     24,
      left:       '50%',
      transform:  'translateX(-50%)',
      zIndex:     1999,
      background: 'var(--card-bg)',
      border:     '1px solid var(--border)',
      borderRadius: 16,
      padding:    '16px 20px',
      width:      'calc(100vw - 32px)',
      maxWidth:   420,
      boxShadow:  'var(--shadow-xl)',
      animation:  'slideUp 0.3s ease',
    }}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        {/* App icon */}
        <div style={{
          width:          52, height: 52, borderRadius: 12,
          background:     '#0f172a',
          display:        'flex', alignItems: 'center', justifyContent: 'center',
          fontSize:       28, flexShrink: 0,
        }}>
          💊
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 3 }}>
            Install MediStore
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.5 }}>
            Add to your home screen for quick access, works offline, and feels like a native app.
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleInstall}
              style={{
                flex: 1, padding: '9px 0',
                background: 'var(--accent)', color: '#fff',
                border: 'none', borderRadius: 10,
                fontWeight: 700, fontSize: 14, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                fontFamily: 'var(--font-main)',
              }}
            >
              <MdGetApp size={18} /> Install App
            </button>
            <button
              onClick={handleDismiss}
              style={{
                padding: '9px 14px',
                background: 'var(--bg-tertiary)', color: 'var(--text-muted)',
                border: '1px solid var(--border)', borderRadius: 10,
                fontWeight: 600, fontSize: 13, cursor: 'pointer',
                fontFamily: 'var(--font-main)',
              }}
            >
              Not now
            </button>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          style={{
            background: 'transparent', border: 'none',
            cursor: 'pointer', color: 'var(--text-muted)',
            padding: 4, borderRadius: 6, flexShrink: 0,
          }}
        >
          <MdClose size={18} />
        </button>
      </div>
    </div>
  );
}

/* ── Push Notification Toggle (used in Settings) ── */
export function PushNotificationToggle() {
  const { isSupported, permission, isSubscribed, loading, subscribe, unsubscribe } = usePushNotifications();

  if (!isSupported) return (
    <div className="alert alert-warning">
      <div className="alert-text">Push notifications are not supported on this browser.</div>
    </div>
  );

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
      toast.success('Push notifications disabled');
    } else {
      const ok = await subscribe();
      if (ok) toast.success('Push notifications enabled! You will get expiry alerts.');
      else     toast.error('Could not enable notifications. Please check browser permissions.');
    }
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 16px', background: 'var(--bg-tertiary)',
      borderRadius: 12, border: '1px solid var(--border)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: isSubscribed ? 'var(--success-bg)' : 'var(--bg-secondary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {isSubscribed
            ? <MdNotifications size={20} style={{ color: 'var(--success)' }} />
            : <MdNotificationsOff size={20} style={{ color: 'var(--text-muted)' }} />}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>
            Push Notifications
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {isSubscribed
              ? 'You will receive expiry alerts and low stock warnings'
              : permission === 'denied'
                ? 'Blocked — enable in browser settings to receive alerts'
                : 'Get notified about expired medicines and low stock'}
          </div>
        </div>
      </div>

      {permission === 'denied' ? (
        <span className="badge badge-danger">Blocked</span>
      ) : (
        <button
          onClick={handleToggle}
          disabled={loading}
          style={{
            width: 52, height: 28,
            borderRadius: 99,
            border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
            background: isSubscribed ? 'var(--success)' : 'var(--border)',
            position: 'relative',
            transition: 'background 0.2s',
          }}
        >
          <span style={{
            position:   'absolute',
            top:        3,
            left:       isSubscribed ? 'calc(100% - 25px)' : 3,
            width:      22, height: 22,
            background: '#fff',
            borderRadius: '50%',
            transition: 'left 0.2s',
            display:    'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {isSubscribed && <MdCheck size={14} style={{ color: 'var(--success)' }} />}
          </span>
        </button>
      )}
    </div>
  );
}