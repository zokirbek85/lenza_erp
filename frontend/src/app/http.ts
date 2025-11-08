import axios from 'axios';
import { useAuthStore } from '../auth/useAuthStore';

axios.defaults.withCredentials = false;

const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

const http = axios.create({
  baseURL: apiBase,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

http.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = 'Bearer ' + token;
  }
  if (typeof window !== 'undefined') {
    const lang = window.localStorage.getItem('lenza_lang') || 'uz';
    config.headers = config.headers ?? {};
    config.headers['Accept-Language'] = lang;
  }
  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export default http;
