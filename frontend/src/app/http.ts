import axios from 'axios';
import { useAuthStore } from '../auth/useAuthStore';

const http = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Accept': 'application/json',
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
  async (error) => {
    const originalRequest = error.config;
    
    // If 401 error and not a retry attempt
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const refreshToken = useAuthStore.getState().refreshToken;
      
      if (refreshToken) {
        try {
          // Try to refresh the token
          const response = await axios.post('/api/auth/token/refresh/', {
            refresh: refreshToken,
          });
          
          const { access } = response.data;
          
          // Update the store with new access token
          useAuthStore.setState({ accessToken: access });
          
          // Retry the original request with new token
          originalRequest.headers.Authorization = `Bearer ${access}`;
          return http(originalRequest);
        } catch (refreshError) {
          // Refresh failed, logout user
          useAuthStore.getState().logout();
          return Promise.reject(refreshError);
        }
      } else {
        // No refresh token, logout
        useAuthStore.getState().logout();
      }
    }
    
    return Promise.reject(error);
  }
);

export default http;
