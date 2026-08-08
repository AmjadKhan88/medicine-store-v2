import { createContext, useContext, useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

/* ── Decode JWT expiry without a library ── */
const getTokenExpiry = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000; // convert to ms
  } catch { return null; }
};

const isTokenValid = (token) => {
  const expiry = getTokenExpiry(token);
  return expiry && expiry > Date.now() + 10000; // valid if not expired in next 10s
};

/* ── Refresh using absolute backend URL ── */
const BACKEND = import.meta.env.VITE_BACKEND_URL || '';

const doRefresh = async (signal) => {
  const res = await axios.post(
    `${BACKEND}/api/auth/refresh`,
    {},
    { withCredentials: true, signal, timeout: 10000 }
  );
  return res.data;
};

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [token,   setToken]   = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate   = useNavigate();
  const mountedRef = useRef(true);
  const resolvedRef = useRef(false); // prevent double-resolve in StrictMode

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;

    const controller = new AbortController();

    const resolve = async () => {
      const savedToken = localStorage.getItem('token');
      const savedUser  = localStorage.getItem('medistore_user');

      /* ── Case 1: Have valid access token in localStorage ── */
      if (savedToken && savedUser && isTokenValid(savedToken)) {
        try {
          const parsed = JSON.parse(savedUser);
          if (mountedRef.current) {
            setUser(parsed);
            setToken(savedToken);
            setLoading(false); // ← show app immediately, token is still valid
          }

          /* ── Silently refresh in background (don't block UI) ── */
          try {
            const data = await doRefresh(controller.signal);
            if (!mountedRef.current) return;

            localStorage.setItem('token', data.token);
            localStorage.setItem('medistore_user', JSON.stringify(data.user));
            setUser(data.user);
            setToken(data.token);
          } catch (bgErr) {
            if (!mountedRef.current) return;
            /* Background refresh failed — but access token is still valid
               DO NOT log out. The 401 interceptor will handle expiry when it actually occurs. */
            if (bgErr.name !== 'AbortError' && bgErr.name !== 'CanceledError') {
              console.warn('[Auth] Background refresh failed (non-critical):', bgErr.response?.status || bgErr.message);
            }
            /* ── Never navigate to login here — access token is valid ── */
          }
        } catch {
          if (mountedRef.current) setLoading(false);
        }
        return;
      }

      /* ── Case 2: Access token expired or missing — try refresh cookie ── */
      try {
        const data = await doRefresh(controller.signal);
        if (!mountedRef.current) return;

        localStorage.setItem('token', data.token);
        localStorage.setItem('medistore_user', JSON.stringify(data.user));
        setUser(data.user);
        setToken(data.token);
      } catch (err) {
        if (!mountedRef.current) return;

        if (err.name === 'AbortError' || err.name === 'CanceledError') {
          /* Render cold start timeout — if we have stale localStorage data, restore it
             The token is expired but at least show the UI; 401 interceptor will redirect */
          if (savedToken && savedUser) {
            try {
              setUser(JSON.parse(savedUser));
              setToken(savedToken);
            } catch {}
          }
          console.warn('[Auth] Refresh timed out — showing stale session or login');
        }

        /* Clear stale data only if refresh explicitly rejected (401/403) */
        if (err.response?.status === 401 || err.response?.status === 403) {
          localStorage.removeItem('token');
          localStorage.removeItem('medistore_user');
          setUser(null);
          setToken(null);
        }
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    };

    resolve();
    return () => { controller.abort(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Auth events from api.js interceptor ── */
  useEffect(() => {
    const onExpired = () => {
      if (!mountedRef.current) return;
      localStorage.removeItem('token');
      localStorage.removeItem('medistore_user');
      setUser(null);
      setToken(null);
      navigate('/login', { replace: true });
    };
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, [navigate]);

  /* ── Auth methods ── */
  const login = async (email, password) => {
    const { default: API } = await import('../utils/api');
    const { data } = await API.post('/auth/login', { email, password });
    if (data.requires2FA) return data;
    localStorage.setItem('token', data.token);
    localStorage.setItem('medistore_user', JSON.stringify(data.user));
    setUser(data.user);
    setToken(data.token);
    return data;
  };

  const verify2FA = async (tempToken, code) => {
    const { default: API } = await import('../utils/api');
    const { data } = await API.post('/auth/2fa/verify', { tempToken, code });
    localStorage.setItem('token', data.token);
    localStorage.setItem('medistore_user', JSON.stringify(data.user));
    setUser(data.user);
    setToken(data.token);
    return data;
  };

  const logout = async () => {
    try {
      const { default: API } = await import('../utils/api');
      await API.post('/auth/logout');
    } catch {}
    localStorage.removeItem('token');
    localStorage.removeItem('medistore_user');
    setUser(null);
    setToken(null);
  };

  const register = async (form) => {
    const { default: API } = await import('../utils/api');
    const { data } = await API.post('/auth/register', form);
    return data;
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, verify2FA, logout, register, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);