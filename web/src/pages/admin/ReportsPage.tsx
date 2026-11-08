import React, { useState } from 'react';
import { Download, Filter, FileSpreadsheet, Calendar, Search } from 'lucide-react';
import { api } from '../../services/api';

export const ReportsPage: React.FC = () => {
  const [startDate, setStartDate] = useState('2026-10-01');
  const [endDate, setEndDate] = useState('2026-10-31');
  const [downloading, setDownloading] = useState(false);

  const sampleRows = [
    { code: 'BOL-20261030-000001', date: '2026-10-30 07:45:00', plate: 'V7A-890', zone: 'C3 Cayma', fare: 'NORMAL', amount: 1.0, method: 'QR' },
    { code: 'BOL-20261030-000002', date: '2026-10-30 08:12:00', plate: 'V7A-890', zone: 'C3 Cayma', fare: 'UNIVERSITARIA', amount: 0.5, method: 'QR' },
    { code: 'BOL-20261030-000003', date: '2026-10-30 08:30:00', plate: 'V8B-123', zone: 'C2 Cono Norte', fare: 'NORMAL', amount: 1.0, method: 'PLACA_MANUAL' },
  ];

  const handleExportCSV = async () => {
    setDownloading(true);
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
      alert(error.response?.data?.message || 'No se pudo descargar el reporte CSV.');
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
            Filtra por rango de fechas, cuenca y conductor para auditar la recaudación y exportar a CSV.
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

      {/* Filter Bar */}
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
        <button className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold ml-auto">
          Aplicar Filtros
        </button>
      </div>

      {/* Data Table Preview */}
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
                <th className="py-3 px-4 text-right">Importe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {sampleRows.map((r, i) => (
                <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-4 font-bold text-white">{r.code}</td>
                  <td className="py-3 px-4 text-slate-400 font-sans">{r.date}</td>
                  <td className="py-3 px-4 font-bold text-slate-300">{r.plate}</td>
                  <td className="py-3 px-4 text-slate-400 font-sans">{r.zone}</td>
                  <td className="py-3 px-4 font-sans">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                      {r.fare}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-300 font-sans">{r.method}</td>
                  <td className="py-3 px-4 text-right font-black text-emerald-400">
                    S/ {r.amount.toFixed(2)}
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
