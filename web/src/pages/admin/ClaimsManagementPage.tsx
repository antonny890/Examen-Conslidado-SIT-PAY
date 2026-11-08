import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export const ClaimsManagementPage: React.FC = () => {
  const { isSuperAdmin } = useAuth();
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selectedClaim, setSelectedClaim] = useState<any | null>(null);
  const [responseMsg, setResponseMsg] = useState('');
  const [statusVal, setStatusVal] = useState('RESUELTO');

  useEffect(() => {
    fetchClaims();
  }, []);

  const fetchClaims = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await api.get('/claims');
      if (res.data.success) {
        setClaims(res.data.data);
      } else {
        setLoadError('No se pudieron cargar los reclamos.');
      }
    } catch (error: any) {
      setLoadError(error.response?.data?.message || 'No se pudieron cargar los reclamos. Inténtalo nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClaim) return;
    try {
      await api.put(`/claims/${selectedClaim.id}/resolve`, {
        estado: statusVal,
        respuesta: responseMsg,
      });
      alert('Respuesta registrada formalmente en el Libro de Reclamaciones.');
      setSelectedClaim(null);
      setResponseMsg('');
      fetchClaims();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Error al responder reclamo.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">
          {isSuperAdmin ? 'Incidencias dirigidas a SIT-Pay' : 'Libro de Reclamaciones e Incidencias (Ley 29571)'}
        </h1>
        <p className="text-xs text-slate-400">
          {isSuperAdmin
            ? 'Revisa las incidencias generales reportadas por los pasajeros, incluyendo la empresa, transporte y tipo de problema seleccionado.'
            : 'Atiende y resuelve en plazo legal las incidencias de cobro indebido, negativa de medio pasaje o maltrato.'}
        </p>
      </div>

      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden">
        {loadError && (
          <div role="alert" className="px-4 py-3 text-xs text-red-300 bg-red-500/10 border-b border-red-500/20">
            {loadError}
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/40">
                <th className="py-3 px-4">Código Reclamo</th>
                <th className="py-3 px-4">Pasajero</th>
                <th className="py-3 px-4">Dirigido a</th>
                <th className="py-3 px-4">Transporte</th>
                <th className="py-3 px-4">Tipo Incidencia</th>
                <th className="py-3 px-4">Descripción de los Hechos</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {claims.map((c) => (
                <tr key={c.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-white">{c.codigo_reclamo}</td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-white">{c.pasajero_nombres} {c.pasajero_apellidos}</div>
                    <div className="text-[11px] text-slate-400">{c.pasajero_email}</div>
                  </td>
                  <td className="py-3 px-4 text-slate-300">
                    {c.destinatario === 'EMPRESA' ? 'Empresa' : 'Super Admin'}
                  </td>
                  <td className="py-3 px-4 text-slate-300">
                    {c.vehiculo_placa || 'No especificado'}
                    {c.empresa_nombre && (
                      <div className="text-[11px] text-slate-400">{c.empresa_nombre}</div>
                    )}
                  </td>
                  <td className="py-3 px-4 font-semibold text-amber-400">
                    {(c.tipo_incidencia || '').replace(/_/g, ' ')}
                  </td>
                  <td className="py-3 px-4 text-slate-300 max-w-xs truncate">
                    {c.descripcion}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        c.estado === 'RESUELTO'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {c.estado}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => {
                        setSelectedClaim(c);
                        setResponseMsg(c.respuesta_resolucion || '');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
                    >
                      Atender
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && !loadError && claims.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 px-4 text-center text-slate-400">
                    {isSuperAdmin
                      ? 'Aún no hay incidencias dirigidas a SIT-Pay.'
                      : 'Aún no hay reclamos dirigidos a tu empresa.'}
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={8} className="py-8 px-4 text-center text-slate-400">
                    Cargando reclamos...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Atender Reclamo */}
      {selectedClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 text-slate-100 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-base text-white">Responder Reclamo {selectedClaim.codigo_reclamo}</h3>
              <button onClick={() => setSelectedClaim(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs bg-slate-950 p-3 rounded-xl border border-slate-800">
              <div>
                <span className="text-slate-400">Empresa y transporte: </span>
                <span className="text-slate-200">
                  {selectedClaim.empresa_nombre || 'No especificada'}
                  {selectedClaim.vehiculo_placa ? ` · ${selectedClaim.vehiculo_placa}` : ''}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Tipo de incidencia: </span>
                <span className="text-amber-300">
                  {(selectedClaim.tipo_incidencia || 'OTRO').replace(/_/g, ' ')}
                </span>
              </div>
              <div className="text-slate-400">Descripción del Pasajero:</div>
              <p className="text-slate-200 italic">{selectedClaim.descripcion}</p>
            </div>

            <form onSubmit={handleResolve} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-300">
                  {isSuperAdmin ? 'Resolución de SIT-Pay' : 'Resolución de la Concesionaria'}
                </label>
                <select
                  value={statusVal}
                  onChange={(e) => setStatusVal(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                >
                  <option value="RESUELTO">RESUELTO (Favorable / Aclarado)</option>
                  <option value="RECHAZADO">RECHAZADO (Improcedente)</option>
                  <option value="EN_REVISION">EN REVISIÓN</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-300">Detalle formal de la respuesta</label>
                <textarea
                  value={responseMsg}
                  onChange={(e) => setResponseMsg(e.target.value)}
                  required
                  rows={4}
                  placeholder="Estimado usuario, tras auditar los registros de cobro de la unidad..."
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder:text-slate-600"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedClaim(null)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold"
                >
                  Enviar Resolución Formal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
