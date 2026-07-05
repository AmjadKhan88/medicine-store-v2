import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import API from '../utils/api';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';

const NotificationContext = createContext(null);

const POLL_INTERVAL = 300000; // refresh every 5 mins

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const { on } = useSocket();

  const [notifications, setNotifications] = useState([]);
  const [lastFetched, setLastFetched] = useState(null);
  const [loading, setLoading] = useState(false);
  // Store dismissed IDs in localStorage so they survive refresh
  const [dismissed, setDismissed] = useState(() => {
    try { return JSON.parse(localStorage.getItem('medistore_dismissed_notifs') || '[]'); }
    catch { return []; }
  });
  const timerRef = useRef(null);

  /* ── Build notifications from API data ── */
  const buildNotifications = useCallback((expiry, lowStock, balances) => {
    const list = [];

    // 1. Expired medicines
    (expiry.expired || []).forEach(m => {
      list.push({
        id: `expired-${m._id}`,
        type: 'expired',
        severity: 'critical',
        title: 'Medicine Expired',
        body: `${m.name} (${m.dosageForm} ${m.strength}) has expired`,
        meta: `Batch: ${m.batchNumber || '—'} · Stock: ${m.stock} ${m.unit}`,
        link: '/expiry-alerts',
        icon: '💊',
        time: new Date(m.expiryDate),
      });
    });

    // 2. Expiring in 30 days
    (expiry.expiringSoon || []).forEach(m => {
      const days = Math.ceil((new Date(m.expiryDate) - new Date()) / 86400000);
      list.push({
        id: `expiring-${m._id}`,
        type: 'expiring',
        severity: days <= 7 ? 'high' : 'medium',
        title: 'Expiring Soon',
        body: `${m.name} expires in ${days} day${days !== 1 ? 's' : ''}`,
        meta: `Expiry: ${new Date(m.expiryDate).toLocaleDateString('en-PK')} · Stock: ${m.stock} ${m.unit}`,
        link: '/expiry-alerts',
        icon: '⏰',
        time: new Date(m.expiryDate),
      });
    });

    // 3. Low stock
    (lowStock || []).forEach(m => {
      list.push({
        id: `lowstock-${m._id}`,
        type: 'lowstock',
        severity: m.stock === 0 ? 'critical' : 'high',
        title: m.stock === 0 ? 'Out of Stock' : 'Low Stock',
        body: `${m.name} — only ${m.stock} ${m.unit} remaining`,
        meta: `Min required: ${m.minStock} ${m.unit}`,
        link: '/medicines',
        icon: '📦',
        time: new Date(),
      });
    });

    // 4. Patient outstanding balances (top 5 highest)
    const sorted = [...(balances || [])].sort((a, b) => b.remainingBalance - a.remainingBalance);
    sorted.slice(0, 5).forEach(p => {
      list.push({
        id: `balance-${p._id}`,
        type: 'balance',
        severity: p.remainingBalance > 5000 ? 'high' : 'medium',
        title: 'Outstanding Balance',
        body: `${p.name} owes ₨ ${p.remainingBalance?.toLocaleString('en-PK')}`,
        meta: `Patient ID: ${p.patientId} · Phone: ${p.phone || '—'}`,
        link: '/patient-balance',
        icon: '💳',
        time: new Date(),
      });
    });

    // Sort: critical first, then by severity
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    list.sort((a, b) => order[a.severity] - order[b.severity]);

    return list;
  }, []);

  /* ── Fetch all notification data ── */
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [expiryRes, lowStockRes, balancesRes] = await Promise.allSettled([
        API.get('/medicines/expiry-alerts'),
        API.get('/medicines/low-stock'),
        API.get('/patients/balances'),
      ]);

      const expiry = expiryRes.status === 'fulfilled' ? expiryRes.value.data : {};
      const lowStock = lowStockRes.status === 'fulfilled' ? lowStockRes.value.data.medicines : [];
      const balances = balancesRes.status === 'fulfilled' ? balancesRes.value.data.patients : [];

      const built = buildNotifications(expiry, lowStock, balances);
      setNotifications(built);
      setLastFetched(new Date());
    } catch (err) {
      console.error('Notification fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [user, buildNotifications]);

  /* ── Poll on mount + interval ── */
  useEffect(() => {
    if (!user) return;
    fetchNotifications();
    // Reduced to 5 min — socket handles real-time, polling just syncs expiry alerts
    const interval = setInterval(fetchNotifications, 300000);
    return () => clearInterval(interval);
  }, [user]);

  // ── Real-time socket notifications ──
  useEffect(() => {
    if (!on) return;

    const unsubLowStock = on('stock:low', (data) => {
      const newNotif = {
        id: `stock_${data._id}_${Date.now()}`,
        type: 'low_stock',
        title: 'Low Stock Alert',
        message: `${data.name} — only ${data.stock} left (min: ${data.minStock})`,
        severity: 'warning',
        time: new Date(),
        link: '/app/medicines',
      };
      setNotifications(prev => {
        const filtered = prev.filter(n => !n.id.startsWith(`stock_${data._id}`));
        return [newNotif, ...filtered];
      });
      setUnreadCount(c => c + 1);
    });

    const unsubBill = on('bill:created', (data) => {
      const newNotif = {
        id: `bill_${data._id}`,
        type: 'bill',
        title: 'New Invoice Created',
        message: `${data.billNumber} — ${data.patientName} — ₨${data.totalAmount?.toLocaleString()}`,
        severity: 'info',
        time: new Date(),
        link: '/app/billing',
      };
      setNotifications(prev => [newNotif, ...prev.slice(0, 49)]);
      setUnreadCount(c => c + 1);
    });

    const unsubPatient = on('patient:created', (data) => {
      const newNotif = {
        id: `patient_${data._id}`,
        type: 'patient',
        title: 'New Patient Registered',
        message: `${data.name} (${data.patientId}) added to records`,
        severity: 'info',
        time: new Date(),
        link: '/app/patients',
      };
      setNotifications(prev => [newNotif, ...prev.slice(0, 49)]);
      setUnreadCount(c => c + 1);
    });

    const unsubAppt = on('appointment:created', (data) => {
      const newNotif = {
        id: `appt_${data._id}`,
        type: 'appointment',
        title: 'New Appointment',
        message: `${data.patientName} — ${new Date(data.date).toLocaleDateString()} ${data.timeSlot || ''}`,
        severity: 'info',
        time: new Date(),
        link: '/app/appointments',
      };
      setNotifications(prev => [newNotif, ...prev.slice(0, 49)]);
      setUnreadCount(c => c + 1);
    });

    return () => {
      unsubLowStock();
      unsubBill();
      unsubPatient();
      unsubAppt();
    };
  }, [on]);

  /* ── Dismiss a single notification ── */
  const dismiss = useCallback((id) => {
    setDismissed(prev => {
      const next = [...new Set([...prev, id])];
      localStorage.setItem('medistore_dismissed_notifs', JSON.stringify(next));
      return next;
    });
  }, []);

  /* ── Dismiss all visible ── */
  const dismissAll = useCallback(() => {
    setDismissed(prev => {
      const next = [...new Set([...prev, ...notifications.map(n => n.id)])];
      localStorage.setItem('medistore_dismissed_notifs', JSON.stringify(next));
      return next;
    });
  }, [notifications]);

  /* ── Clear dismissed list (used on manual refresh) ── */
  const clearDismissed = useCallback(() => {
    setDismissed([]);
    localStorage.removeItem('medistore_dismissed_notifs');
  }, []);

  /* ── Visible (non-dismissed) notifications ── */
  const visible = notifications.filter(n => !dismissed.includes(n.id));

  const counts = {
    total: visible.length,
    critical: visible.filter(n => n.severity === 'critical').length,
    high: visible.filter(n => n.severity === 'high').length,
    expired: visible.filter(n => n.type === 'expired').length,
    expiring: visible.filter(n => n.type === 'expiring').length,
    lowStock: visible.filter(n => n.type === 'lowstock').length,
    balance: visible.filter(n => n.type === 'balance').length,
  };



  return (
    <NotificationContext.Provider value={{
      notifications: visible,
      allNotifications: notifications,
      counts,
      loading,
      lastFetched,
      dismiss,
      dismissAll,
      clearDismissed,
      refresh: fetchNotifications,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);