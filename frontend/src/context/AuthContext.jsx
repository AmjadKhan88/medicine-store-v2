import { createContext, useContext, useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

/* ── Standalone refresh (no API interceptor — avoids circular refresh loop) ── */
const doRefresh = async (signal) => {
  const res = await axios.post('/api/auth/refresh', {}, {
    withCredentials: true,
    signal,
  });
  return res.data;
};

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [token,   setToken]   = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate  = useNavigate();
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  /* ════════════════════════════════
     STARTUP AUTH RESOLUTION
     Runs once on app load
  ════════════════════════════════ */
  useEffect(() => {
    const controller = new AbortController();

    const resolve = async () => {
      const savedToken = localStorage.getItem('token');
      const savedUser  = localStorage.getItem('medistore_user');

      /* ── Case 1: Have saved session — restore immediately ── */
      if (savedToken && savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          if (mountedRef.current) {
            setUser(parsed);
            setToken(savedToken);
            setLoading(false);   // show app immediately — don't wait for network
          }

          /* ── Background refresh with 8s timeout ── */
          const timeoutId = setTimeout(() => controller.abort(), 8000);
          try {
            const data = await doRefresh(controller.signal);
            clearTimeout(timeoutId);

            if (!mountedRef.current) return;

            /* Only update if token actually changed (avoid unnecessary re-render) */
            if (data.token !== savedToken) {
              localStorage.setItem('token', data.token);
              localStorage.setItem('medistore_user', JSON.stringify(data.user));
              setUser(data.user);
              setToken(data.token);
            }
          } catch (bgErr) {
            clearTimeout(timeoutId);
            if (!mountedRef.current) return;

            /* Abort = timeout (Render cold start) — keep existing session, try later */
            if (bgErr.name === 'AbortError' || bgErr.name === 'CanceledError') {
              console.warn('[Auth] Background refresh timed out — keeping existing session');
              return;
            }

            /* Network error — keep existing session (offline scenario) */
            if (!bgErr.response) {
              console.warn('[Auth] Network error during background refresh — staying logged in');
              return;
            }

            /* 401 from server — refresh token genuinely expired, force re-login */
            if (bgErr.response?.status === 401) {
              localStorage.removeItem('token');
              localStorage.removeItem('medistore_user');
              setUser(null);
              setToken(null);
              navigate('/login', { replace: true });
            }
          }
        } catch {
          /* Corrupt localStorage data */
          localStorage.removeItem('token');
          localStorage.removeItem('medistore_user');
          if (mountedRef.current) {
            setUser(null);
            setToken(null);
            setLoading(false);
          }
        }
        return;
      }

      /* ── Case 2: No saved session — try cookie refresh with timeout ── */
      /* 6s timeout: if Render is cold-starting, don't freeze forever */
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      try {
        const data = await doRefresh(controller.signal);
        clearTimeout(timeoutId);

        if (!mountedRef.current) return;
        localStorage.setItem('token', data.token);
        localStorage.setItem('medistore_user', JSON.stringify(data.user));
        setUser(data.user);
        setToken(data.token);
      } catch (err) {
        clearTimeout(timeoutId);
        if (!mountedRef.current) return;

        /* Timed out (Render cold start) — go to login, don't freeze */
        if (err.name === 'AbortError' || err.name === 'CanceledError') {
          console.warn('[Auth] Refresh timed out — redirecting to login');
        }
        /* Any error = not authenticated */
        localStorage.removeItem('token');
        localStorage.removeItem('medistore_user');
        setUser(null);
        setToken(null);
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    };

    resolve();

    return () => { controller.abort(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ════════════════════════════════
     GLOBAL AUTH EVENTS
     Fired by api.js interceptor
  ════════════════════════════════ */
  useEffect(() => {
    const onExpired = () => {
      if (!mountedRef.current) return;
      localStorage.removeItem('token');
      localStorage.removeItem('medistore_user');
      setUser(null);
      setToken(null);
      /* Use replace so user can't go back to the protected page */
      navigate('/login', { replace: true });
    };

    /* Only listen for expired — refreshed event no longer needed (handled directly) */
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, [navigate]);

  /* ════════════════════════════════
     AUTH METHODS
  ════════════════════════════════ */
  const login = async (email, password) => {
    /* Import API lazily to avoid circular dep issues */
    const { default: API } = await import('../utils/api');
    const { data } = await API.post('/auth/login', { email, password });

    if (data.requires2FA) return data;  // caller handles 2FA step

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

// import { createContext, useContext, useState, useEffect } from 'react';
// import API from '../utils/api';
// import { useNavigate } from 'react-router-dom';

// const AuthContext = createContext(null);


// export const AuthProvider = ({ children }) => {
//   const [user, setUser]   = useState(null); // always start null — never read stale localStorage here
//   const [token, setToken] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const navigate = useNavigate();

//   /* ── On startup: try to silently refresh ── */
//   useEffect(() => {
//     const savedToken = localStorage.getItem('token');
//     const savedUser = localStorage.getItem('medistore_user');

//     const tryRefresh = async () => {
//       try {
//         const {data} = await API.post('/auth/refresh',{});
//         localStorage.setItem('token', data.token);
//         localStorage.setItem('medistore_user', JSON.stringify(data.user));
//         setUser(data.user);
//         setToken(data.token);
//       } catch {
//         // Refresh failed — clear stale data
//         localStorage.removeItem('token');
//         localStorage.removeItem('medistore_user');
//         setUser(null);
//         setToken(null);
//       } finally {
//         setLoading(false);
//       }
//     };

//     if (savedToken && savedUser) {
//       // Have saved data — restore immediately then refresh in background
//       setUser(JSON.parse(savedUser));
//       setToken(savedToken);
//       setLoading(false);
//       // Silently refresh token in background
//       tryRefresh();
//     } else {
//       // No saved session — try refresh cookie (user had session before)
//       tryRefresh();
//     }
//   }, []);

//   /* ── Listen for auth events from API interceptor ── */
//   useEffect(() => {
//     const onRefreshed = (e) => {
//       setUser(e.detail.user);
//       setToken(e.detail.token);
//     };
//     const onExpired = () => {
//       setUser(null);
//       setToken(null);
//       navigate('/login');
//     };

//     window.addEventListener('auth:refreshed', onRefreshed);
//     window.addEventListener('auth:expired', onExpired);
//     return () => {
//       window.removeEventListener('auth:refreshed', onRefreshed);
//       window.removeEventListener('auth:expired', onExpired);
//     };
//   }, [navigate]);


//   const login = async (email, password) => {
//     const { data } = await API.post('/auth/login', { email, password });

//     // 2FA required — don't set tokens yet
//     if (data.requires2FA) return data;

//     localStorage.setItem('token', data.token);
//     localStorage.setItem('medistore_user', JSON.stringify(data.user));
//     setUser(data.user);
//     setToken(data.token);
//     return data;
//   };

//   const verify2FA = async (tempToken, code) => {
//     const { data } = await API.post('/auth/2fa/verify', { tempToken, code });
//     localStorage.setItem('token', data.token);
//     localStorage.setItem('medistore_user', JSON.stringify(data.user));
//     setUser(data.user);
//     setToken(data.token);
//     return data;
//   };

//   const logout = async () => {
//     try { await API.post('/auth/logout'); } catch {}
//     localStorage.removeItem('token');
//     localStorage.removeItem('medistore_user');
//     setUser(null);
//     setToken(null);
//   };

//   const register = async (form) => {
//     const { data } = await API.post('/auth/register', form);
//     // Register no longer auto-logs in (email verification required)
//     // just return the data, don't set user
//     return data;
//   };

//   return (
//     <AuthContext.Provider value={{ user, loading, logout, login, verify2FA, register, setUser }}>
//       {children}
//     </AuthContext.Provider>
//   );
// };

// export const useAuth = () => useContext(AuthContext);
