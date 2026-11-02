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
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isDemoMode: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  isSuperAdmin: boolean;
  isAdminEmpresa: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    const savedToken = localStorage.getItem('sit_pay_admin_token');
    const savedUser = localStorage.getItem('sit_pay_admin_user');
    const savedDemoMode = localStorage.getItem('sit_pay_admin_demo') === 'true';

    if (savedUser && (savedToken || (import.meta.env.DEV && savedDemoMode))) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
        setIsDemoMode(savedDemoMode);
      } catch (_) {
        localStorage.removeItem('sit_pay_admin_token');
        localStorage.removeItem('sit_pay_admin_user');
        localStorage.removeItem('sit_pay_admin_demo');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const demoAccounts: Record<string, User> = {
      'admin.transcayma@sitpay.gob.pe': {
        id: 'demo-admin-empresa',
        email,
        rol: 'ADMIN_EMPRESA',
        rolNombre: 'Administrador de Empresa (Demo)',
        nombres: 'Gabriela Torres',
        apellidos: 'Valdivia',
      },
      'superadmin@sitpay.gob.pe': {
        id: 'demo-super-admin',
        email,
        rol: 'SUPER_ADMIN',
        rolNombre: 'Super Administrador (Demo)',
        nombres: 'Hernán Peralta',
        apellidos: 'Mendoza',
      },
    };

    if (import.meta.env.DEV && password === 'SitPay2026!' && demoAccounts[email]) {
      const demoUser = demoAccounts[email];
      setToken(null);
      setUser(demoUser);
      setIsDemoMode(true);
      localStorage.removeItem('sit_pay_admin_token');
      localStorage.setItem('sit_pay_admin_user', JSON.stringify(demoUser));
      localStorage.setItem('sit_pay_admin_demo', 'true');
      return { success: true };
    }

    try {
      const response = await api.post('/auth/login', { email, password });
      if (response.data.success) {
        const data = response.data.data;
        const loggedUser: User = data.usuario;

        // Validar que sea un rol administrativo apto para el panel web
        if (loggedUser.rol !== 'SUPER_ADMIN' && loggedUser.rol !== 'ADMIN_EMPRESA') {
          return {
            success: false,
            message: 'Esta cuenta es de Pasajero o Chofer. Por favor utilice la aplicación móvil Flutter.',
          };
        }

        const accessToken = data.tokens.accessToken;
        setToken(accessToken);
        setUser(loggedUser);
        setIsDemoMode(false);

        localStorage.setItem('sit_pay_admin_token', accessToken);
        localStorage.setItem('sit_pay_admin_user', JSON.stringify(loggedUser));
        localStorage.removeItem('sit_pay_admin_demo');

        return { success: true };
      }
      return { success: false, message: response.data.message || 'Error al iniciar sesión.' };
    } catch (err: any) {
      return {
        success: false,
        message: err.response?.data?.message || 'Error de conexión con el servidor SIT-Pay.',
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('sit_pay_admin_token');
    localStorage.removeItem('sit_pay_admin_user');
    localStorage.removeItem('sit_pay_admin_demo');
    setToken(null);
    setUser(null);
    setIsDemoMode(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isDemoMode,
        login,
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
