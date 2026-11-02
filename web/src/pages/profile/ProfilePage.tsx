import React from 'react';
import { User, ShieldCheck, Mail, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const ProfilePage: React.FC = () => {
  const { user, isSuperAdmin } = useAuth();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">Perfil de Usuario Administrativo</h1>
        <p className="text-xs text-slate-400">
          Gestión de credenciales y datos conforme a la Ley N° 29733 de Protección de Datos Personales.
        </p>
      </div>

      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 font-black text-2xl flex items-center justify-center border border-emerald-500/30">
            {user?.nombres?.[0] || 'A'}
          </div>
          <div>
            <div className="text-lg font-bold text-white">{user?.nombres} {user?.apellidos}</div>
            <div className="text-xs text-slate-400">{user?.email}</div>
            <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {isSuperAdmin ? 'Super Administrador del SIT' : 'Administrador de Empresa Concesionaria'}
            </span>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-4 space-y-3 text-xs">
          <div className="flex justify-between py-2 border-b border-slate-800/60">
            <span className="text-slate-400">Rol de Sistema (RBAC):</span>
            <span className="font-mono font-bold text-white">{user?.rol}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-800/60">
            <span className="text-slate-400">Protección de Datos:</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Consentimiento Activo (Ley 29733)
            </span>
          </div>
        </div>

        <div className="pt-2">
          <button
            onClick={() => alert('Cambio de contraseña disponible.')}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors"
          >
            Actualizar Contraseña
          </button>
        </div>
      </div>
    </div>
  );
};
