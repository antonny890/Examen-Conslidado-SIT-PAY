/**
 * Cliente Axios con Interceptor JWT para el Panel Web Administrativo
 */
import axios, { InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
type RetryConfig = InternalAxiosRequestConfig & { _sitPayRetry?: boolean };
let refreshInProgress: Promise<string | null> | null = null;

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor de petición para inyectar el JWT de Supabase Auth.
api.interceptors.request.use(
  (config) => {
    if (localStorage.getItem('sit_pay_admin_demo') === 'true') {
      return Promise.reject(new Error('Las solicitudes al servidor están deshabilitadas en el modo de demostración local.'));
    }

    const token = localStorage.getItem('sit_pay_admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

const clearSession = () => {
  localStorage.removeItem('sit_pay_admin_token');
  localStorage.removeItem('sit_pay_admin_refresh_token');
  localStorage.removeItem('sit_pay_admin_user');
  if (window.location.pathname !== '/login') window.location.href = '/login';
};

const refreshAccessToken = async (): Promise<string | null> => {
  const refreshToken = localStorage.getItem('sit_pay_admin_refresh_token');
  if (!refreshToken) return null;
  if (!refreshInProgress) {
    refreshInProgress = axios
      .post(`${API_BASE_URL}/auth/refresh`, { refreshToken })
      .then((response) => {
        const tokens = response.data?.data?.tokens;
        if (!tokens?.accessToken || !tokens?.refreshToken) return null;
        localStorage.setItem('sit_pay_admin_token', tokens.accessToken);
        localStorage.setItem('sit_pay_admin_refresh_token', tokens.refreshToken);
        return tokens.accessToken as string;
      })
      .catch(() => null)
      .finally(() => {
        refreshInProgress = null;
      });
  }
  return refreshInProgress;
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const isDemoMode = localStorage.getItem('sit_pay_admin_demo') === 'true';
    const config = error.config as RetryConfig | undefined;
    const isAuthenticationRequest =
      config?.url?.includes('/auth/login') ||
      config?.url?.includes('/auth/google') ||
      config?.url?.includes('/auth/refresh');
    if (!isDemoMode && error.response?.status === 401 && config && !config._sitPayRetry && !isAuthenticationRequest) {
      config._sitPayRetry = true;
      const accessToken = await refreshAccessToken();
      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
        return api.request(config);
      }
      clearSession();
    }
    return Promise.reject(error);
  }
);
