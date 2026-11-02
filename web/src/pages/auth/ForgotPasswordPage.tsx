import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PasswordRecoveryForm } from './PasswordRecoveryForm';

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-950 px-4 py-12">
      <div className="pointer-events-none absolute -left-40 -top-40 h-[600px] w-[600px] rounded-full bg-emerald-500/10 blur-[130px]" />
      <div className="pointer-events-none absolute -bottom-20 -right-20 h-[500px] w-[500px] rounded-full bg-blue-500/10 blur-[120px]" />
      <div className="z-10 w-full max-w-md space-y-6">
        <div className="text-center">
          <img src="/sit-pay-logo.png" alt="Logo de SIT-Pay" className="mx-auto h-24 w-24 object-contain" />
          <h1 className="mt-2 text-xl font-black text-white">SIT-Pay Arequipa</h1>
        </div>
        <PasswordRecoveryForm onComplete={() => navigate('/login', { replace: true })} />
        <p className="text-center text-xs text-slate-500">
          ¿Ya recuerdas tu contraseña?{' '}
          <Link to="/login" className="font-semibold text-emerald-400 hover:text-emerald-300">
            Volver al inicio de sesión
          </Link>
        </p>
      </div>
    </main>
  );
};
