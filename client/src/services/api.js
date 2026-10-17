import axios from 'axios';

/**
 * AXIOS HTTP API SERVICE MODULE
 * Configured Axios instance with interceptors for attaching JWT Authorization headers.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Attach Authorization Bearer Token header to outgoing HTTP requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('climatrix_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
