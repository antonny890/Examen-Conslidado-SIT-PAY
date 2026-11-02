import React, { useEffect, useState } from 'react';
import { UserPlus, UserRoundCheck, UserRoundX } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface Administrator {
  id: string;
  email: string;
  estado: string;
  rol: 'SUPER_ADMIN' | 'ADMIN_EMPRESA';
  nombres: string;
  apellidos: string;
  empresa_id?: string | null;
  empresa_nombre?: string | null;
}

interface CompanyOption {
  id: string;
  nombre_comercial: string;
  activo: boolean;
}

const demoCompanies: CompanyOption[] = [
  { id: 'demo-company-transcayma', nombre_comercial: 'Transcayma S.A.', activo: true },
  { id: 'demo-company-aqp', nombre_comercial: 'AQP Masivo S.A.C.', activo: true },
  { id: 'demo-company-union', nombre_comercial: 'Unión AQP S.A.', activo: true },
];

const demoAdministrators: Administrator[] = [
  {
    id: 'demo-super-admin',
    email: 'superadmin@sitpay.gob.pe',
    estado: 'ACTIVO',
    rol: 'SUPER_ADMIN',
    nombres: 'Hernán',
    apellidos: 'Peralta Mendoza',
  },
  {
    id: 'demo-admin-empresa',
    email: 'admin.transcayma@sitpay.gob.pe',
    estado: 'ACTIVO',
    rol: 'ADMIN_EMPRESA',
    nombres: 'Gabriela',
    apellidos: 'Torres Valdivia',
    empresa_id: demoCompanies[0].id,
    empresa_nombre: demoCompanies[0].nombre_comercial,
  },
];

const emptyForm = {
  nombres: '',
  apellidos: '',
  dni: '',
  email: '',
  password: '',
  empresaId: '',
};

export const AdministratorsPage: React.FC = () => {
  const { isDemoMode, user } = useAuth();
  const [administrators, setAdministrators] = useState<Administrator[]>([]);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (isDemoMode) {
        setAdministrators(demoAdministrators);
        setCompanies(demoCompanies);
        setLoading(false);
        return;
      }

      try {
        const [usersResponse, companiesResponse] = await Promise.all([
          api.get('/admin/users'),
          api.get('/admin/companies'),
        ]);
        if (usersResponse.data.success) setAdministrators(usersResponse.data.data);
        if (companiesResponse.data.success) {
          setCompanies(companiesResponse.data.data.filter((company: CompanyOption) => company.activo));
        }
      } catch (requestError: any) {
        setError(requestError.response?.data?.message || 'No se pudieron cargar las cuentas administrativas.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [isDemoMode]);

  const availableCompanies = companies.filter(
    (company) => !administrators.some((admin) => admin.empresa_id === company.id),
  );

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!/^\d{8}$/.test(form.dni)) {
      setError('El DNI debe contener exactamente 8 dígitos.');
      return;
    }

    setSaving(true);
    try {
      if (isDemoMode) {
        const company = companies.find((item) => item.id === form.empresaId);
        setAdministrators((current) => [
          ...current,
          {
            id: `demo-admin-${Date.now()}`,
            email: form.email.trim().toLowerCase(),
            estado: 'ACTIVO',
            rol: 'ADMIN_EMPRESA',
            nombres: form.nombres.trim(),
            apellidos: form.apellidos.trim(),
            empresa_id: company?.id,
            empresa_nombre: company?.nombre_comercial,
          },
        ]);
      } else {
        const response = await api.post('/admin/users', form);
        setAdministrators((current) => [...current, response.data.data]);
      }
      setForm(emptyForm);
      setFormOpen(false);
    } catch (requestError: any) {
      setError(requestError.response?.data?.message || 'No se pudo crear el administrador.');
    } finally {
      setSaving(false);
    }
  };

  const handleStatus = async (administrator: Administrator) => {
    const nextStatus = administrator.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    if (administrator.id === user?.id && nextStatus === 'INACTIVO') {
      setError('No puedes desactivar tu propia cuenta.');
      return;
    }
    if (
      nextStatus === 'INACTIVO' &&
      !window.confirm(`¿Desactivar la cuenta de ${administrator.nombres} ${administrator.apellidos}?`)
    ) {
      return;
    }

    setError('');
    try {
      if (!isDemoMode) {
        await api.put(`/admin/users/${administrator.id}/status`, { estado: nextStatus });
      }
      setAdministrators((current) =>
        current.map((item) =>
          item.id === administrator.id ? { ...item, estado: nextStatus } : item,
        ),
      );
    } catch (requestError: any) {
      setError(requestError.response?.data?.message || 'No se pudo actualizar la cuenta.');
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">Gestión de Administradores</h1>
          <p className="mt-1 text-xs text-slate-400">
            Crea administradores de empresa y activa o desactiva accesos.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFormOpen((open) => !open)}
          disabled={availableCompanies.length === 0}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <UserPlus className="h-4 w-4" />
          Añadir administrador
        </button>
      </header>

      {isDemoMode && (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
          Modo demostración: los cambios son locales y no crean cuentas reales.
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-200">
          {error}
        </p>
      )}

      {formOpen && (
        <form onSubmit={handleCreate} className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-5 md:grid-cols-2">
          <h2 className="md:col-span-2 text-sm font-bold text-white">Nueva cuenta de administrador de empresa</h2>
          {([
            ['nombres', 'Nombres', 'Nombre'],
            ['apellidos', 'Apellidos', 'Apellidos'],
            ['dni', 'DNI', '8 dígitos'],
            ['email', 'Correo electrónico', 'admin@empresa.pe'],
            ['password', 'Contraseña inicial', 'Mínimo 8 caracteres'],
          ] as const).map(([field, label, placeholder]) => (
            <label key={field} className="space-y-1 text-xs text-slate-300">
              <span>{label}</span>
              <input
                type={field === 'password' ? 'password' : field === 'email' ? 'email' : 'text'}
                required
                minLength={field === 'password' ? 8 : undefined}
                maxLength={field === 'dni' ? 8 : undefined}
                value={form[field]}
                onChange={(event) => setForm((current) => ({ ...current, [field]: event.target.value }))}
                placeholder={placeholder}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-emerald-500"
              />
            </label>
          ))}
          <label className="space-y-1 text-xs text-slate-300">
            <span>Empresa</span>
            <select
              required
              value={form.empresaId}
              onChange={(event) => setForm((current) => ({ ...current, empresaId: event.target.value }))}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-emerald-500"
            >
              <option value="">Selecciona una empresa disponible</option>
              {availableCompanies.map((company) => (
                <option key={company.id} value={company.id}>{company.nombre_comercial}</option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={saving} className="rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-slate-950 disabled:opacity-50 md:col-span-2">
            {saving ? 'Creando…' : 'Crear administrador'}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-slate-400">Cargando administradores…</p>
      ) : administrators.length === 0 ? (
        <p className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 text-sm text-slate-400">
          No hay administradores registrados.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/80">
          <table className="w-full min-w-[680px] text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-950/40 text-slate-400">
              <tr>
                <th className="px-4 py-3">Administrador</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Empresa</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acceso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {administrators.map((administrator) => (
                <tr key={administrator.id}>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-white">{administrator.nombres} {administrator.apellidos}</div>
                    <div className="mt-1 text-slate-400">{administrator.email}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {administrator.rol === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin Empresa'}
                  </td>
                  <td className="px-4 py-3 text-slate-300">{administrator.empresa_nombre || 'Fiscalización global'}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${administrator.estado === 'ACTIVO' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                      {administrator.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      disabled={administrator.rol !== 'ADMIN_EMPRESA' || (administrator.id === user?.id && administrator.estado === 'ACTIVO')}
                      onClick={() => void handleStatus(administrator)}
                      title={administrator.estado === 'ACTIVO' ? 'Desactivar acceso' : 'Reactivar acceso'}
                      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 font-semibold text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {administrator.estado === 'ACTIVO' ? <UserRoundX className="h-3.5 w-3.5 text-red-400" /> : <UserRoundCheck className="h-3.5 w-3.5 text-emerald-400" />}
                      {administrator.estado === 'ACTIVO' ? 'Desactivar' : 'Reactivar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
