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
      localStorage.removeItem('medistore_token');
      localStorage.removeItem('medistore_user');
    }
    return Promise.reject(err);
  }
);

export default API;