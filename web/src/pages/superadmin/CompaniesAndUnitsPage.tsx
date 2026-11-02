import React, { useEffect, useState } from 'react';
import { Building2, MapPin, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface Company {
  id: string;
  ruc: string;
  razon_social: string;
  nombre_comercial: string;
  direccion?: string | null;
  telefono?: string | null;
  email_contacto: string;
  activo: boolean;
}

interface BusinessUnit {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  color_identificador?: string | null;
}

const demoCompanies: Company[] = [
  {
    id: 'demo-company-transcayma',
    ruc: '20458912341',
    razon_social: 'Transcayma Operadora de Transporte S.A.',
    nombre_comercial: 'Transcayma',
    direccion: 'Cayma, Arequipa',
    telefono: '054-254190',
    email_contacto: 'contacto@transcayma.pe',
    activo: true,
  },
  {
    id: 'demo-company-aqp',
    ruc: '20601234562',
    razon_social: 'Consorcio AQP Masivo S.A.C.',
    nombre_comercial: 'AQP Masivo',
    direccion: 'Cerro Colorado, Arequipa',
    telefono: '054-441298',
    email_contacto: 'operaciones@aqpmasivo.pe',
    activo: true,
  },
  {
    id: 'demo-company-union',
    ruc: '20519876543',
    razon_social: 'Empresa de Transportes Unión AQP S.A.',
    nombre_comercial: 'Unión AQP',
    direccion: 'Paucarpata, Arequipa',
    telefono: '054-329871',
    email_contacto: 'administracion@unionaquipa.pe',
    activo: true,
  },
];

const demoUnits: BusinessUnit[] = [
  ['C2', 'Cono Norte - Cerro Colorado'],
  ['C3', 'Cayma'],
  ['C4', 'Selva Alegre - Miraflores'],
  ['C5', 'Mariano Melgar'],
  ['C6', 'Paucarpata - Miguel Grau'],
  ['C7', 'Paucarpata - Ciudad Blanca'],
  ['C8', 'Sabandía - Characato'],
  ['C9', 'Socabaya - J.L.B.R.'],
  ['C10', 'Hunter - Sachaca - Tiabaya'],
  ['C11', 'Pachacútec - Cerro Colorado'],
].map(([codigo, nombre], index) => ({
  id: index + 2,
  codigo,
  nombre,
  color_identificador: '#38BDF8',
}));

const emptyForm = {
  ruc: '',
  razonSocial: '',
  nombreComercial: '',
  direccion: '',
  telefono: '',
  emailContacto: '',
};

export const CompaniesAndUnitsPage: React.FC = () => {
  const { isDemoMode } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [units, setUnits] = useState<BusinessUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (isDemoMode) {
        setCompanies(demoCompanies);
        setUnits(demoUnits);
        setLoading(false);
        return;
      }

      try {
        const [compRes, unitRes] = await Promise.all([
          api.get('/admin/companies'),
          api.get('/admin/business-units'),
        ]);
        if (compRes.data.success) setCompanies(compRes.data.data);
        if (unitRes.data.success) setUnits(unitRes.data.data);
      } catch (requestError: any) {
        setError(requestError.response?.data?.message || 'No se pudieron cargar empresas y cuencas.');
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [isDemoMode]);

  const handleCreateCompany = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!/^\d{11}$/.test(form.ruc.trim())) {
      setError('El RUC debe contener exactamente 11 dígitos.');
      return;
    }

    setSaving(true);
    try {
      if (isDemoMode) {
        setCompanies((current) => [
          ...current,
          {
            id: `demo-company-${Date.now()}`,
            ruc: form.ruc.trim(),
            razon_social: form.razonSocial.trim(),
            nombre_comercial: form.nombreComercial.trim(),
            direccion: form.direccion.trim(),
            telefono: form.telefono.trim(),
            email_contacto: form.emailContacto.trim(),
            activo: true,
          },
        ]);
      } else {
        const response = await api.post('/admin/companies', form);
        setCompanies((current) => [...current, response.data.data]);
      }
      setForm(emptyForm);
      setFormOpen(false);
    } catch (requestError: any) {
      setError(requestError.response?.data?.message || 'No se pudo registrar la empresa.');
    } finally {
      setSaving(false);
    }
  };

  const handleCompanyStatus = async (company: Company) => {
    const nextStatus = !company.activo;
    if (
      !nextStatus &&
      !window.confirm(`¿Desactivar ${company.nombre_comercial}? Se conservará el historial y podrás reactivarla.`)
    ) {
      return;
    }

    setError('');
    try {
      if (!isDemoMode) {
        await api.put(`/admin/companies/${company.id}/status`, { activo: nextStatus });
      }
      setCompanies((current) =>
        current.map((item) =>
          item.id === company.id ? { ...item, activo: nextStatus } : item,
        ),
      );
    } catch (requestError: any) {
      setError(requestError.response?.data?.message || 'No se pudo cambiar el estado de la empresa.');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Empresas Concesionarias y Cuencas
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Administra empresas del SIT y sus datos de contacto.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFormOpen((open) => !open)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400"
        >
          {formOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {formOpen ? 'Cancelar' : 'Añadir empresa'}
        </button>
      </div>

      {isDemoMode && (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
          Modo demostración: los cambios se muestran localmente y no se guardan en el servidor.
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-200">
          {error}
        </p>
      )}

      {formOpen && (
        <form
          onSubmit={handleCreateCompany}
          className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-5 md:grid-cols-2"
        >
          <h2 className="md:col-span-2 text-sm font-bold text-white">Datos de la nueva empresa</h2>
          {([
            ['ruc', 'RUC (11 dígitos)', '20400000000'],
            ['razonSocial', 'Razón social', 'Empresa de Transporte S.A.'],
            ['nombreComercial', 'Nombre comercial', 'Nombre mostrado'],
            ['direccion', 'Dirección', 'Arequipa'],
            ['telefono', 'Teléfono', '054-000000'],
            ['emailContacto', 'Correo de contacto', 'contacto@empresa.pe'],
          ] as const).map(([field, label, placeholder]) => (
            <label key={field} className="space-y-1 text-xs text-slate-300">
              <span>{label}</span>
              <input
                type={field === 'emailContacto' ? 'email' : 'text'}
                required={['ruc', 'razonSocial', 'nombreComercial', 'emailContacto'].includes(field)}
                maxLength={field === 'ruc' ? 11 : undefined}
                value={form[field]}
                onChange={(event) => setForm((current) => ({ ...current, [field]: event.target.value }))}
                placeholder={placeholder}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-white outline-none focus:border-emerald-500"
              />
            </label>
          ))}
          <button
            type="submit"
            disabled={saving}
            className="mt-1 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-slate-950 disabled:opacity-50 md:col-span-2"
          >
            {saving ? 'Guardando…' : 'Registrar empresa'}
          </button>
        </form>
      )}

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-emerald-400">
          <Building2 className="h-4 w-4" />
          Empresas operadoras
        </h2>
        {loading ? (
          <p className="text-sm text-slate-400">Cargando empresas…</p>
        ) : companies.length === 0 ? (
          <p className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 text-sm text-slate-400">
            No hay empresas registradas.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {companies.map((company) => (
              <article
                key={company.id}
                className={`space-y-3 rounded-2xl border p-5 ${company.activo ? 'border-slate-800 bg-slate-900/80' : 'border-slate-800/60 bg-slate-900/40 opacity-70'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-slate-400">RUC: {company.ruc}</span>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${company.activo ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' : 'border-slate-700 bg-slate-800 text-slate-400'}`}>
                    {company.activo ? 'ACTIVA' : 'INACTIVA'}
                  </span>
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">{company.nombre_comercial}</h3>
                  <p className="text-xs text-slate-400">{company.razon_social}</p>
                </div>
                <div className="border-t border-slate-800/80 pt-2 text-[11px] text-slate-400">
                  <p>{company.email_contacto}</p>
                  <p>{company.telefono || 'Sin teléfono'} · {company.direccion || 'Sin dirección'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleCompanyStatus(company)}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold ${company.activo ? 'text-red-300 hover:bg-red-500/10' : 'text-emerald-300 hover:bg-emerald-500/10'}`}
                >
                  {company.activo ? <Trash2 className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}
                  {company.activo ? 'Desactivar (conservar historial)' : 'Reactivar'}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-blue-400">
          <MapPin className="h-4 w-4" />
          Unidades de negocio (cuencas C2 a C11)
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {units.map((unit) => (
            <div key={unit.id} className="space-y-1 rounded-xl border border-slate-800 bg-slate-900/60 p-3.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-black text-white">{unit.codigo}</span>
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: unit.color_identificador || '#3B82F6' }} />
              </div>
              <div className="line-clamp-1 text-xs font-semibold text-slate-200">{unit.nombre}</div>
              {unit.descripcion && <div className="line-clamp-2 text-[10px] text-slate-500">{unit.descripcion}</div>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
