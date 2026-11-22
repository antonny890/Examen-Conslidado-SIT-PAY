import React, { useCallback, useEffect, useState } from 'react';
import { Flag } from 'lucide-react';
import { api } from '../../services/api';

type AliasReport = {
  id: string;
  alias_reportado: string;
  alias_actual: string | null;
  usuario_objetivo_email: string | null;
  usuario_reportante_email: string | null;
  motivo: string;
  detalle: string | null;
  created_at: string;
};

const reasonLabels: Record<string, string> = {
  INSULTO: 'Insulto o vulgaridad',
  DISCURSO_DE_ODIO: 'Discurso de odio',
  SPAM: 'Spam',
  SUPLANTACION: 'Suplantación',
  OTRO: 'Otro',
};

export const AliasReportsPage: React.FC = () => {
  const [reports, setReports] = useState<AliasReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const response = await api.get('/admin/alias-reports');
      if (response.data.success && Array.isArray(response.data.data)) {
        setReports(response.data.data);
      } else {
        setLoadError('El servidor devolvió una lista de denuncias inválida.');
      }
    } catch (error: any) {
      setLoadError(
        error.response?.data?.message ||
          'No se pudieron cargar las denuncias. Inténtalo nuevamente.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchReports();
  }, [fetchReports]);

  const reviewReport = async (
    report: AliasReport,
    action: 'RETIRAR' | 'DESCARTAR',
  ) => {
    const prompt =
      action === 'RETIRAR'
        ? `¿Retirar el alias "${report.alias_reportado}" de la cuenta denunciada?`
        : `¿Descartar la denuncia del alias "${report.alias_reportado}"?`;
    if (!window.confirm(prompt)) return;

    setReviewingId(report.id);
    try {
      await api.put(`/admin/alias-reports/${report.id}`, { accion: action });
      setReports((current) => current.filter((item) => item.id !== report.id));
    } catch (error: any) {
      window.alert(
        error.response?.data?.message || 'No se pudo revisar la denuncia.',
      );
    } finally {
      setReviewingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Flag className="h-5 w-5 text-amber-400" />
          <h1 className="text-xl font-bold tracking-tight text-white">
            Denuncias de alias
          </h1>
        </div>
        <p className="mt-1 text-xs text-slate-400">
          Revisa alias reportados por los choferes. Puedes retirarlos o descartar
          la denuncia.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80">
        {loadError && (
          <div
            role="alert"
            className="border-b border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-300"
          >
            {loadError}
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 font-semibold text-slate-400">
                <th className="px-4 py-3">Alias denunciado</th>
                <th className="px-4 py-3">Cuenta</th>
                <th className="px-4 py-3">Reportado por</th>
                <th className="px-4 py-3">Motivo</th>
                <th className="px-4 py-3">Detalle</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3 text-right">Revisión</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {reports.map((report) => {
                const aliasStillCurrent =
                  report.alias_actual?.toLowerCase() ===
                  report.alias_reportado.toLowerCase();
                return (
                  <tr key={report.id} className="hover:bg-slate-800/30">
                    <td className="px-4 py-3 font-mono font-bold text-white">
                      {report.alias_reportado}
                      {!aliasStillCurrent && (
                        <div className="mt-1 text-[10px] font-normal text-amber-300">
                          Alias actual: {report.alias_actual || 'sin alias'}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {report.usuario_objetivo_email || 'Cuenta no disponible'}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {report.usuario_reportante_email || 'Chofer no disponible'}
                    </td>
                    <td className="px-4 py-3 text-amber-300">
                      {reasonLabels[report.motivo] || report.motivo}
                    </td>
                    <td className="max-w-xs px-4 py-3 text-slate-300">
                      {report.detalle || '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-400">
                      {new Date(report.created_at).toLocaleString('es-PE')}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <button
                        type="button"
                        disabled={!aliasStillCurrent || reviewingId === report.id}
                        onClick={() => void reviewReport(report, 'RETIRAR')}
                        className="mr-2 rounded-lg bg-red-500/10 px-3 py-1.5 font-semibold text-red-300 transition-colors hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                        title={
                          aliasStillCurrent
                            ? 'Retirar alias de la cuenta'
                            : 'El alias de la cuenta ya cambió'
                        }
                      >
                        Retirar
                      </button>
                      <button
                        type="button"
                        disabled={reviewingId === report.id}
                        onClick={() => void reviewReport(report, 'DESCARTAR')}
                        className="rounded-lg bg-slate-800 px-3 py-1.5 font-semibold text-slate-200 transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Descartar
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!loading && !loadError && reports.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    No hay denuncias pendientes de alias.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    Cargando denuncias...
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
