import axios from 'axios';

const BACKEND = import.meta.env.VITE_BACKEND_URL || '';

const API = axios.create({
  baseURL:         `${BACKEND}/api`,
  withCredentials: true,
  timeout:         30000,
});

/* ── Request: attach access token ── */
API.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/* ── Refresh state ── */
let isRefreshing = false;
let refreshQueue = [];

const processQueue = (error, token = null) => {
  refreshQueue.forEach(cb => error ? cb.reject(error) : cb.resolve(token));
  refreshQueue = [];
};

/* ── Response: auto-refresh on 401 ── */
API.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config;
    const status   = err.response?.status;
    const url      = original?.url || '';

    const skip =
      !status                            ||
      status !== 401                     ||
      original._retry                    ||
      url.includes('/auth/refresh')      ||
      url.includes('/auth/login')        ||
      url.includes('/auth/register')     ||
      url.includes('/auth/2fa/verify');

    if (skip) return Promise.reject(err);

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push({ resolve, reject });
      }).then(token => {
        original.headers.Authorization = `Bearer ${token}`;
        original._retry = true;
        return API(original);
      });
    }

    original._retry = true;
    isRefreshing    = true;

    try {
      const { data } = await axios.post(
        `${BACKEND}/api/auth/refresh`,
        {},
        { withCredentials: true, timeout: 15000 }
      );

      localStorage.setItem('token', data.token);
      if (data.user) localStorage.setItem('medistore_user', JSON.stringify(data.user));

      processQueue(null, data.token);
      original.headers.Authorization = `Bearer ${data.token}`;
      return API(original);

    } catch (refreshErr) {
      processQueue(refreshErr);

      /* Only fire auth:expired on explicit rejection */
      const s = refreshErr.response?.status;
      if (s === 401 || s === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('medistore_user');
        window.dispatchEvent(new CustomEvent('auth:expired'));
      }

      return Promise.reject(refreshErr);
    } finally {
      isRefreshing = false;
    }
  }
);

export default API;