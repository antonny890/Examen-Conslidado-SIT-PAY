import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, ShieldCheck, Mail, Building2, CircleCheck, CircleX, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PasswordRecoveryForm } from '../auth/PasswordRecoveryForm';

export const ProfilePage: React.FC = () => {
  const { user, isSuperAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

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
          <ProfileRow
            icon={<User className="h-4 w-4" />}
            label="Rol de sistema"
            value={isSuperAdmin ? 'Super Administrador' : 'Administrador de Empresa'}
          />
          <ProfileRow
            icon={user?.emailVerificado
              ? <CircleCheck className="h-4 w-4 text-emerald-400" />
              : <CircleX className="h-4 w-4 text-amber-400" />}
            label="Correo"
            value={user?.emailVerificado ? 'Verificado' : 'Pendiente de verificación'}
          />
          <ProfileRow
            icon={user?.estado === 'ACTIVO'
              ? <ShieldCheck className="h-4 w-4 text-emerald-400" />
              : <ShieldCheck className="h-4 w-4 text-amber-400" />}
            label="Estado de cuenta"
            value={user?.estado || 'Activo'}
          />
          {user?.rol === 'ADMIN_EMPRESA' && (
            <ProfileRow
              icon={<Building2 className="h-4 w-4" />}
              label="Empresa asignada"
              value={user.empresaNombre || 'Sin empresa asignada'}
            />
          )}
          <div className="flex items-center justify-between gap-4 py-2 border-b border-slate-800/60">
            <span className="flex items-center gap-2 text-slate-400">
              <Mail className="h-4 w-4" />
              Correo de acceso
            </span>
            <span className="font-medium text-white">{user?.email}</span>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={() => setIsPasswordModalOpen(true)}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold transition-colors"
          >
            Cambiar contraseña
          </button>
        </div>
      </div>

      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md">
            <button
              type="button"
              onClick={() => setIsPasswordModalOpen(false)}
              aria-label="Cerrar cambio de contraseña"
              className="absolute -top-3 -right-3 z-10 rounded-full border border-slate-700 bg-slate-900 p-2 text-slate-300 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
            <PasswordRecoveryForm
              initialEmail={user?.email || ''}
              emailLocked
              onCancel={() => setIsPasswordModalOpen(false)}
              onComplete={() => {
                logout();
                navigate('/login', { replace: true });
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

const ProfileRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
}> = ({ icon, label, value }) => (
  <div className="flex items-center justify-between gap-4 py-2 border-b border-slate-800/60">
    <span className="flex items-center gap-2 text-slate-400">
      {icon}
      {label}
    </span>
    <span className="text-right font-medium text-white">{value}</span>
  </div>
);
