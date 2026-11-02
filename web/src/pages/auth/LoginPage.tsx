import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bus, Lock, Mail, ShieldAlert, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('admin.transcayma@sitpay.gob.pe');
  const [password, setPassword] = useState('SitPay2026!');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      // Redirigir según rol
      const storedUser = JSON.parse(localStorage.getItem('sit_pay_admin_user') || '{}');
      if (storedUser.rol === 'SUPER_ADMIN') {
        navigate('/superadmin/dashboard');
      } else {
        navigate('/admin/dashboard');
      }
    } else {
      setError(result.message || 'Error al iniciar sesión.');
    }
  };

  const handleSelectDemo = async (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('SitPay2026!');
    setError(null);
    setLoading(true);

    const result = await login(demoEmail, 'SitPay2026!');
    setLoading(false);

    if (!result.success) {
      setError(result.message || 'No se pudo abrir la demostración local.');
      return;
    }

    navigate(demoEmail === 'superadmin@sitpay.gob.pe' ? '/superadmin/dashboard' : '/admin/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background radial gradient */}
      <div className="absolute w-[600px] h-[600px] bg-emerald-500/10 blur-[130px] rounded-full -top-40 -left-40 pointer-events-none" />
      <div className="absolute w-[500px] h-[500px] bg-blue-500/10 blur-[120px] rounded-full -bottom-20 -right-20 pointer-events-none" />

      <div className="max-w-md w-full space-y-8 z-10">
        {/* Logo Brand */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 mx-auto flex items-center justify-center shadow-xl shadow-emerald-500/20">
            <Bus className="w-8 h-8 text-slate-950 font-bold" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">SIT-Pay Arequipa</h1>
          <p className="text-xs text-slate-400">
            Panel de Control Administrativo • Concesionarias y Fiscalización
          </p>
        </div>

        {/* Demo switcher */}
        <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-2xl space-y-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Acceso de demostración local (sin base de datos):
          </span>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleSelectDemo('admin.transcayma@sitpay.gob.pe')}
              className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition-colors"
            >
              <div className="font-bold text-emerald-400">Admin Empresa</div>
              <div className="text-[10px] text-slate-400">Transcayma S.A.</div>
            </button>
            <button
              type="button"
              onClick={() => handleSelectDemo('superadmin@sitpay.gob.pe')}
              className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition-colors"
            >
              <div className="font-bold text-purple-400">Super Admin</div>
              <div className="text-[10px] text-slate-400">Fiscalización Global</div>
            </button>
          </div>
        </div>

        {import.meta.env.DEV && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-200">
            Modo de desarrollo: usa uno de los accesos rápidos para recorrer la interfaz. No valida credenciales reales ni guarda cambios en el servidor.
          </div>
        )}

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
              <label className="text-xs font-semibold text-slate-300">Contraseña</label>
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

        <div className="text-center text-xs text-slate-500">
          Universidad Continental • Programación Web • Proyecto SIT-Pay Arequipa
        </div>
      </div>
    </div>
  );
};
