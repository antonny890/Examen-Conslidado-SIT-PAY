import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  DollarSign,
  Bus,
  AlertCircle,
  Calendar
} from 'lucide-react';
import { api } from '../../services/api';

interface DashboardTransaction {
  id: string;
  codigo_boleta: string;
  placa: string;
  tipo_tarifa_aplicada: string;
  monto: number | string;
  fecha_pago: string;
}

interface CompanyDashboardData {
  empresa: {
    razon_social?: string;
    nombre_comercial?: string;
  };
  recaudacionHoy: {
    monto: number;
    pasajesCobrados: number;
    montoSimulado: number;
    pagosSimulados: number;
  };
  recaudacionHistorica: {
    monto: number;
    pasajesCobrados: number;
  };
  flota: {
    totalVehiculos: number;
    totalChoferes: number;
  };
  reclamosPendientes: number;
  ultimasTransacciones: DashboardTransaction[];
}

export const CompanyDashboardPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CompanyDashboardData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/company/dashboard');
      if (res.data.success) {
        setData(res.data.data as CompanyDashboardData);
      } else {
        setError(res.data.message || 'El servidor no pudo cargar el panel de la empresa.');
      }
    } catch (requestError: any) {
      setError(
        requestError.response?.data?.message ||
          'No se pudieron cargar las métricas de la empresa.',
      );
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
  const pagosHoy = Number(data?.recaudacionHoy.pasajesCobrados || 0) +
    Number(data?.recaudacionHoy.pagosSimulados || 0);
  const montoHoy = Number(data?.recaudacionHoy.monto || 0) +
    Number(data?.recaudacionHoy.montoSimulado || 0);

  return (
    <div className="space-y-6">
      {error && (
        <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-200">
          {error}
        </div>
      )}
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Resumen de Empresa</h1>
          <p className="text-xs text-slate-400">
            {data?.empresa?.razon_social || data?.empresa?.nombre_comercial || 'Empresa asignada'} • Arequipa
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
          <div className="text-xl font-black text-white">
            {data ? `S/ ${montoHoy.toFixed(2)}` : 'Sin datos'}
          </div>
          <div className="text-xs text-slate-400">
            {data
              ? `${pagosHoy} pasajes pagados hoy`
              : 'Sin información del servidor'}
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
            <span>Recaudación histórica</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-slate-300">
            S/ {Number(data?.recaudacionHistorica.monto || 0).toFixed(2)}
          </div>
          <div className="text-xs text-slate-400">
            {data?.recaudacionHistorica.pasajesCobrados ?? 0} pagos verificados históricos
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

      {/* Ultimas Transacciones Registradas */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Últimos pagos registrados</h3>
          <span className="text-xs text-slate-400 font-mono">
            {data?.ultimasTransacciones.length ?? 0} registros
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                <th className="py-2.5 px-3">Código Boleta</th>
                <th className="py-2.5 px-3">Placa</th>
                <th className="py-2.5 px-3">Tipo de Tarifa</th>
                <th className="py-2.5 px-3">Monto</th>
                <th className="py-2.5 px-3">Estado</th>
                <th className="py-2.5 px-3">Fecha y Hora</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {(data?.ultimasTransacciones || []).map((t) => (
                <tr key={t.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-2.5 px-3 font-bold text-white">{t.codigo_boleta}</td>
                  <td className="py-2.5 px-3 text-slate-300">{t.placa}</td>
                  <td className="py-2.5 px-3 font-sans">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                      {t.tipo_tarifa_aplicada}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-bold text-emerald-400">
                    S/ {Number(t.monto).toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-300">
                      PAGADO
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-400 font-sans text-[11px]">
                    {new Date(t.fecha_pago).toLocaleString('es-PE')}
                  </td>
                </tr>
              ))}
              {!loading && data?.ultimasTransacciones.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 px-3 text-center text-slate-400">
                    No hay pagos registrados para mostrar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
