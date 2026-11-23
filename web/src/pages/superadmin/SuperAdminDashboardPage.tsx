import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

interface SuperAdminDashboardData {
  recaudacionHoy: {
    monto: number;
    pasajes: number;
  };
  recaudacionHistorica: {
    monto: number;
    pasajes: number;
  };
  metricas: {
    totalUsuarios: number;
    totalEmpresas: number;
    totalVehiculos: number;
    totalSolicitudesPendientes: number;
  };
}

export const SuperAdminDashboardPage: React.FC = () => {
  const [data, setData] = useState<SuperAdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchGlobalStats();
  }, []);

  const fetchGlobalStats = async () => {
    try {
      const res = await api.get('/admin/dashboard');
      if (res.data.success) {
        setData(res.data.data as SuperAdminDashboardData);
      } else {
        setError(res.data.message || 'El servidor no pudo cargar las métricas globales.');
      }
    } catch (requestError: any) {
      setError(
        requestError.response?.data?.message ||
          'No se pudieron cargar las métricas globales.',
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-slate-400 text-xs py-8">Cargando métricas macro del SIT...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">
          Fiscalización del SIT Arequipa
        </h1>
        <p className="text-xs text-slate-400">
          Métricas cargadas desde el servidor y la base de datos del sistema.
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-200">
          {error}
        </p>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl space-y-1">
          <div className="text-xs text-slate-400">Pagos registrados hoy</div>
          <div className="text-xl font-black text-amber-300">
            {data ? `S/ ${Number(data.recaudacionHoy.monto).toFixed(2)}` : 'Sin datos'}
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            {data ? `${data.recaudacionHoy.pasajes} pasajes` : 'Sin información del servidor'}
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl space-y-1">
          <div className="text-xs text-slate-400">Empresas Concesionarias</div>
          <div className="text-2xl font-black font-mono text-blue-400">
            {data?.metricas?.totalEmpresas ?? 'Sin datos'}{data?.metricas?.totalEmpresas != null ? ' Operadoras' : ''}
          </div>
          <div className="text-[11px] text-slate-500">Empresas registradas</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl space-y-1">
          <div className="text-xs text-slate-400">Flota con QR Activo</div>
          <div className="text-2xl font-black font-mono text-purple-400">
            {data?.metricas?.totalVehiculos ?? 'Sin datos'}{data?.metricas?.totalVehiculos != null ? ' Vehículos' : ''}
          </div>
          <div className="text-[11px] text-slate-500">Vehículos activos registrados</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl space-y-1">
          <div className="text-xs text-slate-400">Usuarios registrados</div>
          <div className="text-2xl font-black font-mono text-white">
            {data?.metricas?.totalUsuarios ?? 'Sin datos'}
          </div>
          <div className="text-[11px] text-slate-500">Cuentas registradas en el sistema</div>
        </div>
      </div>

      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 text-xs text-slate-400">
        Importe histórico registrado: S/ {Number(data?.recaudacionHistorica.monto || 0).toFixed(2)} en {data?.recaudacionHistorica.pasajes ?? 0} pagos.
      </div>
    </div>
  );
};
