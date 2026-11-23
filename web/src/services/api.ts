/**
 * Cliente Axios con Interceptor JWT para el Panel Web Administrativo
 */
import axios, { InternalAxiosRequestConfig } from 'axios';

const DEFAULT_API_BASE_URL = '/api/v1';
const API_BASE_URL = (
  import.meta.env.PROD
    ? DEFAULT_API_BASE_URL
    : import.meta.env.VITE_API_URL?.trim() || DEFAULT_API_BASE_URL
).replace(/\/+$/, '');
type RetryConfig = InternalAxiosRequestConfig & { _sitPayRetry?: boolean };
let refreshInProgress: Promise<boolean> | null = null;

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

const clearSession = () => {
  localStorage.removeItem('sit_pay_admin_token');
  localStorage.removeItem('sit_pay_admin_refresh_token');
  localStorage.removeItem('sit_pay_admin_user');
  localStorage.removeItem('sit_pay_admin_demo');
  if (window.location.pathname !== '/login') window.location.href = '/login';
};

const refreshAccessToken = async (): Promise<boolean> => {
  if (!refreshInProgress) {
    refreshInProgress = axios
      .post(`${API_BASE_URL}/auth/web/refresh`, {}, { withCredentials: true })
      .then((response) => response.data?.success === true)
      .catch(() => false)
      .finally(() => {
        refreshInProgress = null;
      });
  }
  return refreshInProgress;
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config as RetryConfig | undefined;
    const isAuthenticationRequest =
      config?.url?.includes('/auth/web/login') ||
      config?.url?.includes('/auth/web/google') ||
      config?.url?.includes('/auth/web/refresh') ||
      config?.url?.includes('/auth/web/logout');
    if (error.response?.status === 401 && config && !config._sitPayRetry && !isAuthenticationRequest) {
      config._sitPayRetry = true;
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        return api.request(config);
      }
      clearSession();
    }
    return Promise.reject(error);
  }
);
