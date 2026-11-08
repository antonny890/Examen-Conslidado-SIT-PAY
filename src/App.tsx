/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Database,
  FolderTree,
  GitBranch,
  ShieldCheck,
  Table,
  Users,
  Bus,
  CreditCard,
  FileText,
  Copy,
  Check,
  Code2,
  FileCheck2,
  Sparkles,
  QrCode,
  Volume2,
  Smartphone,
  Server,
  Zap,
  Clock,
  ArrowRight,
  RefreshCw,
  Bell,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  Layers,
  LayoutDashboard,
  Building2,
  FileSpreadsheet,
  CheckSquare,
  Sliders,
  DollarSign
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'web_admin' | 'live_simulation' | 'mobile_flutter' | 'backend_files' | 'swagger' | 'architecture' | 'erd' | 'seed' | 'compliance'>('web_admin');
  const [webRoleView, setWebRoleView] = useState<'admin_empresa' | 'super_admin'>('admin_empresa');
  const [webActiveMenu, setWebActiveMenu] = useState<'dashboard' | 'fleet' | 'preferential' | 'reports'>('dashboard');

  const [copied, setCopied] = useState<string | null>(null);

  const selectedPassenger = 'university';
  const [mobilePreviewRole, setMobilePreviewRole] = useState<'pasajero' | 'chofer'>('pasajero');

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const passengerInfo = {
    regular: {
      name: 'Pedro Arenas Begazo',
      firstName: 'Pedro',
      status: 'Tarifa Regular (Adulto)',
      fare: 1.0,
      lawStatus: 'Sin carné universitario registrado',
    },
    university: {
      name: 'Lucía Flores Zeballos',
      firstName: 'Lucía',
      status: 'Universitaria APROBADA (Ley 26271)',
      fare: 0.5,
      lawStatus: 'Acreditada .edu.pe (50% descuento de 05:00 a 24:00)',
    },
    school: {
      name: 'Rodrigo Pinto Cáceres',
      firstName: 'Rodrigo',
      status: 'Escolar (Acreditación Pendiente)',
      fare: 1.0,
      lawStatus: 'Carné en revisión por empresa (Paga tarifa regular S/ 1.00 hasta aprobación)',
    },
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Banner */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Bus className="w-6 h-6 text-slate-950 font-bold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white">SIT-Pay Arequipa</h1>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Pago bancario pendiente
                </span>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  Panel Web React
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Sistema de Pago Digital • Panel Administrativo y de Fiscalización (Universidad Continental)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-slate-800/80 px-4 py-2 rounded-lg border border-slate-700">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
              </span>
              <span className="text-xs text-slate-300 font-medium">
                Estado: Cobros deshabilitados — falta integrar proveedor bancario
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="border-b border-slate-800 bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-6 flex overflow-x-auto space-x-1 py-2">
          {[
            { id: 'web_admin', label: 'Panel Web React (Escritorio/Tablet)', icon: LayoutDashboard },
            { id: 'mobile_flutter', label: 'App Flutter Móvil (Dart)', icon: Smartphone },
            { id: 'live_simulation', label: 'Flujo de pago (integración pendiente)', icon: Zap },
            { id: 'backend_files', label: 'Backend Node/Express', icon: Server },
            { id: 'swagger', label: 'Swagger API (/api/docs)', icon: FileText },
            { id: 'architecture', label: 'Estructura Monorepo', icon: FolderTree },
            { id: 'erd', label: 'Diagrama E-R', icon: GitBranch },
            { id: 'seed', label: 'Cuentas Seed', icon: Table },
            { id: 'compliance', label: 'Matriz Normativa', icon: ShieldCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full space-y-8">
        {/* TAB: PANEL WEB REACT (FASE 4) */}
        {activeTab === 'web_admin' && (
          <div className="space-y-6">
            {/* Header del Panel Web */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <LayoutDashboard className="w-5 h-5 text-cyan-400" />
                  <h2 className="text-lg font-bold text-white">
                    Panel Administrativo React + Vite + Tailwind CSS (web/)
                  </h2>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Exclusivo para escritorio y tablet. Gestiona la recaudación, flota, asignación de choferes, aprobación de medio pasaje y fiscalización macro.
                </p>
              </div>

              {/* Selector de Rol: Admin Empresa vs Super Admin */}
              <div className="flex items-center bg-slate-950 p-1.5 rounded-xl border border-slate-800">
                <button
                  onClick={() => setWebRoleView('admin_empresa')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    webRoleView === 'admin_empresa'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Admin Empresa (Transcayma)
                </button>
                <button
                  onClick={() => setWebRoleView('super_admin')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    webRoleView === 'super_admin'
                      ? 'bg-purple-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Super Admin (MPA Fiscalización)
                </button>
              </div>
            </div>

            {/* Sub-navegación dentro del Panel */}
            <div className="flex gap-2 border-b border-slate-800 pb-2 overflow-x-auto text-xs">
              {[
                { id: 'dashboard', label: 'Dashboard Métricas', icon: LayoutDashboard },
                { id: 'fleet', label: 'Flota y Códigos QR', icon: Bus },
                { id: 'preferential', label: 'Revisión Medio Pasaje (Ley 26271)', icon: FileCheck2 },
                { id: 'reports', label: 'Reportes y Exportación CSV', icon: FileSpreadsheet },
              ].map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    onClick={() => setWebActiveMenu(m.id as any)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl font-semibold transition-all ${
                      webActiveMenu === m.id
                        ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {m.label}
                  </button>
                );
              })}
            </div>

            {/* VISTA 1: DASHBOARD */}
            {webActiveMenu === 'dashboard' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-200">
                  Prototipo visual con datos de ejemplo. La recaudación no está conectada a pagos bancarios y no representa dinero cobrado.
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
                    <div className="text-xs text-slate-400">Estado de recaudación</div>
                    <div className="text-xl font-black text-amber-400">No disponible</div>
                    <div className="text-xs text-slate-500">API bancaria pendiente</div>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
                    <div className="text-xs text-slate-400">Flota con QR Activo</div>
                    <div className="text-3xl font-black font-mono text-white">32 Unidades</div>
                    <div className="text-xs text-slate-500">Cuencas C2, C3 y C6</div>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
                    <div className="text-xs text-slate-400">Tasa Medio Pasaje (Ley 26271)</div>
                    <div className="text-3xl font-black font-mono text-cyan-400">34 %</div>
                    <div className="text-xs text-slate-500">Acreditados universitarios y escolares</div>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
                    <div className="text-xs text-slate-400">Reclamos Abiertos (Ley 29571)</div>
                    <div className="text-3xl font-black font-mono text-amber-400">2 Pendientes</div>
                    <div className="text-xs text-slate-500">En plazo de respuesta legal</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
                    <h3 className="text-sm font-bold text-white">Resumen de Cuencas Operadas (SIT)</h3>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between p-2.5 bg-slate-950 rounded-xl">
                        <span>C3 Cayma (Transcayma Operadora)</span>
                        <span className="font-bold text-slate-400">Sin datos</span>
                      </div>
                      <div className="flex justify-between p-2.5 bg-slate-950 rounded-xl">
                        <span>C2 Cono Norte (AQP Masivo S.A.C.)</span>
                        <span className="font-bold text-slate-400">Sin datos</span>
                      </div>
                      <div className="flex justify-between p-2.5 bg-slate-950 rounded-xl">
                        <span>C6 Paucarpata (Unión AQP S.A.)</span>
                        <span className="font-bold text-slate-400">Sin datos</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
                    <h3 className="text-sm font-bold text-white">Parámetros Vigentes Ley 26271</h3>
                    <div className="space-y-2 text-xs text-slate-300">
                      <div className="p-2.5 bg-slate-950 rounded-xl flex justify-between">
                        <span>Pasaje Adulto Regular:</span>
                        <span className="font-bold text-white">S/ 1.00</span>
                      </div>
                      <div className="p-2.5 bg-slate-950 rounded-xl flex justify-between">
                        <span>Medio Pasaje Universitario:</span>
                        <span className="font-bold text-emerald-400">S/ 0.50 (50 % descuento)</span>
                      </div>
                      <div className="p-2.5 bg-slate-950 rounded-xl flex justify-between">
                        <span>Horario Reglamentario:</span>
                        <span className="font-bold text-cyan-400">05:00 a 24:00 horas (Días Hábiles)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* VISTA 2: FLOTA Y QR */}
            {webActiveMenu === 'fleet' && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">Flota con Códigos QR Únicos Generados</h3>
                  <span className="text-xs text-slate-400 font-mono">1 Placa = 1 QR Fijo</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { plate: 'V7A-890', zone: 'C3 Cayma', driver: 'Carlos Vilca Mamani', token: 'SIT-VEH-V7A890-7F89C1D4E2' },
                    { plate: 'V8B-123', zone: 'C2 Cono Norte', driver: 'Manuel Quispe Chambi', token: 'SIT-VEH-V8B123-A4B5C6D7E8' },
                    { plate: 'V9C-456', zone: 'C6 Paucarpata', driver: 'Juan Condori Apaza', token: 'SIT-VEH-V9C456-1122334455' },
                  ].map((v) => (
                    <div key={v.plate} className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-black font-mono text-white tracking-widest">{v.plate}</span>
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-mono">ACTIVO</span>
                      </div>
                      <div className="text-xs text-slate-400">
                        <div>Zona: {v.zone}</div>
                        <div>Chofer Asignado: <strong className="text-white">{v.driver}</strong></div>
                      </div>
                      <div className="p-2 bg-slate-900 rounded-lg text-center">
                        <div className="text-[10px] text-slate-500 font-mono truncate">{v.token}</div>
                      </div>
                      <button
                        onClick={() => alert(`Imprimir cartel de QR para la placa ${v.plate}`)}
                        className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5"
                      >
                        <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                        Ver / Imprimir Cartel QR
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* VISTA 3: REVISION MEDIO PASAJE */}
            {webActiveMenu === 'preferential' && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">Bandeja de Acreditación de Medio Pasaje (Ley 26271)</h3>
                  <span className="text-xs text-slate-400 font-mono">Foto de carné o validación .edu.pe</span>
                </div>
                <div className="space-y-3">
                  {[
                    { name: 'Rodrigo Pinto Cáceres', doc: 'DNI: 76541298', inst: 'I.E. Independencia Americana', type: 'ESCOLAR', status: 'PENDIENTE' },
                    { name: 'Lucía Flores Zeballos', doc: 'DNI: 74129856', inst: 'Universidad Continental', type: 'UNIVERSITARIO', status: 'APROBADA' },
                  ].map((req, i) => (
                    <div key={i} className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="font-bold text-white text-sm">{req.name}</div>
                        <div className="text-slate-400">{req.doc} • {req.inst}</div>
                        <span className="inline-block mt-1 font-mono text-[10px] text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">
                          {req.type} (50 %)
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                          req.status === 'APROBADA' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                        }`}>
                          {req.status}
                        </span>
                        {req.status === 'PENDIENTE' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => alert(`Aprobar medio pasaje para ${req.name}`)}
                              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-lg"
                            >
                              Aprobar
                            </button>
                            <button
                              onClick={() => alert(`Rechazar solicitud de ${req.name}`)}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-red-400 font-bold rounded-lg"
                            >
                              Rechazar
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* VISTA 4: REPORTES CSV */}
            {webActiveMenu === 'reports' && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">Reportes de Recaudación Financiera</h3>
                  <button
                    disabled
                    className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-slate-400 font-bold text-xs rounded-xl cursor-not-allowed"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    Exportación no disponible
                  </button>
                </div>
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300">
                  <p>No se generan reportes financieros hasta integrar y verificar los pagos con una entidad bancaria.</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB: MOBILE FLUTTER (FASE 3) */}
        {activeTab === 'mobile_flutter' && (
          <div className="space-y-6">
            <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-6 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-purple-400" />
                    <h2 className="text-lg font-bold text-white">
                      App Flutter (mobile/) — Misma App para Pasajero y Chofer
                    </h2>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Un único APK Flutter móvil con pantalla de login común que detecta el rol y redirige automáticamente.
                  </p>
                </div>

                <div className="flex items-center bg-slate-950 p-1.5 rounded-xl border border-slate-800">
                  <button
                    onClick={() => setMobilePreviewRole('pasajero')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      mobilePreviewRole === 'pasajero' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Vista Pasajero
                  </button>
                  <button
                    onClick={() => setMobilePreviewRole('chofer')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      mobilePreviewRole === 'chofer' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Vista Chofer (Cero Distracción)
                  </button>
                </div>
              </div>

              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300">
                Vista demostrativa. SIT-Pay no guarda saldo; falta integrar la API del banco para iniciar y confirmar pagos.
              </div>
            </div>
          </div>
        )}

        {/* TAB: SIMULADOR LIVE (Fase 2) */}
        {activeTab === 'live_simulation' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Pasajero */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="font-bold text-sm text-white flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-blue-400" />
                  App Móvil Pasajero
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="text-xs text-slate-400">Tarifa estimada, no cobrada:</div>
                  <div className="text-3xl font-mono font-black text-white">S/ {passengerInfo[selectedPassenger].fare.toFixed(2)}</div>
                </div>
                <button
                  disabled
                  className="w-full py-4 bg-slate-700 text-slate-300 font-black rounded-xl text-sm cursor-not-allowed"
                >
                  Pago bancario no configurado
                </button>
              </div>

              {/* Chofer */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4 relative overflow-hidden">
                <div className="font-bold text-sm text-white flex items-center gap-2">
                  <Bus className="w-4 h-4 text-amber-400" />
                  Consola Chofer (Cero Distracción)
                </div>
                <div className="bg-white p-4 rounded-xl text-center text-slate-950">
                  <div className="font-mono font-bold text-lg">PLACA: V7A-890</div>
                </div>
                <p className="text-xs text-slate-400">
                  El chofer solo recibirá una confirmación cuando el banco valide el pago. No hay confirmaciones simuladas.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB: BACKEND FILES */}
        {activeTab === 'backend_files' && (
          <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">Backend Node/Express (Fase 2)</h2>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-slate-300">
              <pre>{`backend/
├── src/app.js (Express + Socket.IO + Swagger)
├── src/services/fareEngine.js (Ley 26271)
└── src/modules/ (auth, profile, fares, preferential, payments, tickets, vehicles, claims, company, admin)`}</pre>
            </div>
          </div>
        )}

        {/* TAB: SWAGGER */}
        {activeTab === 'swagger' && (
          <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">Swagger UI & OpenAPI 3.0 (/api/docs)</h2>
            <p className="text-xs text-slate-400">
              Endpoints documentados con esquema Bearer JWT y códigos HTTP semánticos.
            </p>
          </div>
        )}

        {/* TAB: ARCHITECTURE */}
        {activeTab === 'architecture' && (
          <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">Estructura del Monorepo</h2>
            <div className="bg-slate-950 rounded-lg p-4 font-mono text-xs text-slate-300 overflow-x-auto border border-slate-800">
              <pre>{`sit-pay-arequipa/
├── backend/                  # Node.js + Express + Supabase Auth/PostgreSQL + Socket.IO
├── mobile/                   # Flutter (Dart) para Pasajeros y Choferes (Fase 3)
└── web/                      # React + Vite + Tailwind para Administradores (Fase 4)`}</pre>
            </div>
          </div>
        )}

        {/* TAB: ERD */}
        {activeTab === 'erd' && (
          <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">Diagrama E-R (Mermaid)</h2>
            <div className="bg-slate-950 rounded-lg p-4 font-mono text-xs text-emerald-300 overflow-x-auto border border-slate-800">
              <pre>{`erDiagram
    ROLES ||--o{ USUARIOS : "asigna permisos a"
    USUARIOS ||--|| PERFILES : "posee datos de"
    EMPRESAS ||--o{ VEHICULOS : "opera flota de"
    USUARIOS ||--o{ TRANSACCIONES : "realiza pagos externos"
    UNIDADES_NEGOCIO ||--o{ VEHICULOS : "pertenece a cuenca"
    EMPRESAS ||--o{ CHOFERES : "emplea a"
    VEHICULOS ||--o| CHOFERES : "asignado 1-a-1 a placa fija"`}</pre>
            </div>
          </div>
        )}

        {/* TAB: SEED */}
        {activeTab === 'seed' && (
          <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Cuentas Sembradas de Prueba</h2>
              <span className="text-xs font-mono bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-lg border border-emerald-500/30">
                Contraseña: SitPay2026!
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {[
                { rol: 'ADMIN_EMPRESA', email: 'admin.transcayma@sitpay.gob.pe', name: 'Gabriela Torres Valdivia', extra: 'Transcayma Operadora S.A.' },
                { rol: 'SUPER_ADMIN', email: 'superadmin@sitpay.gob.pe', name: 'Hernán Peralta Mendoza', extra: 'Fiscalización MPA' },
                { rol: 'CHOFER', email: 'chofer.carlos@sitpay.gob.pe', name: 'Carlos Vilca Mamani', extra: 'Placa V7A-890' },
                { rol: 'PASAJERO', email: 'lucia.continental@continental.edu.pe', name: 'Lucía Flores Zeballos', extra: 'Universitaria S/ 0.50' },
              ].map((c, i) => (
                <div key={i} className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
                  <div className="flex justify-between">
                    <span className="font-bold text-emerald-400 font-mono">{c.rol}</span>
                    <span className="text-slate-400 text-[11px]">{c.extra}</span>
                  </div>
                  <div className="font-mono text-slate-200">{c.email}</div>
                  <div className="text-slate-400">{c.name}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: COMPLIANCE */}
        {activeTab === 'compliance' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { law: 'Ley N° 26271', title: 'Pasaje Diferenciado (50%)', desc: '05:00 a 24:00 hrs en días hábiles previa acreditación en la app.' },
              { law: 'Ley N° 29733', title: 'Protección de Datos', desc: 'Minimización estricta: al chofer SOLO se envía el nombre del pasajero.' },
              { law: 'Ley N° 29571', title: 'Código del Consumidor', desc: 'Boleta digital automática e historial completo descargable.' },
              { law: 'API bancaria externa', title: 'Sin custodia de fondos', desc: 'El banco procesa y liquida el importe; SIT-Pay solo registra pagos confirmados. Proveedor pendiente de selección.' },
            ].map((c) => (
              <div key={c.law} className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-2">
                <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">{c.law}</span>
                <h3 className="text-sm font-bold text-white">{c.title}</h3>
                <p className="text-xs text-slate-400">{c.desc}</p>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div>
            Universidad Continental • Programación Web • <span className="text-slate-300 font-medium">SIT-Pay Arequipa</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-medium">Fase 4 (Panel Web React) completada.</span>
            <span>Escribe <strong className="text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">&quot;continúa&quot;</strong> para la Fase 5 (README, Variables de Entorno y Guía de Pruebas).</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
