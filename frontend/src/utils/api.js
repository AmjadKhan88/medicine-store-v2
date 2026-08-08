import axios from 'axios';

const API = axios.create({
  baseURL:         '/api',
  withCredentials: true,
  timeout:         30000,   // 30s global timeout (Gemini routes need this)
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

// import axios from 'axios';

// const API = axios.create({
//   // baseURL: `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api`,
//   baseURL: '/api',
//   withCredentials: true,   // send httpOnly cookies automatically
// });

// /* ── Request: attach access token ── */
// API.interceptors.request.use(config => {
//   const token = localStorage.getItem('token');
//   if (token) config.headers.Authorization = `Bearer ${token}`;
//   return config;
// });

// /* ── Track if refresh is in progress (avoid multiple parallel refresh calls) ── */
// let isRefreshing  = false;
// let refreshQueue  = [];

// const processQueue = (error, token = null) => {
//   refreshQueue.forEach(cb => error ? cb.reject(error) : cb.resolve(token));
//   refreshQueue = [];
// };

// /* ── Response: auto-refresh on 401 ── */
// API.interceptors.response.use(
//   res => res,
//   async err => {
//     const original = err.config;

//     // Only intercept 401 that isn't from the refresh endpoint itself
//     if (
//       err.response?.status === 401 &&
//       !original._retry &&
//       !original.url?.includes('/auth/refresh') &&
//       !original.url?.includes('/auth/login')
//     ) {
//       if (isRefreshing) {
//         // Queue requests while refresh is in progress
//         return new Promise((resolve, reject) => {
//           refreshQueue.push({ resolve, reject });
//         }).then(token => {
//           original.headers.Authorization = `Bearer ${token}`;
//           return API(original);
//         });
//       }

//       original._retry  = true;
//       isRefreshing     = true;

//       try {
//         const { data } = await axios.post(
//           '/api/auth/refresh',
//           {},
//           { withCredentials: true }
//         );

//         const newToken = data.token;
//         localStorage.setItem('token', newToken);

//         // Update auth context user if provided
//         if (data.user) {
//           localStorage.setItem('medistore_user', JSON.stringify(data.user));
//           window.dispatchEvent(new CustomEvent('auth:refreshed', { detail: { user: data.user, token: newToken } }));
//         }

//         processQueue(null, newToken);
//         original.headers.Authorization = `Bearer ${newToken}`;
//         return API(original);
//       } catch (refreshErr) {
//         processQueue(refreshErr);
//         // Refresh failed — clear session and redirect to login
//         localStorage.removeItem('token');
//         localStorage.removeItem('medistore_user');
//         window.dispatchEvent(new CustomEvent('auth:expired'));
//         return Promise.reject(refreshErr);
//       } finally {
//         isRefreshing = false;
//       }
//     }

//     return Promise.reject(err);
//   }
// );

// export default API;