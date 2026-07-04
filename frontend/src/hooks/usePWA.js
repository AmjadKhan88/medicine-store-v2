import { useState, useEffect, useCallback } from 'react';

export function usePWA() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled]     = useState(false);
  const [isOnline, setIsOnline]           = useState(navigator.onLine);
  const [swUpdated, setSwUpdated]         = useState(false);

  /* ── Capture install prompt ── */
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  /* ── Detect if already installed (standalone mode) ── */
  useEffect(() => {
    const mq = window.matchMedia('(display-mode: standalone)');
    setIsInstalled(mq.matches || window.navigator.standalone === true);
    const handler = (e) => setIsInstalled(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  /* ── Online / Offline detection ── */
  useEffect(() => {
    const online  = () => setIsOnline(true);
    const offline = () => setIsOnline(false);
    window.addEventListener('online',  online);
    window.addEventListener('offline', offline);
    return () => { window.removeEventListener('online', online); window.removeEventListener('offline', offline); };
  }, []);

  /* ── Service worker update detection ── */
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        setSwUpdated(true);
      });
    }
  }, []);

  /* ── Trigger install prompt ── */
  const triggerInstall = useCallback(async () => {
    if (!installPrompt) return false;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
      setIsInstalled(true);
    }
    return outcome === 'accepted';
  }, [installPrompt]);

  /* ── Reload to apply SW update ── */
  const applyUpdate = useCallback(() => {
    window.location.reload();
  }, []);

  return {
    canInstall: !!installPrompt && !isInstalled,
    isInstalled,
    isOnline,
    swUpdated,
    triggerInstall,
    applyUpdate,
  };
}