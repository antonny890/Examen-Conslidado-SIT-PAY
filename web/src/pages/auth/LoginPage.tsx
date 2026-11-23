import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Mail, ShieldAlert, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: { theme: 'outline'; size: 'large'; width: number; text: 'continue_with' }
          ) => void;
        };
      };
    };
  }
}

export const LoginPage: React.FC = () => {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const googleButtonRef = useRef<HTMLDivElement>(null);
  const googleLoginRef = useRef(loginWithGoogle);
  googleLoginRef.current = loginWithGoogle;
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() || '';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!googleClientId || !googleButtonRef.current) return;

    let disposed = false;
    const showScriptError = () =>
      setError('No se pudo cargar el servicio de inicio de sesión de Google.');
    const renderGoogleButton = () => {
      if (disposed || !window.google || !googleButtonRef.current) return;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async ({ credential }) => {
          setError(null);
          setLoading(true);
          const result = await googleLoginRef.current(credential);
          setLoading(false);
          if (!result.success) {
            setError(result.message || 'No se pudo iniciar sesión con Google.');
            return;
          }
          navigate(result.user?.rol === 'SUPER_ADMIN' ? '/superadmin/dashboard' : '/admin/dashboard');
        },
      });
      googleButtonRef.current.replaceChildren();
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: 'outline',
        size: 'large',
        width: Math.min(360, googleButtonRef.current.clientWidth),
        text: 'continue_with',
      });
    };

    if (window.google) {
      renderGoogleButton();
    } else {
      let script = document.getElementById('google-identity-services') as HTMLScriptElement | null;
      if (!script) {
        script = document.createElement('script');
        script.id = 'google-identity-services';
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
      script.addEventListener('load', renderGoogleButton);
      script.addEventListener('error', showScriptError);
      return () => {
        disposed = true;
        script?.removeEventListener('load', renderGoogleButton);
        script?.removeEventListener('error', showScriptError);
        googleButtonRef.current?.replaceChildren();
      };
    }

    return () => {
      disposed = true;
      googleButtonRef.current?.replaceChildren();
    };
  }, [googleClientId, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      if (result.user?.rol === 'SUPER_ADMIN') {
        navigate('/superadmin/dashboard');
      } else {
        navigate('/admin/dashboard');
      }
    } else {
      setError(result.message || 'Error al iniciar sesión.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background radial gradient */}
      <div className="absolute w-[600px] h-[600px] bg-emerald-500/10 blur-[130px] rounded-full -top-40 -left-40 pointer-events-none" />
      <div className="absolute w-[500px] h-[500px] bg-blue-500/10 blur-[120px] rounded-full -bottom-20 -right-20 pointer-events-none" />

      <div className="max-w-md w-full space-y-8 z-10">
        {/* Logo Brand */}
        <div className="text-center space-y-2">
          <img
            src="/sit-pay-logo.png"
            alt="Logo de SIT-Pay"
            className="w-28 h-28 object-contain mx-auto drop-shadow-xl"
          />
          <h1 className="text-2xl font-black text-white tracking-tight">SIT-Pay Arequipa</h1>
          <p className="text-xs text-slate-400">
            Panel de Control Administrativo • Concesionarias y Fiscalización
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-6 shadow-2xl">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2.5 text-xs text-red-300">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Correo Electrónico</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="admin@empresa.pe"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">Contraseña</label>
                <Link
                  to="/forgot-password"
                  className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-3 pt-1">
              <div className="flex items-center gap-3 text-[10px] uppercase tracking-wider text-slate-500">
                <span className="h-px flex-1 bg-slate-800" />
                O continúa con
                <span className="h-px flex-1 bg-slate-800" />
              </div>
              {googleClientId ? (
                <div ref={googleButtonRef} className="flex min-h-10 justify-center" />
              ) : (
                <button
                  type="button"
                  onClick={() => setError('El acceso Google requiere configurar VITE_GOOGLE_CLIENT_ID en web y GOOGLE_CLIENT_ID en el backend.')}
                  className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-700 bg-white px-4 py-2.5 text-xs font-semibold text-slate-800 hover:bg-slate-100"
                >
                  <span className="text-base font-black text-blue-600">G</span>
                  Iniciar sesión con Google
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-[0.99] transition-all disabled:opacity-50 mt-6"
            >
              {loading ? 'Verificando...' : 'Acceder al Panel de Control'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};
