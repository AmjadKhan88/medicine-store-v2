import { createContext, useContext, useState, useEffect } from 'react';
import API from '../utils/api';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);


export const AuthProvider = ({ children }) => {
  const [user, setUser]   = useState(null); // always start null — never read stale localStorage here
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  /* ── On startup: try to silently refresh ── */
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('medistore_user');

    const tryRefresh = async () => {
      try {
        const {data} = await API.post('/auth/refresh',{});
        localStorage.setItem('token', data.token);
        localStorage.setItem('medistore_user', JSON.stringify(data.user));
        setUser(data.user);
        setToken(data.token);
      } catch {
        // Refresh failed — clear stale data
        localStorage.removeItem('token');
        localStorage.removeItem('medistore_user');
        setUser(null);
        setToken(null);
      } finally {
        setLoading(false);
      }
    };

    if (savedToken && savedUser) {
      // Have saved data — restore immediately then refresh in background
      setUser(JSON.parse(savedUser));
      setToken(savedToken);
      setLoading(false);
      // Silently refresh token in background
      tryRefresh();
    } else {
      // No saved session — try refresh cookie (user had session before)
      tryRefresh();
    }
  }, []);

  /* ── Listen for auth events from API interceptor ── */
  useEffect(() => {
    const onRefreshed = (e) => {
      setUser(e.detail.user);
      setToken(e.detail.token);
    };
    const onExpired = () => {
      setUser(null);
      setToken(null);
      navigate('/login');
    };

    window.addEventListener('auth:refreshed', onRefreshed);
    window.addEventListener('auth:expired', onExpired);
    return () => {
      window.removeEventListener('auth:refreshed', onRefreshed);
      window.removeEventListener('auth:expired', onExpired);
    };
  }, [navigate]);


  const login = async (email, password) => {
    const { data } = await API.post('/auth/login', { email, password });

    // 2FA required — don't set tokens yet
    if (data.requires2FA) return data;

    localStorage.setItem('token', data.token);
    localStorage.setItem('medistore_user', JSON.stringify(data.user));
    setUser(data.user);
    setToken(data.token);
    return data;
  };

  const verify2FA = async (tempToken, code) => {
    const { data } = await API.post('/auth/2fa/verify', { tempToken, code });
    localStorage.setItem('token', data.token);
    localStorage.setItem('medistore_user', JSON.stringify(data.user));
    setUser(data.user);
    setToken(data.token);
    return data;
  };

  const logout = async () => {
    try { await API.post('/auth/logout'); } catch {}
    localStorage.removeItem('token');
    localStorage.removeItem('medistore_user');
    setUser(null);
    setToken(null);
  };

  const register = async (form) => {
    const { data } = await API.post('/auth/register', form);
    // Register no longer auto-logs in (email verification required)
    // just return the data, don't set user
    return data;
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, login, verify2FA, register, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
