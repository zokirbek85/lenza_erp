import axios from 'axios';
import { create } from 'zustand';
import { getApiBase } from '../app/apiBase';

export type UserRole = 'admin' | 'accountant' | 'warehouse' | 'sales' | 'owner' | 'manager';

interface Credentials {
  username: string;
  password: string;
  otp?: string;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  role: UserRole | null;
  userId: number | null;
  userName: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  needsOtp: boolean;
  pendingCredentials: Credentials | null;
  login: (credentials: Credentials) => Promise<void>;
  clearOtpChallenge: () => void;
  logout: () => void;
}

const ACCESS_KEY = 'lenza_access_token';
const REFRESH_KEY = 'lenza_refresh_token';
const ROLE_KEY = 'lenza_role';

const getFromStorage = (key: string): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    console.warn('localStorage read failed', error);
    return null;
  }
};

const setStorage = (key: string, value: string | null): void => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    if (value === null) {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, value);
    }
  } catch (error) {
    console.warn('localStorage write failed', error);
  }
};

const decodePayload = (token: string | null): { role: UserRole | null; userId: number | null; username: string | null } => {
  if (!token || typeof window === 'undefined') {
    return { role: null, userId: null, username: null };
  }
  try {
    const payload = token.split('.')[1];
    if (!payload) {
      return { role: null, userId: null, username: null };
    }
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(window.atob(normalized));
    return {
      role: decoded.role ?? null,
      userId: decoded.user_id ?? null,
      username: decoded.username ?? decoded.sub ?? null,
    };
  } catch (error) {
    console.warn('Unable to decode JWT payload', error);
    return { role: null, userId: null, username: null };
  }
};

const persistTokens = (accessToken: string, refreshToken: string, role: UserRole | null) => {
  setStorage(ACCESS_KEY, accessToken);
  setStorage(REFRESH_KEY, refreshToken);
  if (role) {
    setStorage(ROLE_KEY, role);
  }
};

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: getFromStorage(ACCESS_KEY),
  refreshToken: getFromStorage(REFRESH_KEY),
  role: (getFromStorage(ROLE_KEY) as UserRole | null) ?? decodePayload(getFromStorage(ACCESS_KEY)).role,
  userId: decodePayload(getFromStorage(ACCESS_KEY)).userId,
  userName: decodePayload(getFromStorage(ACCESS_KEY)).username,
  isAuthenticated: Boolean(getFromStorage(ACCESS_KEY)),
  loading: false,
  error: null,
  needsOtp: false,
  pendingCredentials: null,
  async login({ username, password, otp }) {
    const base = getApiBase();
    const apiUrl = `${base}/api/token/`;
    set((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const response = await axios.post(
        apiUrl,
        { username, password, otp },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      const { access: accessToken, refresh: refreshToken } = response.data;
      const { role, userId, username: decodedName } = decodePayload(accessToken);
      persistTokens(accessToken, refreshToken, role);
      localStorage.setItem('token', accessToken);
      set((prev) => ({
        ...prev,
        accessToken,
        refreshToken,
        role: role ?? 'sales',
        userId,
        userName: decodedName,
        isAuthenticated: true,
        error: null,
        needsOtp: false,
        pendingCredentials: null,
      }));
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      if (axios.isAxiosError(error)) {
        const detail = (error.response?.data as { detail?: string })?.detail || '';
        const lower = detail.toLowerCase();
        // 2FA setup needed
        if (lower.includes('2fa setup')) {
          set((prev) => ({
            ...prev,
            needsOtp: true,
            pendingCredentials: { username, password },
            error: '2FA setup required for this role.',
          }));
          return;
        }
        // OTP required (first time providing)
        if (lower.includes('otp code is required') || (lower.includes('otp') && lower.includes('required'))) {
            set((prev) => ({
              ...prev,
              needsOtp: true,
              pendingCredentials: { username, password },
              error: 'OTP code is required.'
            }));
            return;
        }
        // Invalid OTP (when user already tried)
        if (lower.includes('invalid otp')) {
          set((prev) => ({
            ...prev,
            needsOtp: true,
            pendingCredentials: { username, password },
            error: 'Invalid OTP code.'
          }));
          return;
        }
        let message = detail || 'Login failed. Please check your credentials.';
        // Only override for generic credential failures, not OTP-related
        if (error.response?.status === 401 && !lower.includes('otp')) {
          message = 'Invalid username or password.';
        }
        set((prev) => ({ ...prev, error: message }));
      } else {
        set((prev) => ({ ...prev, error: 'Unexpected error. Please try again.' }));
      }
      throw error;
    } finally {
      set((prev) => ({ ...prev, loading: false }));
    }
  },
  clearOtpChallenge() {
    set({ needsOtp: false, pendingCredentials: null });
  },
  logout() {
    set({
      accessToken: null,
      refreshToken: null,
      role: null,
      userId: null,
      userName: null,
      isAuthenticated: false,
      error: null,
      needsOtp: false,
      pendingCredentials: null,
    });
    setStorage(ACCESS_KEY, null);
    setStorage(REFRESH_KEY, null);
    setStorage(ROLE_KEY, null);
  },
}));
