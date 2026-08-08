import axios from 'axios';

const API = axios.create({
  baseURL:         '/api',
  withCredentials: true,
  timeout:         30000,   // 30s global timeout (Gemini routes need this)
});

/* ── Request: attach access token ── */
/* ── Parse JWT expiry without library ── */
const getTokenExpiry = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000; // ms
  } catch { return null; }
};

/* ── Proactive refresh: if token expires in < 3 minutes, refresh first ── */
let proactiveRefreshing = false;
const refreshProactively = async () => {
  if (proactiveRefreshing) return;
  proactiveRefreshing = true;
  try {
    const { data } = await axios.post('/api/auth/refresh', {}, { withCredentials: true, timeout: 10000 });
    localStorage.setItem('token', data.token);
    if (data.user) localStorage.setItem('medistore_user', JSON.stringify(data.user));
    window.dispatchEvent(new CustomEvent('auth:refreshed', { detail: data }));
  } catch {
    /* Silent fail — let the 401 interceptor handle it */
  } finally {
    proactiveRefreshing = false;
  }
};

API.interceptors.request.use(async config => {
  const token = localStorage.getItem('token');
  if (token) {
    /* Check if token expires in < 3 minutes → refresh proactively */
    const expiry = getTokenExpiry(token);
    if (expiry && expiry - Date.now() < 3 * 60 * 1000 && !isRefreshing && !proactiveRefreshing) {
      await refreshProactively();
    }
    /* Attach the latest token (may have been refreshed above) */
    const latestToken = localStorage.getItem('token');
    config.headers.Authorization = `Bearer ${latestToken}`;
  }
  return config;
});

/* ── Refresh state ── */
let isRefreshing = false;
let refreshQueue = [];

const processQueue = (error, token = null) => {
  refreshQueue.forEach(cb => error ? cb.reject(error) : cb.resolve(token));
  refreshQueue = [];
};

const isRefreshUrl    = (url = '') => url.includes('/auth/refresh');
const isAuthUrl       = (url = '') => url.includes('/auth/login') || url.includes('/auth/register');
const isPublicUrl     = (url = '') => url.includes('/auth/2fa/verify') || url.includes('/feedback/') || url.includes('/book/') || url.includes('/radiology/');

/* ── Response: auto-refresh on 401 ── */
API.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config;
    const status   = err.response?.status;
    const url      = original?.url || '';

    /* Only handle 401 on non-auth, non-refresh, non-public endpoints */
    if (
      status === 401     &&
      !original._retry   &&
      !isRefreshUrl(url) &&
      !isAuthUrl(url)    &&
      !isPublicUrl(url)
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        }).then(token => {
          original.headers.Authorization = `Bearer ${token}`;
          original._retry = true;
          return API(original);
        }).catch(e => Promise.reject(e));
      }

      original._retry = true;
      isRefreshing    = true;

      try {
        /* Use raw axios (not API) to avoid interceptor loop */
        const { data } = await axios.post(
          '/api/auth/refresh',
          {},
          { withCredentials: true, timeout: 10000 }
        );

        const newToken = data.token;
        localStorage.setItem('token', newToken);
        if (data.user) {
          localStorage.setItem('medistore_user', JSON.stringify(data.user));
        }

        processQueue(null, newToken);
        original.headers.Authorization = `Bearer ${newToken}`;
        return API(original);

      } catch (refreshErr) {
        processQueue(refreshErr);

        /* Only fire auth:expired if server explicitly rejected (401/403) */
        /* Network errors / timeouts should NOT log user out */
        const refreshStatus = refreshErr.response?.status;
        if (refreshStatus === 401 || refreshStatus === 403) {
          localStorage.removeItem('token');
          localStorage.removeItem('medistore_user');
          window.dispatchEvent(new CustomEvent('auth:expired'));
        }

        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(err);
  }
);

export default API;
