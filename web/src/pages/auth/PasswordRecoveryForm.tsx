import React, { useState } from 'react';
import { ArrowLeft, KeyRound, Mail, ShieldCheck } from 'lucide-react';
import { api } from '../../services/api';

interface PasswordRecoveryFormProps {
  initialEmail?: string;
  emailLocked?: boolean;
  onComplete: () => void;
  onCancel?: () => void;
}

export const PasswordRecoveryForm: React.FC<PasswordRecoveryFormProps> = ({
  initialEmail = '',
  emailLocked = false,
  onComplete,
  onCancel,
}) => {
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState<'request' | 'reset' | 'complete'>('request');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequestCode = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await api.post('/auth/forgot-password', { email: email.trim() });
      setNotice(
        emailLocked
          ? `Solicitamos el envío de un código a ${email.trim()}. Revisa tu bandeja de entrada y spam.`
          : response.data.message || 'Si el correo está registrado, recibirás un código de recuperación.'
      );
      setStep('reset');
    } catch (requestError: any) {
      setError(
        requestError.response?.data?.message ||
          (!requestError.response ? requestError.message : '') ||
          'No se pudo enviar el código. Comprueba el correo e inténtalo nuevamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!/^\d{6}$/.test(code.trim())) {
      setError('El código debe tener 6 dígitos.');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña nueva debe tener al menos 8 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/reset-password', {
        email: email.trim(),
        token: code.trim(),
        newPassword: password,
      });
      setNotice(response.data.message || 'Contraseña actualizada correctamente.');
      setStep('complete');
    } catch (requestError: any) {
      setError(
        requestError.response?.data?.message ||
          (!requestError.response ? requestError.message : '') ||
          'No se pudo cambiar la contraseña. Verifica el código e inténtalo nuevamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-5 shadow-2xl">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-400">
          {step === 'complete' ? <ShieldCheck className="h-5 w-5" /> : <KeyRound className="h-5 w-5" />}
        </div>
        <div>
          <h2 className="text-base font-bold text-white">
            {step === 'complete' ? 'Contraseña actualizada' : 'Recuperar contraseña'}
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            {step === 'request' && 'Te enviaremos un código de seguridad al correo de tu cuenta.'}
            {step === 'reset' && 'Ingresa el código de 6 dígitos y define una contraseña nueva.'}
            {step === 'complete' && notice}
          </p>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
          {error}
        </div>
      )}

      {step === 'request' && (
        <form onSubmit={handleRequestCode} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-slate-300">Correo Electrónico</span>
            <span className="relative block">
              <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                readOnly={emailLocked}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@empresa.pe"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 pl-10 pr-4 text-xs text-white outline-none focus:border-emerald-500 read-only:opacity-70"
              />
            </span>
          </label>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-xs font-bold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
          >
            {loading ? 'Enviando código...' : 'Enviar código al correo'}
          </button>
        </form>
      )}

      {step === 'reset' && (
        <>
          <div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-200">
            {notice}
          </div>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-slate-300">Código de seguridad</span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                pattern="[0-9]{6}"
                required
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 font-mono text-sm tracking-[0.3em] text-white outline-none focus:border-emerald-500"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-slate-300">Nueva contraseña</span>
              <input
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs text-white outline-none focus:border-emerald-500"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold text-slate-300">Confirmar contraseña</span>
              <input
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs text-white outline-none focus:border-emerald-500"
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-xs font-bold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
            >
              {loading ? 'Actualizando...' : 'Cambiar contraseña'}
            </button>
          </form>
        </>
      )}

      {step === 'complete' && (
        <button
          type="button"
          onClick={onComplete}
          className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-xs font-bold text-slate-950 hover:bg-emerald-400"
        >
          Continuar
        </button>
      )}

      {step !== 'complete' && onCancel && (
        <button
          type="button"
          onClick={step === 'reset' ? () => { setStep('request'); setError(''); } : onCancel}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          {step === 'reset' && !emailLocked ? 'Cambiar correo' : 'Volver'}
        </button>
      )}
    </div>
  );
};
