import React from 'react';
import { GraduationCap, MailCheck, ShieldCheck } from 'lucide-react';

export const PreferentialReviewPage: React.FC = () => (
  <div className="mx-auto max-w-3xl space-y-6">
    <header>
      <h1 className="text-xl font-bold tracking-tight text-white">Medio pasaje universitario</h1>
      <p className="mt-1 text-xs text-slate-400">
        La acreditación se realiza directamente desde la app del pasajero.
      </p>
    </header>

    <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-blue-500/10 p-2 text-blue-300">
          <GraduationCap className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-white">Sin aprobación de la empresa</h2>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            El pasajero valida un código enviado a su correo institucional. Al confirmar el código,
            el sistema activa automáticamente la tarifa universitaria vigente.
          </p>
        </div>
      </div>
      <div className="flex items-start gap-3 border-t border-slate-800 pt-4">
        <MailCheck className="h-5 w-5 shrink-0 text-emerald-400" />
        <p className="text-xs leading-5 text-slate-300">
          Este panel no recibe fotos de carnés ni permite aprobar o rechazar solicitudes.
          La empresa puede consultar el tipo de tarifa aplicado en sus reportes.
        </p>
      </div>
      <div className="flex items-start gap-3 border-t border-slate-800 pt-4">
        <ShieldCheck className="h-5 w-5 shrink-0 text-slate-400" />
        <p className="text-xs leading-5 text-slate-400">
          La habilitación requiere confirmar el OTP; ingresar un correo institucional por sí solo
          no activa el beneficio.
        </p>
      </div>
    </section>
  </div>
);
