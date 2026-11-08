import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Bus,
  Users,
  FileSpreadsheet,
  AlertOctagon,
  Building2,
  Sliders,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  User,
  Moon,
  Sun
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const AdminLayout: React.FC = () => {
  const { user, logout, isSuperAdmin, isDemoMode } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const adminEmpresaLinks = [
    { to: '/admin/dashboard', label: 'Resumen de Empresa', icon: LayoutDashboard },
    { to: '/admin/fleet', label: 'Flota y Códigos QR', icon: Bus },
    { to: '/admin/drivers', label: 'Choferes y Asignación', icon: Users },
    { to: '/admin/reports', label: 'Reportes y Exportación CSV', icon: FileSpreadsheet },
    { to: '/admin/claims', label: 'Reclamos de Pasajeros', icon: AlertOctagon },
  ];

  const superAdminLinks = [
    { to: '/superadmin/dashboard', label: 'Supervisión General', icon: LayoutDashboard },
    { to: '/superadmin/claims', label: 'Incidencias para SIT-Pay', icon: AlertOctagon },
    { to: '/superadmin/companies', label: 'Empresas y Cuencas (C2-C11)', icon: Building2 },
    { to: '/superadmin/fares', label: 'Tarifas Ley 26271', icon: Sliders },
    { to: '/superadmin/users', label: 'Gestión de Administradores', icon: Users },
    { to: '/superadmin/audit', label: 'Auditoría y Logs (Ley 29733)', icon: ShieldCheck },
  ];

  const navLinks = isSuperAdmin ? superAdminLinks : adminEmpresaLinks;

  return (
    <div className={`min-h-screen flex ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-[72px]'
        } transition-all duration-300 border-r ${
          darkMode ? 'border-slate-800 bg-slate-900/90' : 'border-slate-200 bg-white'
        } flex flex-col justify-between z-30`}
      >
        <div>
          {/* Logo Brand */}
          <div className={`h-16 flex items-center border-b border-slate-800/80 ${sidebarOpen ? 'justify-between px-3' : 'justify-center px-1'}`}>
            {sidebarOpen ? (
              <>
                <div className="flex items-center gap-3 overflow-hidden">
                  <img
                    src="/sit-pay-logo.png"
                    alt="SIT-Pay"
                    className="w-10 h-10 shrink-0 object-contain"
                  />
                  <div className="truncate">
                    <div className="font-extrabold text-base tracking-tight text-white">SIT-Pay</div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">
                      {isSuperAdmin ? 'Super Admin' : 'Admin Empresa'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Contraer menú"
                  onClick={() => setSidebarOpen(false)}
                  className="w-9 h-9 inline-flex items-center justify-center rounded-lg hover:bg-slate-800 text-slate-400 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </>
            ) : (
              <button
                type="button"
                aria-label="Expandir menú"
                onClick={() => setSidebarOpen(true)}
                className="w-11 h-11 inline-flex items-center justify-center rounded-xl hover:bg-slate-800 text-slate-300 transition-colors"
              >
                <Menu className="w-6 h-6" strokeWidth={2.2} />
              </button>
            )}
          </div>

          {/* Nav Items */}
          <nav className="p-3 space-y-1.5">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    } ${!sidebarOpen && 'justify-center px-0'}`
                  }
                  title={!sidebarOpen ? link.label : undefined}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {sidebarOpen && <span className="truncate">{link.label}</span>}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* User Card & Logout Bottom */}
        <div className={`p-3 border-t ${darkMode ? 'border-slate-800/80' : 'border-slate-200'}`}>
          {sidebarOpen ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center shrink-0 font-bold text-xs text-white">
                  {user?.nombres?.[0] || 'A'}
                </div>
                <div className="truncate">
                  <div className="text-xs font-bold text-white truncate">{user?.nombres} {user?.apellidos}</div>
                  <div className="text-[10px] text-slate-400 truncate">{user?.email}</div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                title="Cerrar Sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full flex justify-center py-2 text-red-400 hover:bg-red-500/10 rounded-lg"
              title="Cerrar Sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Navbar */}
        <header className={`h-16 border-b px-6 flex items-center justify-between sticky top-0 z-20 backdrop-blur ${
          darkMode ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-white/80'
        }`}>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              SIT Arequipa v1.0
            </span>
            <span className="text-xs text-slate-400 hidden sm:inline">
              Panel administrativo SIT-Pay
            </span>
            {isDemoMode && (
              <span className="text-[10px] font-bold px-2 py-1 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                DEMO LOCAL · SIN BD · CAMBIOS NO GUARDADOS
              </span>
            )}
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-300 transition-colors"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            <NavLink
              to="/profile"
              className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-200 border border-slate-700/80"
            >
              <User className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Mi Perfil</span>
            </NavLink>
          </div>
        </header>

        {/* Routed Pages */}
        <main className="p-6 md:p-8 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
