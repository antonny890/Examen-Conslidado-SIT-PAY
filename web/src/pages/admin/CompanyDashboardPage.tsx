import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  DollarSign,
  Bus,
  Users,
  AlertCircle,
  Calendar
} from 'lucide-react';
import { api } from '../../services/api';

export const CompanyDashboardPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/company/dashboard');
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (_) {
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-slate-400 text-xs py-8">Cargando métricas de la empresa...</div>;
  }

  const flota = data?.flota?.totalVehiculos;
  const choferes = data?.flota?.totalChoferes;
  const reclamos = data?.reclamosPendientes;

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Resumen de Empresa</h1>
          <p className="text-xs text-slate-400">
            {data?.empresa?.razon_social || 'Transcayma Operadora de Transporte S.A.'} • Arequipa
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-slate-300">
          <Calendar className="w-3.5 h-3.5 text-emerald-400" />
          {new Date().toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Recaudación Hoy */}
        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Pagos recibidos hoy</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-amber-300">No disponible</div>
          <div className="text-xs text-slate-400">
            Integración bancaria pendiente
          </div>
        </div>

        {/* Flota Activa */}
        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Flota con QR Fijo</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <Bus className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-white">{flota ?? 'Sin datos'}{flota != null ? ' Unidades' : ''}</div>
          <div className="text-xs text-slate-400">
            {choferes != null ? `${choferes} choferes asignados 1-a-1` : 'Sin información conectada'}
          </div>
        </div>

        {/* Cumplimiento Medio Pasaje Ley 26271 */}
        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Tasa Medio Pasaje (Ley 26271)</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-slate-300">Sin datos</div>
          <div className="text-xs text-slate-400">
            No hay información conectada
          </div>
        </div>

        {/* Reclamos Pendientes */}
        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Reclamos Abiertos (Ley 29571)</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-amber-400">{reclamos ?? 'Sin datos'}</div>
          <div className="text-xs text-slate-400">
            Por atender en Libro de Reclamaciones
          </div>
        </div>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 text-sm text-amber-200">
        Los reportes y gráficos de recaudación estarán disponibles cuando se integre el proveedor bancario y existan pagos verificados.
      </div>

      {/* Ultimas Transacciones Registradas */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Pagos confirmados</h3>
          <span className="text-xs text-slate-400 font-mono">No disponible sin integración bancaria</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                <th className="py-2.5 px-3">Código Boleta</th>
                <th className="py-2.5 px-3">Placa</th>
                <th className="py-2.5 px-3">Tipo de Tarifa</th>
                <th className="py-2.5 px-3">Monto</th>
                <th className="py-2.5 px-3">Fecha y Hora</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {(data?.ultimasTransacciones || []).map((t: any) => (
                <tr key={t.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-2.5 px-3 font-bold text-white">{t.codigo_boleta}</td>
                  <td className="py-2.5 px-3 text-slate-300">{t.placa}</td>
                  <td className="py-2.5 px-3 font-sans">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                      {t.tipo_tarifa_aplicada}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-bold text-emerald-400">
                    S/ {parseFloat(t.monto).toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3 text-slate-400 font-sans text-[11px]">
                    {new Date(t.fecha_pago).toLocaleString('es-PE')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
