import axios from 'axios';

// Base API configuration
// During development, if VITE_API_BASE_URL is not provided, fallback to '/api' (handled by Vite proxy)
// or directly to http://localhost:7050/api
const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL,
  timeout: 8000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers = config.headers || {};
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for consistent error normalization
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const customError = {
      message: error.response?.data?.error || error.message || 'Network request failed',
      status: error.response?.status || 500,
    };
    return Promise.reject(customError);
  }
);

export default api;
