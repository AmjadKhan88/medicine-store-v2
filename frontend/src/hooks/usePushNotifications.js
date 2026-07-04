import { useState, useEffect, useCallback } from 'react';
import API from '../utils/api';

/* ── Convert VAPID public key ── */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw     = window.atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

export function usePushNotifications() {
  const [permission,    setPermission]    = useState(Notification.permission);
  const [subscription,  setSubscription]  = useState(null);
  const [loading,       setLoading]       = useState(false);
  const [vapidKey,      setVapidKey]      = useState('');

  /* ── Fetch VAPID public key from backend ── */
  useEffect(() => {
    API.get('/push/vapid-public-key')
      .then(({ data }) => setVapidKey(data.publicKey))
      .catch(() => {});
  }, []);

  /* ── Check existing subscription ── */
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    navigator.serviceWorker.ready.then(reg => {
      reg.pushManager.getSubscription().then(sub => {
        setSubscription(sub);
      });
    });
  }, []);

  /* ── Subscribe to push ── */
  const subscribe = useCallback(async () => {
    if (!vapidKey) { console.error('VAPID key not loaded'); return false; }
    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') return false;

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      // Send subscription to backend
      await API.post('/push/subscribe', { subscription: sub.toJSON() });
      setSubscription(sub);
      return true;
    } catch (err) {
      console.error('[Push] Subscribe failed:', err);
      return false;
    } finally { setLoading(false); }
  }, [vapidKey]);

  /* ── Unsubscribe ── */
  const unsubscribe = useCallback(async () => {
    if (!subscription) return;
    setLoading(true);
    try {
      await subscription.unsubscribe();
      await API.post('/push/unsubscribe', { endpoint: subscription.endpoint });
      setSubscription(null);
      setPermission('default');
    } catch (err) {
      console.error('[Push] Unsubscribe failed:', err);
    } finally { setLoading(false); }
  }, [subscription]);

  return {
    isSupported:  'serviceWorker' in navigator && 'PushManager' in window,
    permission,
    isSubscribed: !!subscription,
    loading,
    subscribe,
    unsubscribe,
  };
}