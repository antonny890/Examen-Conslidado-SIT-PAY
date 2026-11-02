import React, { useState, useEffect } from 'react';
import { Users, Plus, Search, ShieldCheck, Bus, KeyRound } from 'lucide-react';
import { api } from '../../services/api';

export const DriversPage: React.FC = () => {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal registrar chofer
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('SitPay2026!');
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [dni, setDni] = useState('');
  const [licencia, setLicencia] = useState('');

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    try {
      const res = await api.get('/vehicles');
      if (res.data.success) {
        // En base a vehículos obtenemos los choferes vinculados
        setDrivers(res.data.data.filter((v: any) => v.chofer_id));
      }
    } catch (_) {} finally {
      setLoading(false);
    }
  };

  const handleCreateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/company/drivers', {
        email,
        password,
        nombres,
        apellidos,
        dni,
        numeroLicencia: licencia,
        categoriaLicencia: 'A-IIIa',
      });
      alert('Chofer registrado con éxito.');
      setIsOpenModal(false);
      fetchDrivers();
    } catch (_) {
      alert('Error al registrar chofer.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Gestión de Choferes</h1>
          <p className="text-xs text-slate-400">
            Cada chofer está vinculado a UNA placa fija. Al loguearse en la app móvil recibe las alertas de ese vehículo.
          </p>
        </div>
        <button
          onClick={() => setIsOpenModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all self-start"
        >
          <Plus className="w-4 h-4" />
          Registrar Chofer
        </button>
      </div>

      {/* Driver List Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="relative max-w-sm flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o placa..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/40">
                <th className="py-3 px-4">Conductor</th>
                <th className="py-3 px-4">Licencia MTC</th>
                <th className="py-3 px-4">Placa Fija Asignada</th>
                <th className="py-3 px-4">Cuenca SIT</th>
                <th className="py-3 px-4">Estado Operativo</th>
                <th className="py-3 px-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {drivers.map((d) => (
                <tr key={d.chofer_id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-bold text-white">{d.chofer_nombres} {d.chofer_apellidos}</div>
                    <div className="text-[11px] text-slate-400">Usuario de Aplicación Móvil</div>
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-slate-300">
                    {d.numero_licencia || 'Q40192837'} (A-IIIa)
                  </td>
                  <td className="py-3 px-4 font-mono font-black text-emerald-400 text-sm">
                    {d.placa}
                  </td>
                  <td className="py-3 px-4 text-slate-300">
                    {d.cuenca_codigo} • {d.cuenca_nombre}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      EN RUTA
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => alert(`Reasignación de placa para ${d.chofer_nombres}`)}
                      className="text-xs text-emerald-400 hover:underline font-semibold"
                    >
                      Reasignar Placa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Registrar Chofer */}
      {isOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 text-slate-100 shadow-2xl">
            <h3 className="text-base font-bold text-white">Registrar Nuevo Chofer</h3>
            <form onSubmit={handleCreateDriver} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-300">Nombres</label>
                  <input
                    type="text"
                    value={nombres}
                    onChange={(e) => setNombres(e.target.value)}
                    required
                    placeholder="Carlos"
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-300">Apellidos</label>
                  <input
                    type="text"
                    value={apellidos}
                    onChange={(e) => setApellidos(e.target.value)}
                    required
                    placeholder="Vilca"
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-300">Número de DNI</label>
                <input
                  type="text"
                  value={dni}
                  onChange={(e) => setDni(e.target.value)}
                  required
                  maxLength={8}
                  placeholder="40192837"
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300">Número de Licencia MTC</label>
                <input
                  type="text"
                  value={licencia}
                  onChange={(e) => setLicencia(e.target.value)}
                  required
                  placeholder="Q40192837"
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono uppercase"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300">Correo Electrónico de Acceso</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="chofer.nuevo@sitpay.gob.pe"
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsOpenModal(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold"
                >
                  Crear Chofer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
