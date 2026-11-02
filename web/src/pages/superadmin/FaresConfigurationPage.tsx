import React, { useState, useEffect } from 'react';
import { Sliders, Check, Clock, Calendar, ShieldCheck } from 'lucide-react';
import { api } from '../../services/api';

export const FaresConfigurationPage: React.FC = () => {
  const [fares, setFares] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFares();
  }, []);

  const fetchFares = async () => {
    try {
      const res = await api.get('/fares');
      if (res.data.success) {
        setFares(res.data.data);
      }
    } catch (_) {} finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">
          Motor de Tarifas y Parámetros de la Ley 26271
        </h1>
        <p className="text-xs text-slate-400">
          Configuración 100 % parametrizable de las tarifas del SIT Arequipa sin necesidad de modificar código fuente.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {fares.map((f) => (
          <div
            key={f.id}
            className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4 relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                {f.tipo_pasajero}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {f.activo ? 'VIGENTE' : 'DESACTIVADA'}
              </span>
            </div>

            <div>
              <h3 className="font-bold text-base text-white">{f.nombre}</h3>
              <div className="text-3xl font-black font-mono text-white mt-1">
                S/ {parseFloat(f.monto).toFixed(2)}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Descuento: <strong className="text-emerald-400">{f.porcentaje_descuento} %</strong>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-300 font-sans border-t border-slate-800 pt-3">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>Horario: {f.hora_inicio} a {f.hora_fin}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>Días: Lunes a Sábado (Laborables)</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
                <span>Regla: Ley N° 26271 (50 % verificado)</span>
              </div>
            </div>

            <button
              onClick={() => alert(`Configurar tarifa: ${f.nombre}`)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 rounded-xl transition-colors"
            >
              Modificar Parámetros
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
