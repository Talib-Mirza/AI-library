import { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import api from '../utils/axiosConfig';

// Simple cookie helpers for remember-me persistence
function setCookie(name: string, value: string, days: number) {
  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
  const expires = `; expires=${date.toUTCString()}`;
  const secure = (typeof window !== 'undefined' && window.location.protocol === 'https:') ? '; Secure' : '';
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}${expires}; Path=/${secure}; SameSite=Lax`;
}
function deleteCookie(name: string) {
  const secure = (typeof window !== 'undefined' && window.location.protocol === 'https:') ? '; Secure' : '';
  document.cookie = `${encodeURIComponent(name)}=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/${secure}; SameSite=Lax`;
}
function getCookie(name: string): string | null {
  const cname = encodeURIComponent(name) + '=';
  const parts = document.cookie.split(';');
  for (let part of parts) {
    part = part.trim();
    if (part.startsWith(cname)) {
      return decodeURIComponent(part.substring(cname.length));
    }
  }
  return null;
}

const RAW_BASE_URL = import.meta.env?.VITE_API_URL as string | undefined;
const BASE_URL = (RAW_BASE_URL && RAW_BASE_URL.length)
  ? RAW_BASE_URL.replace(/\/$/, '')
  : (typeof window !== 'undefined' && window.location.origin.includes('localhost') ? 'http://localhost:8000/api' : '');

interface User {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_admin: boolean;
  bio?: string;
  location?: string;
  website?: string;
  total_files_uploaded: number;
  total_tts_minutes: number;
  last_login_at?: string;
  created_at: string;
  subscription_status?: string | null;
  subscription_tier?: string | null;
  subscription_renewal_at?: string | null;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  googleLogin: (credential: string) => Promise<void>;
  logout: () => void;
  updateProfile: (profileData: Partial<User> | User) => Promise<void>; // Updated method
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Try refreshing access token periodically
  useEffect(() => {
    let refreshTimer: any;
    const scheduleRefresh = () => {
      // Refresh a bit before expiry; using 20 minutes as a safe window for a 30-minute access token
      refreshTimer = setInterval(async () => {
        const refreshToken = localStorage.getItem('refresh_token') || getCookie('refresh_token');
        const userId = localStorage.getItem('user_id') || getCookie('user_id');
        if (!refreshToken || !userId) return;
        try {
          const res = await fetch(`${BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: Number(userId), refresh_token: refreshToken })
          });
          if (res.ok) {
            const data = await res.json();
            localStorage.setItem('token', data.access_token);
            localStorage.setItem('refresh_token', data.refresh_token);
            // Keep cookies in sync if present
            if (getCookie('token')) setCookie('token', data.access_token, 7);
            if (getCookie('refresh_token')) setCookie('refresh_token', data.refresh_token, 7);
          }
        } catch {}
      }, 20 * 60 * 1000);
    };
    scheduleRefresh();
    return () => refreshTimer && clearInterval(refreshTimer);
  }, []);

  // Response interceptor: on 401, try refresh once
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (resp) => resp,
      async (error) => {
        if (error.response?.status === 401) {
          const refreshToken = localStorage.getItem('refresh_token') || getCookie('refresh_token');
          const userId = localStorage.getItem('user_id') || getCookie('user_id');
          if (refreshToken && userId) {
            try {
              const res = await fetch(`${BASE_URL}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: Number(userId), refresh_token: refreshToken })
              });
              if (res.ok) {
                const data = await res.json();
                localStorage.setItem('token', data.access_token);
                localStorage.setItem('refresh_token', data.refresh_token);
                if (getCookie('token')) setCookie('token', data.access_token, 7);
                if (getCookie('refresh_token')) setCookie('refresh_token', data.refresh_token, 7);
                // retry original request
                error.config.headers.Authorization = `Bearer ${data.access_token}`;
                return api.request(error.config);
              }
            } catch {}
          }
          // Hard logout on failure
          localStorage.removeItem('token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user_id');
          deleteCookie('token');
          deleteCookie('refresh_token');
          deleteCookie('user_id');
          setUser(null);
          navigate('/login');
        }
        return Promise.reject(error);
      }
    );
    return () => api.interceptors.response.eject(interceptor);
  }, [navigate]);

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      let token = localStorage.getItem('token');
      let refreshToken = localStorage.getItem('refresh_token');
      let uid = localStorage.getItem('user_id');

      // Hydrate from cookies if localStorage empty
      if (!token) token = getCookie('token') || token;
      if (!refreshToken) refreshToken = getCookie('refresh_token') || refreshToken;
      if (!uid) uid = getCookie('user_id') || uid;
      if (token) localStorage.setItem('token', token);
      if (refreshToken) localStorage.setItem('refresh_token', refreshToken);
      if (uid) localStorage.setItem('user_id', uid);
      
      if (token) {
        try {
          // Get user data from backend
          const response = await fetch(`${BASE_URL}/auth/me`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
            localStorage.setItem('user_id', String(userData.id));
            if (getCookie('user_id')) setCookie('user_id', String(userData.id), 7);
          } else {
            // If token is invalid, clear it
            localStorage.removeItem('token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('user_id');
            deleteCookie('token');
            deleteCookie('refresh_token');
            deleteCookie('user_id');
          }
        } catch (error) {
          console.error('Error checking authentication:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user_id');
          deleteCookie('token');
          deleteCookie('refresh_token');
          deleteCookie('user_id');
        }
      }
      
      setIsLoading(false);
    };
    
    checkAuth();
  }, []);

  const login = async (email: string, password: string, rememberMe: boolean = false) => {
    setIsLoading(true);
    
    try {
      const formData = new URLSearchParams();
      formData.append('username', email);  // OAuth2 expects 'username' field
      formData.append('password', password);

      const response = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      });
      
      if (!response.ok) {
        let detail = 'Login failed';
        try {
          const err = await response.json();
          if (err?.detail) detail = err.detail;
        } catch {}
        throw new Error(detail);
      }

      const data = await response.json();
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);

      // Persist via cookies when rememberMe is true (7 days default)
      if (rememberMe) {
        setCookie('token', data.access_token, 7);
        setCookie('refresh_token', data.refresh_token, 7);
      } else {
        deleteCookie('token');
        deleteCookie('refresh_token');
      }

      // Get user data
      const userResponse = await fetch(`${BASE_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${data.access_token}`
        }
      });

      if (!userResponse.ok) {
        throw new Error('Failed to get user data');
      }

      const userData = await userResponse.json();
      setUser(userData);
      localStorage.setItem('user_id', String(userData.id));
      if (rememberMe) setCookie('user_id', String(userData.id), 7);
      
      // Navigate to dashboard after successful login
      navigate('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    
    try {
      const registerResponse = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ full_name: name, email, password }),
      });
      
    if (!registerResponse.ok) {
        let detail = 'Registration failed';
        try {
          const err = await registerResponse.json();
          if (err?.detail) detail = err.detail;
        } catch {}
        throw new Error(detail);
      }

      // NOTE: Do not auto-login here; email verification is required first
      return;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const googleLogin = async (credential: string) => {
    setIsLoading(true);
    
    try {
      const response = await fetch(`${BASE_URL}/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ credential }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Google login failed');
      }

      const data = await response.json();
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      // Default: persist cookies (Google users expect one-tap convenience)
      setCookie('token', data.access_token, 7);
      setCookie('refresh_token', data.refresh_token, 7);

      // Get user data
      const userResponse = await fetch(`${BASE_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${data.access_token}`
        }
      });

      if (!userResponse.ok) {
        throw new Error('Failed to get user data');
      }

      const userData = await userResponse.json();
      setUser(userData);
      localStorage.setItem('user_id', String(userData.id));
      setCookie('user_id', String(userData.id), 7);
      
      // Navigate to dashboard after successful login
      navigate('/dashboard');
    } catch (error) {
      console.error('Google login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_id');
    deleteCookie('token');
    deleteCookie('refresh_token');
    deleteCookie('user_id');
    setUser(null);
    navigate('/login');
  };

  const updateProfile = async (profileData: Partial<User>) => {
    if (!user) {
      throw new Error('No user logged in');
    }
    try {
      // Send update to backend
      const response = await api.put('/auth/profile', {
        full_name: profileData.full_name,
        bio: profileData.bio,
        location: profileData.location,
        website: profileData.website
      });
      setUser(prevUser => prevUser ? { ...prevUser, ...response.data } : null);
    } catch (error) {
      console.error('Failed to update profile:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, register, googleLogin, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
