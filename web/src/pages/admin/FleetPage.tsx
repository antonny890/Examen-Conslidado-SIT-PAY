import React, { useState, useEffect } from 'react';
import { Bus, QrCode, Plus, Search, Filter, RefreshCw, Printer } from 'lucide-react';
import { api } from '../../services/api';
import { QRModal } from '../../components/common/QRModal';

export const FleetPage: React.FC = () => {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedQR, setSelectedQR] = useState<{
    open: boolean;
    plate: string;
    svg: string;
    token: string;
    vehicleId: string;
  }>({ open: false, plate: '', svg: '', token: '', vehicleId: '' });

  // Modal para agregar vehículo
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newPlate, setNewPlate] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newUnitId, setNewUnitId] = useState('3');

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      const res = await api.get('/vehicles');
      if (res.data.success) {
        setVehicles(res.data.data);
      }
    } catch (_) {} finally {
      setLoading(false);
    }
  };

  const handleOpenQR = async (v: any) => {
    try {
      const res = await api.get(`/vehicles/${v.id}/qr`);
      if (res.data.success) {
        setSelectedQR({
          open: true,
          plate: v.placa,
          svg: res.data.data.qrSvg,
          token: res.data.data.tokenSeguro,
          vehicleId: v.id,
        });
      }
    } catch (_) {}
  };

  const handleRegenerateQR = async () => {
    if (!selectedQR.vehicleId) return;
    try {
      const res = await api.post(`/vehicles/${selectedQR.vehicleId}/regenerate-qr`);
      if (res.data.success) {
        setSelectedQR((prev) => ({
          ...prev,
          svg: res.data.data.qrSvg,
          token: res.data.data.nuevoToken,
        }));
        alert(`Código QR regenerado para la placa ${selectedQR.plate}.`);
        fetchVehicles();
      }
    } catch (_) {}
  };

  const handleCreateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/vehicles', {
        placa: newPlate,
        empresaId: 'e1000000-0000-0000-0000-000000000001',
        unidadNegocioId: parseInt(newUnitId, 10),
        modelo: newModel || 'Mercedes-Benz Urbano',
      });
      setIsAddModalOpen(false);
      setNewPlate('');
      setNewModel('');
      fetchVehicles();
    } catch (_) {
      alert('Error al registrar vehículo.');
    }
  };

  const filtered = vehicles.filter((v) =>
    v.placa.toLowerCase().includes(search.toLowerCase()) ||
    v.cuenca_nombre?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Gestión de Flota y Códigos QR Fijos</h1>
          <p className="text-xs text-slate-400">
            Cada placa del SIT posee su propio identificador QR fijo e intransferible.
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all self-start"
        >
          <Plus className="w-4 h-4" />
          Registrar Vehículo
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por placa o cuenca..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div className="text-xs text-slate-400 font-mono">
          Total: {filtered.length} vehículos
        </div>
      </div>

      {/* Fleet Grid */}
      {loading ? (
        <div className="text-slate-400 text-xs py-8">Cargando flota...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((v) => (
            <div
              key={v.id}
              className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4 hover:border-slate-700 transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xl font-black font-mono text-white tracking-wider">
                    {v.placa}
                  </div>
                  <div className="text-xs text-emerald-400 font-medium mt-0.5">
                    {v.cuenca_codigo} • {v.cuenca_nombre}
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {v.activo ? 'ACTIVO' : 'INACTIVO'}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-300 font-sans border-t border-slate-800/80 pt-3">
                <div className="flex justify-between">
                  <span className="text-slate-500">Modelo:</span>
                  <span>{v.modelo || 'Urbano'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Capacidad:</span>
                  <span>{v.capacidad_pasajeros} pasajeros</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Chofer Asignado:</span>
                  <span className="font-bold text-white">
                    {v.chofer_nombres ? `${v.chofer_nombres} ${v.chofer_apellidos}` : 'Sin Chofer'}
                  </span>
                </div>
              </div>

              {/* Botón QR */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2">
                <button
                  onClick={() => handleOpenQR(v)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 transition-colors"
                >
                  <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                  Ver / Imprimir QR Fijo
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* QR Modal */}
      <QRModal
        isOpen={selectedQR.open}
        onClose={() => setSelectedQR((prev) => ({ ...prev, open: false }))}
        plate={selectedQR.plate}
        qrSvg={selectedQR.svg}
        companyName="Transcayma Operadora S.A."
        tokenSeguro={selectedQR.token}
        onRegenerate={handleRegenerateQR}
      />

      {/* Modal Agregar Vehículo */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 text-slate-100 shadow-2xl">
            <h3 className="text-base font-bold text-white">Registrar Nuevo Vehículo al SIT</h3>
            <form onSubmit={handleCreateVehicle} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-300">Número de Placa (Única)</label>
                <input
                  type="text"
                  value={newPlate}
                  onChange={(e) => setNewPlate(e.target.value.toUpperCase())}
                  required
                  placeholder="V8C-990"
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono uppercase"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-300">Modelo / Marca</label>
                <input
                  type="text"
                  value={newModel}
                  onChange={(e) => setNewModel(e.target.value)}
                  placeholder="Volkswagen 9.160 Urbano"
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-300">Cuenca / Unidad de Negocio</label>
                <select
                  value={newUnitId}
                  onChange={(e) => setNewUnitId(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                >
                  <option value="2">C2 Cono Norte - Cerro Colorado</option>
                  <option value="3">C3 Cayma</option>
                  <option value="4">C4 Selva Alegre - Miraflores</option>
                  <option value="6">C6 Paucarpata - Miguel Grau</option>
                </select>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold"
                >
                  Guardar y Generar QR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
