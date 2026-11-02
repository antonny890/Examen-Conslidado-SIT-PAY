import React, { useEffect, useState } from 'react';
import { Calendar, Clock, Pencil, ShieldCheck, X } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface Fare {
  id: number;
  nombre: string;
  tipo_pasajero: 'NORMAL' | 'UNIVERSITARIA';
  monto: string | number;
  porcentaje_descuento: string | number;
  hora_inicio: string;
  hora_fin: string;
  activo: boolean;
}

const demoFares: Fare[] = [
  {
    id: 1,
    nombre: 'Tarifa Normal',
    tipo_pasajero: 'NORMAL',
    monto: 1,
    porcentaje_descuento: 0,
    hora_inicio: '00:00:00',
    hora_fin: '23:59:59',
    activo: true,
  },
  {
    id: 2,
    nombre: 'Tarifa Universitaria',
    tipo_pasajero: 'UNIVERSITARIA',
    monto: 0.5,
    porcentaje_descuento: 50,
    hora_inicio: '05:00:00',
    hora_fin: '23:59:59',
    activo: true,
  },
];

export const FaresConfigurationPage: React.FC = () => {
  const { isDemoMode } = useAuth();
  const [fares, setFares] = useState<Fare[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedFare, setSelectedFare] = useState<Fare | null>(null);
  const [form, setForm] = useState({ nombre: '', monto: '', porcentajeDescuento: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchFares = async () => {
      if (isDemoMode) {
        setFares(demoFares);
        setLoading(false);
        return;
      }

      try {
        const response = await api.get('/fares');
        if (response.data.success) {
          setFares(
            (response.data.data as Fare[]).filter(
              (fare) => ['NORMAL', 'UNIVERSITARIA'].includes(fare.tipo_pasajero),
            ),
          );
        }
      } catch (requestError: any) {
        setError(requestError.response?.data?.message || 'No se pudieron cargar las tarifas.');
      } finally {
        setLoading(false);
      }
    };

    void fetchFares();
  }, [isDemoMode]);

  const startEditing = (fare: Fare) => {
    setSelectedFare(fare);
    setForm({
      nombre: fare.nombre,
      monto: String(fare.monto),
      porcentajeDescuento: String(fare.porcentaje_descuento),
    });
    setError('');
  };

  const saveFare = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedFare) return;
    const amount = Number(form.monto);
    const discount = Number(form.porcentajeDescuento);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('El monto debe ser mayor que cero.');
      return;
    }
    if (!Number.isFinite(discount) || discount < 0 || discount > 100) {
      setError('El descuento debe estar entre 0 y 100 %.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      let updatedFare: Fare;
      if (isDemoMode) {
        updatedFare = {
          ...selectedFare,
          nombre: form.nombre.trim(),
          monto: amount,
          porcentaje_descuento: discount,
        };
      } else {
        const response = await api.put(`/fares/${selectedFare.id}`, {
          nombre: form.nombre.trim(),
          monto: amount,
          porcentajeDescuento: discount,
        });
        updatedFare = response.data.data;
      }
      setFares((current) =>
        current.map((fare) => (fare.id === updatedFare.id ? updatedFare : fare)),
      );
      setSelectedFare(null);
    } catch (requestError: any) {
      setError(requestError.response?.data?.message || 'No se pudo guardar la tarifa.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-bold tracking-tight text-white">
          Configuración de tarifas
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          Solo el Super Admin puede cambiar los importes. Hay dos categorías: Normal y Universitaria.
        </p>
      </header>

      {isDemoMode && (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
          Modo demostración: los cambios se muestran localmente y no se guardan en el servidor.
        </p>
      )}
      {error && !selectedFare && (
        <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-200">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-slate-400">Cargando tarifas…</p>
      ) : fares.length !== 2 ? (
        <p role="alert" className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
          Se esperaban las tarifas Normal y Universitaria. Verifica que la migración de tarifas esté aplicada.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {fares.map((fare) => (
            <article key={fare.id} className="relative space-y-5 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
              <div className="flex items-center justify-between gap-3">
                <span className={`rounded border px-2.5 py-1 font-mono text-xs font-bold ${fare.tipo_pasajero === 'UNIVERSITARIA' ? 'border-blue-500/20 bg-blue-500/10 text-blue-300' : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'}`}>
                  {fare.tipo_pasajero === 'NORMAL' ? 'NORMAL · PARA TODOS' : 'UNIVERSITARIA'}
                </span>
                <span className={`text-[10px] font-bold ${fare.activo ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {fare.activo ? 'VIGENTE' : 'DESACTIVADA'}
                </span>
              </div>

              <div>
                <h2 className="font-bold text-white">{fare.nombre}</h2>
                <div className="mt-1 font-mono text-4xl font-black text-white">
                  S/ {Number(fare.monto).toFixed(2)}
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  Descuento: <strong className="text-emerald-400">{Number(fare.porcentaje_descuento)} %</strong>
                </p>
              </div>

              <div className="space-y-2 border-t border-slate-800 pt-3 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-slate-500" />
                  <span>Horario: {fare.hora_inicio.slice(0, 5)} a {fare.hora_fin.slice(0, 5)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-slate-500" />
                  <span>{fare.tipo_pasajero === 'NORMAL' ? 'Todos los días' : 'Días laborables'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-3.5 w-3.5 text-slate-500" />
                  <span>{fare.tipo_pasajero === 'UNIVERSITARIA' ? 'Acreditación por correo institucional' : 'Tarifa general'}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => startEditing(fare)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-800 py-2.5 text-xs font-bold text-slate-200 transition-colors hover:bg-slate-700"
              >
                <Pencil className="h-3.5 w-3.5" />
                Modificar tarifa
              </button>
            </article>
          ))}
        </div>
      )}

      {selectedFare && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <form onSubmit={saveFare} className="w-full max-w-md space-y-4 rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-white">Editar {selectedFare.tipo_pasajero.toLowerCase()}</h2>
                <p className="mt-1 text-xs text-slate-400">Solo Super Admin puede guardar este cambio.</p>
              </div>
              <button type="button" onClick={() => setSelectedFare(null)} aria-label="Cerrar" className="rounded-lg p-2 text-slate-400 hover:bg-slate-800">
                <X className="h-4 w-4" />
              </button>
            </div>
            {error && <p role="alert" className="text-xs text-red-300">{error}</p>}
            <label className="block space-y-1 text-xs text-slate-300">
              <span>Nombre de la tarifa</span>
              <input required value={form.nombre} onChange={(event) => setForm((current) => ({ ...current, nombre: event.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-emerald-500" />
            </label>
            <label className="block space-y-1 text-xs text-slate-300">
              <span>Monto (S/)</span>
              <input required type="number" min="0.01" step="0.01" value={form.monto} onChange={(event) => setForm((current) => ({ ...current, monto: event.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-emerald-500" />
            </label>
            <label className="block space-y-1 text-xs text-slate-300">
              <span>Descuento (%)</span>
              <input required type="number" min="0" max="100" step="0.01" value={form.porcentajeDescuento} onChange={(event) => setForm((current) => ({ ...current, porcentajeDescuento: event.target.value }))} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-emerald-500" />
            </label>
            <button type="submit" disabled={saving} className="w-full rounded-xl bg-emerald-500 py-2.5 text-xs font-bold text-slate-950 disabled:opacity-50">
              {saving ? 'Guardando…' : 'Guardar tarifa'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
