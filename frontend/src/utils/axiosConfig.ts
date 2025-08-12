import axios from 'axios';
import { getAuthToken } from './auth';

const baseURL = (import.meta as any)?.env?.VITE_API_URL || '/api';

// Create axios instance
const api = axios.create({
  baseURL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const DEBUG = import.meta.env?.MODE === 'development' || process.env.NODE_ENV === 'development';

// Optional concise dev-only request log
if (DEBUG) {
  api.interceptors.request.use(
    (config) => {
      // minimal: METHOD path
      // console.debug(`[API] ${config.method?.toUpperCase()} ${config.url}`);
      return config;
    },
    (error) => Promise.reject(error)
  );
}

// Add a request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add a response interceptor to handle common errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (DEBUG) {
      console.warn('[API] Error', error?.response?.status, error?.config?.url);
    }
    // Handle authentication errors
    if (error.response?.status === 401) {
      console.warn('Authentication required - redirecting to login');
    }
    return Promise.reject(error);
  }
);

export default api; 