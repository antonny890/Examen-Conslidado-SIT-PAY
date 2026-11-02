/**
 * Cliente Axios con Interceptor JWT para el Panel Web Administrativo
 */
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor de petición para inyectar token JWT
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

// Interceptor de respuesta para manejo de expiración de sesión (401)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isDemoMode = localStorage.getItem('sit_pay_admin_demo') === 'true';
    if (!isDemoMode && (error.response?.statusCode === 401 || error.response?.status === 401)) {
      localStorage.removeItem('sit_pay_admin_token');
      localStorage.removeItem('sit_pay_admin_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
