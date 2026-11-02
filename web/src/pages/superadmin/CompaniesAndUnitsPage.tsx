import React, { useState, useEffect } from 'react';
import { Building2, MapPin, Plus, Check } from 'lucide-react';
import { api } from '../../services/api';

export const CompaniesAndUnitsPage: React.FC = () => {
  const [companies, setCompanies] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [compRes, unitRes] = await Promise.all([
        api.get('/admin/companies'),
        api.get('/admin/business-units'),
      ]);
      if (compRes.data.success) setCompanies(compRes.data.data);
      if (unitRes.data.success) setUnits(unitRes.data.data);
    } catch (_) {} finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">
          Empresas Concesionarias y Unidades de Negocio (Cuencas C2 a C11)
        </h1>
        <p className="text-xs text-slate-400">
          Estructura del Sistema Integrado de Transporte de Arequipa (SIT) para la recaudación multi-empresa.
        </p>
      </div>

      {/* Empresas Concesionarias */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
          <Building2 className="w-4 h-4" />
          Empresas Operadoras
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {companies.map((c) => (
            <div key={c.id} className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-slate-400">RUC: {c.ruc}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  ACTIVA
                </span>
              </div>
              <h3 className="font-bold text-base text-white">{c.nombre_comercial}</h3>
              <p className="text-xs text-slate-400">{c.razon_social}</p>
              <div className="text-[11px] text-slate-400 border-t border-slate-800/80 pt-2">
                Contacto: {c.email_contacto} • {c.telefono}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 10 Cuencas del SIT Arequipa */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          Las 10 Unidades de Negocio (Zonas / Cuencas de Arequipa)
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {units.map((u) => (
            <div key={u.id} className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono font-black text-sm text-white">{u.codigo}</span>
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: u.color_identificador || '#3B82F6' }}
                />
              </div>
              <div className="text-xs font-semibold text-slate-200 line-clamp-1">{u.nombre}</div>
              <div className="text-[10px] text-slate-500 line-clamp-2">{u.descripcion}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
