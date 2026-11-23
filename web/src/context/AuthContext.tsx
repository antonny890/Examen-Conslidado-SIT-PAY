import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

export interface User {
  id: string;
  email: string;
  rol: 'SUPER_ADMIN' | 'ADMIN_EMPRESA' | 'CHOFER' | 'PASAJERO';
  rolNombre: string;
  nombres: string;
  apellidos: string;
  fotoUrl?: string;
  empresaId?: string | null;
  empresaNombre?: string | null;
  empresaActiva?: boolean | null;
  estado?: string;
  emailVerificado?: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isDemoMode: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; message?: string; user?: User }>;
  loginWithGoogle: (credential: string) => Promise<{ success: boolean; message?: string; user?: User }>;
  logout: () => void;
  isSuperAdmin: boolean;
  isAdminEmpresa: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    localStorage.removeItem('sit_pay_admin_token');
    localStorage.removeItem('sit_pay_admin_refresh_token');
    localStorage.removeItem('sit_pay_admin_user');
    localStorage.removeItem('sit_pay_admin_demo');

    let active = true;
    const restoreSession = async () => {
      try {
        const response = await api.get('/auth/web/session');
        const restoredUser = response.data?.data?.usuario as User | undefined;
        if (
          active &&
          restoredUser &&
          ['SUPER_ADMIN', 'ADMIN_EMPRESA'].includes(restoredUser.rol)
        ) {
          setUser(restoredUser);
        }
      } catch {
        if (active) setUser(null);
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void restoreSession();
    return () => {
      active = false;
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/web/login', { email, password });
      if (response.data.success) {
        const data = response.data.data;
        const loggedUser: User = data.usuario;

        if (loggedUser.rol !== 'SUPER_ADMIN' && loggedUser.rol !== 'ADMIN_EMPRESA') {
          return {
            success: false,
            message: 'Esta cuenta es de Pasajero o Chofer. Por favor utilice la aplicación móvil Flutter.',
          };
        }

        setUser(loggedUser);
        setIsDemoMode(false);
        return { success: true, user: loggedUser };
      }
      return { success: false, message: response.data.message || 'Error al iniciar sesión.' };
    } catch (err: any) {
      return {
        success: false,
        message: err.response?.data?.message || 'Error de conexión con el servidor SIT-Pay.',
      };
    }
  };

  const loginWithGoogle = async (credential: string) => {
    try {
      const response = await api.post('/auth/web/google', { credential });
      if (!response.data.success) {
        return { success: false, message: response.data.message || 'No se pudo iniciar sesión con Google.' };
      }

      const data = response.data.data;
      const loggedUser: User = data.usuario;
      if (loggedUser.rol !== 'SUPER_ADMIN' && loggedUser.rol !== 'ADMIN_EMPRESA') {
        return {
          success: false,
          message: 'Solo las cuentas administrativas pueden acceder al panel web.',
        };
      }

      setUser(loggedUser);
      setIsDemoMode(false);
      return { success: true, user: loggedUser };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'No se pudo iniciar sesión con Google. Inténtalo nuevamente.',
      };
    }
  };

  const logout = () => {
    void api.post('/auth/web/logout').catch(() => undefined);
    setUser(null);
    setIsDemoMode(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isDemoMode,
        login,
        loginWithGoogle,
        logout,
        isSuperAdmin: user?.rol === 'SUPER_ADMIN',
        isAdminEmpresa: user?.rol === 'ADMIN_EMPRESA',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};
