import {
  createContext, useContext, useEffect,
  useState, useRef, useCallback,
} from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export function SocketProvider({ children }) {
  const { user }                      = useAuth();
  const socketRef                     = useRef(null);
  const [connected,   setConnected]   = useState(false);
  const [onlineCount, setOnlineCount] = useState(1);
  const listenersRef                  = useRef({});   // event → Set of callbacks

  /* ── Connect when user is logged in ── */
  useEffect(() => {
    if (!user) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setConnected(false);
      return;
    }

    const storeId = user.storeId || user._id;

    const socket = io(BACKEND_URL, {
      auth: {
        storeId:  String(storeId),
        userId:   String(user._id),
        userName: user.name,
      },
      transports:       ['websocket', 'polling'],
      reconnection:     true,
      reconnectionDelay:1000,
      reconnectionAttempts: 10,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      console.log('[Socket] Connected:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      setConnected(false);
      console.log('[Socket] Disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      console.error('[Socket] Connection error:', err.message);
      setConnected(false);
    });

    /* ── Track online users in this store ── */
    socket.on('user:online',  ({ onlineCount }) => setOnlineCount(onlineCount));
    socket.on('user:offline', ({ onlineCount }) => setOnlineCount(onlineCount));

    /* ── Route all events to registered listeners ── */
    const ALL_EVENTS = [
      'bill:created', 'bill:paymentUpdated',
      'stock:updated', 'stock:low',
      'medicine:created', 'medicine:updated',
      'patient:created',
      'appointment:created', 'appointment:updated',
      'labTest:updated',
      'notification:new',
      'dashboard:update',
      'opd:update', 'opd:called', 'opd:tokenAdded',
      'nurse:medicineRequest', 'nurse:medicineDispensed', 'nurse:criticalVitals',
      'ot:scheduled', 'ot:statusUpdated',
      'bloodBank:unitAdded', 'bloodBank:unitIssued', 'bloodBank:criticalStock',
      'orders:new', 'orders:updated', 'orders:acknowledged', 'orders:completed', 'orders:cancelled',
      'nursing:handover', 'nursing:incident',
      'radiology:urgent', 'radiology:imagesUploaded', 'radiology:critical',
      'vitals:critical',
      'feedback:negative',
    ];

    ALL_EVENTS.forEach(event => {
      socket.on(event, (data) => {
        const cbs = listenersRef.current[event];
        if (cbs) cbs.forEach(cb => cb(data));
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user?._id]);

  /* ── Subscribe to an event ── */
  const on = useCallback((event, callback) => {
    if (!listenersRef.current[event]) {
      listenersRef.current[event] = new Set();
    }
    listenersRef.current[event].add(callback);

    // Return unsubscribe function
    return () => {
      listenersRef.current[event]?.delete(callback);
    };
  }, []);

  /* ── Emit (for future client-side events) ── */
  const emit = useCallback((event, data) => {
    socketRef.current?.emit(event, data);
  }, []);

  return (
    <SocketContext.Provider value={{ connected, onlineCount, on, emit }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);