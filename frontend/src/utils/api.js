import axios from 'axios';

const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

const API = axios.create({ baseURL: `${baseUrl}/api`, timeout: 15000 });

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('medistore_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});


API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const wasLoggedIn = !!localStorage.getItem('medistore_token');
      localStorage.removeItem('medistore_token');
      localStorage.removeItem('medistore_user');

      // Only redirect if user was actually logged in (not on login page itself)
      if (wasLoggedIn) {
        // Force a full page reload — clears all React state cleanly
        // This avoids needing to import AuthContext here (circular dep risk)
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default API;