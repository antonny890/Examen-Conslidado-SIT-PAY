import React, { useState, useEffect } from 'react';
import { GraduationCap, Check, X, Eye, Clock, ShieldCheck, AlertCircle } from 'lucide-react';
import { api } from '../../services/api';

export const PreferentialReviewPage: React.FC = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [observation, setObservation] = useState('');
  const [expirationDate, setExpirationDate] = useState('2026-12-31');

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await api.get('/preferential/admin/all');
      if (res.data.success) {
        setRequests(res.data.data);
      }
    } catch (_) {} finally {
      setLoading(false);
    }
  };

  const handleReview = async (decision: 'APROBADA' | 'RECHAZADA') => {
    if (!selectedRequest) return;
    try {
      await api.put(`/preferential/admin/${selectedRequest.id}/review`, {
        decision,
        observacion: observation,
        fechaVencimiento: decision === 'APROBADA' ? expirationDate : null,
      });
      alert(`Solicitud ${decision.toLowerCase()} con éxito.`);
      setSelectedRequest(null);
      setObservation('');
      fetchRequests();
    } catch (_) {
      alert('Error al procesar la revisión.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">
          Fiscalización y Aprobación de Medio Pasaje (Ley 26271)
        </h1>
        <p className="text-xs text-slate-400">
          Valida las fotografías del carné universitario o escolar para otorgar el 50 % de descuento legal de 05:00 a 24:00 horas.
        </p>
      </div>

      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/40">
                <th className="py-3 px-4">Pasajero Solicitante</th>
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4">Institución Educativa</th>
                <th className="py-3 px-4">Método de Verificación</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {requests.map((r) => (
                <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-bold text-white">{r.nombres} {r.apellidos}</div>
                    <div className="text-[11px] text-slate-400">DNI: {r.numero_documento}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      {r.tipo_preferencial}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-200">
                    {r.institucion_educativa}
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px]">
                    {r.metodo_verificacion === 'CORREO_INSTITUCIONAL' ? (
                      <span className="text-emerald-400">Correo .edu.pe (Auto)</span>
                    ) : (
                      <span className="text-amber-400">Foto del Carné</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        r.estado === 'APROBADA'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : r.estado === 'PENDIENTE'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}
                    >
                      {r.estado}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => setSelectedRequest(r)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
                    >
                      Revisar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Revisión de Carné */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 text-slate-100 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white">Revisión de Carné Universitario / Escolar</h3>
              <button onClick={() => setSelectedRequest(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Estudiante:</span>
                <span className="font-bold text-white">{selectedRequest.nombres} {selectedRequest.apellidos}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Institución Educativa:</span>
                <span className="font-bold text-white">{selectedRequest.institucion_educativa}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Tipo de Pase:</span>
                <span className="font-bold text-emerald-400">{selectedRequest.tipo_preferencial} (50 %)</span>
              </div>
            </div>

            {/* Imagen del carné */}
            <div className="bg-slate-950 p-2 rounded-xl border border-slate-800 flex items-center justify-center">
              <img
                src={selectedRequest.foto_carne_url || 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=400'}
                alt="Carné del Estudiante"
                className="max-h-52 object-contain rounded-lg"
              />
            </div>

            {/* Inputs de decisión */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-300">Fecha de Vencimiento de la Acreditación</label>
                <input
                  type="date"
                  value={expirationDate}
                  onChange={(e) => setExpirationDate(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-300">Observación (Opcional o motivo de rechazo)</label>
                <textarea
                  value={observation}
                  onChange={(e) => setObservation(e.target.value)}
                  placeholder="Carné verificado conforme a los lineamientos de la Ley 26271..."
                  rows={2}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder:text-slate-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleReview('RECHAZADA')}
                className="py-2.5 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-bold text-xs"
              >
                Rechazar Solicitud
              </button>
              <button
                type="button"
                onClick={() => handleReview('APROBADA')}
                className="py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs"
              >
                Aprobar Medio Pasaje
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
