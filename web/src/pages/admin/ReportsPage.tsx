import React, { useCallback, useEffect, useState } from 'react';
import { Download, Calendar } from 'lucide-react';
import { api } from '../../services/api';

interface ReportRow {
  codigo_boleta: string;
  fecha_pago: string | null;
  placa: string;
  cuenca: string;
  tipo_tarifa_aplicada: string;
  monto: number;
  metodo_pago: string;
  pago_simulado: boolean;
}

const formatDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const ReportsPage: React.FC = () => {
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return formatDateInput(new Date(now.getFullYear(), now.getMonth(), 1));
  });
  const [endDate, setEndDate] = useState(() => {
    const now = new Date();
    return formatDateInput(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  });
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  const fetchTransactions = useCallback(async () => {
    if (startDate > endDate) {
      setError('La fecha inicial no puede ser posterior a la fecha final.');
      setRows([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await api.get('/company/report-transactions', {
        params: { fechaInicio: startDate, fechaFin: endDate },
      });
      if (!response.data.success || !Array.isArray(response.data.data)) {
        throw new Error('El servidor devolvió un reporte inválido.');
      }
      setRows(response.data.data);
    } catch (requestError: any) {
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          'No se pudieron cargar las transacciones.',
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [endDate, startDate]);

  useEffect(() => {
    void fetchTransactions();
  }, [fetchTransactions]);

  const handleExportCSV = async () => {
    if (startDate > endDate) {
      setError('La fecha inicial no puede ser posterior a la fecha final.');
      return;
    }

    setDownloading(true);
    setError('');
    try {
      const response = await api.get('/company/export-csv', {
        params: { fechaInicio: startDate, fechaFin: endDate },
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `recaudacion-sit-pay-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error: any) {
      setError(error.response?.data?.message || 'No se pudo descargar el reporte CSV.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Reportes de Recaudación y Liquidación</h1>
          <p className="text-xs text-slate-400">
            Consulta pagos registrados por rango de fechas y expórtalos a CSV. Los pagos de este prototipo son simulados.
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={downloading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all self-start"
        >
          <Download className="w-4 h-4" />
          {downloading ? 'Generando CSV...' : 'Exportar a CSV'}
        </button>
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-200">
          {error}
        </p>
      )}

      <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-500" />
          <span className="text-slate-400">Desde:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white font-mono"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400">Hasta:</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-white font-mono"
          />
        </div>
        <button
          type="button"
          onClick={() => void fetchTransactions()}
          disabled={loading}
          className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold ml-auto disabled:opacity-50"
        >
          Aplicar Filtros
        </button>
      </div>

      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/40 font-mono">
                <th className="py-3 px-4">Código Boleta</th>
                <th className="py-3 px-4">Fecha y Hora</th>
                <th className="py-3 px-4">Placa</th>
                <th className="py-3 px-4">Cuenca SIT</th>
                <th className="py-3 px-4">Tipo de Tarifa</th>
                <th className="py-3 px-4">Método</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4 text-right">Importe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {rows.map((row) => (
                <tr key={row.codigo_boleta} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-4 font-bold text-white">{row.codigo_boleta}</td>
                  <td className="py-3 px-4 text-slate-400 font-sans">
                    {row.fecha_pago ? new Date(row.fecha_pago).toLocaleString('es-PE') : '—'}
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-300">{row.placa}</td>
                  <td className="py-3 px-4 text-slate-400 font-sans">{row.cuenca}</td>
                  <td className="py-3 px-4 font-sans">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                      {row.tipo_tarifa_aplicada}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-300 font-sans">{row.metodo_pago}</td>
                  <td className="py-3 px-4">
                    <span className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-300">
                      {row.pago_simulado ? 'SIMULADO' : 'VERIFICADO'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-black text-emerald-400">
                    S/ {Number(row.monto).toFixed(2)}
                  </td>
                </tr>
              ))}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 px-4 text-center text-slate-400">
                    No hay pagos registrados para el rango seleccionado.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={7} className="py-8 px-4 text-center text-slate-400">
                    Cargando transacciones desde el servidor…
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
