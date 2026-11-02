import React, { useState, useEffect } from 'react';
import { Building2, Bus, Users } from 'lucide-react';
import { api } from '../../services/api';

export const SuperAdminDashboardPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGlobalStats();
  }, []);

  const fetchGlobalStats = async () => {
    try {
      const res = await api.get('/admin/dashboard');
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (_) {} finally {
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
          Vista de evaluación local. Las métricas requieren conexión con el servidor y la base de datos.
        </p>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl space-y-1">
          <div className="text-xs text-slate-400">Pagos bancarios confirmados</div>
          <div className="text-xl font-black text-amber-300">No disponible</div>
          <div className="text-[11px] text-slate-500 font-mono">
            Integración bancaria pendiente
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl space-y-1">
          <div className="text-xs text-slate-400">Empresas Concesionarias</div>
          <div className="text-2xl font-black font-mono text-blue-400">
            {data?.metricas?.totalEmpresas ?? 'Sin datos'}{data?.metricas?.totalEmpresas != null ? ' Operadoras' : ''}
          </div>
          <div className="text-[11px] text-slate-500">10 Cuencas (C2 a C11)</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl space-y-1">
          <div className="text-xs text-slate-400">Flota con QR Activo</div>
          <div className="text-2xl font-black font-mono text-purple-400">
            {data?.metricas?.totalVehiculos ?? 'Sin datos'}{data?.metricas?.totalVehiculos != null ? ' Vehículos' : ''}
          </div>
          <div className="text-[11px] text-slate-500">Supervisados por MPA</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl space-y-1">
          <div className="text-xs text-slate-400">Usuarios registrados</div>
          <div className="text-2xl font-black font-mono text-white">
            {data?.metricas?.totalUsuarios ?? 'Sin datos'}
          </div>
          <div className="text-[11px] text-slate-500">Pasajeros y Choferes</div>
        </div>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 text-sm text-amber-200">
        Los gráficos de recaudación se habilitarán cuando haya pagos validados por una entidad financiera. Esta pantalla no muestra datos simulados como resultados reales.
      </div>
    </div>
  );
};
