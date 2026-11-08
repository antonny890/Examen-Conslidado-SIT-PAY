import React, { useState, useEffect } from 'react';
import { Users, Plus, Search, KeyRound } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export const DriversPage: React.FC = () => {
  const { user } = useAuth();
  const [drivers, setDrivers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState(user?.empresaId || '');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');

  // Modal registrar chofer
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [dni, setDni] = useState('');
  const [licencia, setLicencia] = useState('');
  const [vehiculoId, setVehiculoId] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetCreateDriverForm = () => {
    setEmail('');
    setPassword('');
    setNombres('');
    setApellidos('');
    setDni('');
    setLicencia('');
    setVehiculoId('');
    setFormError('');
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async (companyId = selectedCompanyId) => {
    try {
      let activeCompanyId = companyId;
      if (user?.rol === 'SUPER_ADMIN') {
        const companiesResponse = await api.get('/admin/companies');
        const activeCompanies = companiesResponse.data.data.filter((company: any) => company.activo);
        setCompanies(activeCompanies);
        if (!activeCompanyId || !activeCompanies.some((company: any) => company.id === activeCompanyId)) {
          activeCompanyId = activeCompanies[0]?.id || '';
        }
        setSelectedCompanyId(activeCompanyId);
      }
      const res = await api.get('/vehicles', {
        params: activeCompanyId ? { empresaId: activeCompanyId } : {},
      });
      if (res.data.success) {
        setVehicles(res.data.data);
        setDrivers(res.data.data.filter((v: any) => v.chofer_id));
      }
      setLoadError('');
    } catch (error: any) {
      setLoadError(error.response?.data?.message || 'No se pudo cargar la flota de la empresa.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);
    try {
      await api.post('/company/drivers', {
        email,
        password,
        nombres,
        apellidos,
        dni,
        numeroLicencia: licencia,
        categoriaLicencia: 'A-IIIa',
        vehiculoId,
        ...(user?.rol === 'SUPER_ADMIN' ? { empresaId: selectedCompanyId } : {}),
      });
      alert('Chofer registrado con éxito.');
      setIsOpenModal(false);
      resetCreateDriverForm();
      fetchDrivers();
    } catch (error: any) {
      setFormError(error.response?.data?.message || 'No se pudo registrar el chofer. Inténtalo nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const availableVehicles = vehicles.filter((vehicle) => !vehicle.chofer_id);

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
          onClick={() => {
            resetCreateDriverForm();
            setIsOpenModal(true);
            void fetchDrivers();
          }}
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

        {loadError && (
          <div role="alert" className="px-4 py-3 text-xs text-red-300 bg-red-500/10 border-b border-red-500/20">
            {loadError}
          </div>
        )}

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
              {!loading && !loadError && drivers.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 px-4 text-center text-slate-400">
                    No hay choferes registrados para esta empresa.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Registrar Chofer */}
      {isOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 text-slate-100 shadow-2xl">
            <h3 className="text-base font-bold text-white">Registrar Nuevo Chofer</h3>
            <form onSubmit={handleCreateDriver} className="space-y-3 text-xs">
              {user?.rol === 'SUPER_ADMIN' && (
                <div>
                  <label className="font-semibold text-slate-300">Empresa</label>
                  <select
                    value={selectedCompanyId}
                    onChange={(e) => {
                      setSelectedCompanyId(e.target.value);
                      setVehiculoId('');
                      void fetchDrivers(e.target.value);
                    }}
                    required
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="">Selecciona una empresa</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.nombre_comercial}
                      </option>
                    ))}
                  </select>
                </div>
              )}
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

              <div>
                <label htmlFor="driver-initial-password" className="flex items-center gap-1 font-semibold text-slate-300">
                  <KeyRound className="h-3.5 w-3.5" />
                  Contraseña inicial
                </label>
                <input
                  id="driver-initial-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="Mínimo 8 caracteres"
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  El chofer usará esta contraseña para ingresar y podrá cambiarla desde su cuenta.
                </p>
              </div>

              <div>
                <label htmlFor="driver-vehicle" className="font-semibold text-slate-300">
                  Placa / Flota asignada *
                </label>
                <select
                  id="driver-vehicle"
                  value={vehiculoId}
                  onChange={(e) => setVehiculoId(e.target.value)}
                  required
                  disabled={availableVehicles.length === 0}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white disabled:opacity-60"
                >
                  <option value="">
                    {availableVehicles.length === 0
                      ? 'No hay vehículos disponibles'
                      : 'Selecciona una placa registrada'}
                  </option>
                  {availableVehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.placa} — {vehicle.cuenca_codigo || 'Flota'} {vehicle.cuenca_nombre ? `• ${vehicle.cuenca_nombre}` : ''}
                    </option>
                  ))}
                </select>
                {availableVehicles.length === 0 && (
                  <p className="mt-1 text-[11px] text-amber-300">
                    Registra primero un vehículo en Gestión de Flota o libera una placa asignada.
                  </p>
                )}
              </div>

              {formError && (
                <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-red-300">
                  {formError}
                </p>
              )}

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpenModal(false);
                    resetCreateDriverForm();
                  }}
                  className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || availableVehicles.length === 0}
                  className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Registrando...' : 'Crear Chofer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
