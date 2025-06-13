import axios from 'axios';
import { getAuthToken } from './auth';

// Create axios instance
const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

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
    // Log error for debugging
    console.error('API Error:', error);
    
    // Handle authentication errors
    if (error.response?.status === 401) {
      console.warn('Authentication required - redirecting to login');
      // You could redirect to login or dispatch an action here
      // window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

export default api; 