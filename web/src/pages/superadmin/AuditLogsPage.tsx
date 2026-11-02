import React, { useState, useEffect } from 'react';
import { ShieldCheck, Search, Filter } from 'lucide-react';
import { api } from '../../services/api';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await api.get('/admin/audit-logs');
      if (res.data.success) {
        setLogs(res.data.data);
      }
    } catch (_) {} finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">
          Registro Inmutable de Auditoría (Ley 29733)
        </h1>
        <p className="text-xs text-slate-400">
          Trazabilidad obligatoria de acciones administrativas sensibles: cambios tarifarios, reasignación de choferes y resoluciones.
        </p>
      </div>

      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/40 font-mono">
                <th className="py-3 px-4">Acción Realizada</th>
                <th className="py-3 px-4">Módulo</th>
                <th className="py-3 px-4">Usuario Responsable</th>
                <th className="py-3 px-4">Dirección IP</th>
                <th className="py-3 px-4 text-right">Fecha y Hora</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {logs.map((l) => (
                <tr key={l.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-4 font-bold text-emerald-400">{l.accion}</td>
                  <td className="py-3 px-4 text-slate-300">{l.modulo}</td>
                  <td className="py-3 px-4 text-white font-sans">{l.usuario_email || 'Sistema / SuperAdmin'}</td>
                  <td className="py-3 px-4 text-slate-400">{l.ip_address || '127.0.0.1'}</td>
                  <td className="py-3 px-4 text-right text-slate-400 font-sans text-[11px]">
                    {new Date(l.created_at).toLocaleString('es-PE')}
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
