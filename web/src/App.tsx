import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AdminLayout } from './components/layout/AdminLayout';
import { LoginPage } from './pages/auth/LoginPage';
import { CompanyDashboardPage } from './pages/admin/CompanyDashboardPage';
import { FleetPage } from './pages/admin/FleetPage';
import { DriversPage } from './pages/admin/DriversPage';
import { PreferentialReviewPage } from './pages/admin/PreferentialReviewPage';
import { ReportsPage } from './pages/admin/ReportsPage';
import { ClaimsManagementPage } from './pages/admin/ClaimsManagementPage';
import { SuperAdminDashboardPage } from './pages/superadmin/SuperAdminDashboardPage';
import { CompaniesAndUnitsPage } from './pages/superadmin/CompaniesAndUnitsPage';
import { FaresConfigurationPage } from './pages/superadmin/FaresConfigurationPage';
import { AuditLogsPage } from './pages/superadmin/AuditLogsPage';
import { ProfilePage } from './pages/profile/ProfilePage';

const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRole?: string }> = ({
  children,
  allowedRole,
}) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-xs text-slate-400">Cargando sesión...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && user.rol !== allowedRole) {
    return <Navigate to={user.rol === 'SUPER_ADMIN' ? '/superadmin/dashboard' : '/admin/dashboard'} replace />;
  }

  return <>{children}</>;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          {/* Rutas Administrativas con Layout */}
          <Route
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            {/* Rutas Admin Empresa */}
            <Route path="/admin/dashboard" element={<CompanyDashboardPage />} />
            <Route path="/admin/fleet" element={<FleetPage />} />
            <Route path="/admin/drivers" element={<DriversPage />} />
            <Route path="/admin/preferential" element={<PreferentialReviewPage />} />
            <Route path="/admin/reports" element={<ReportsPage />} />
            <Route path="/admin/claims" element={<ClaimsManagementPage />} />

            {/* Rutas Super Admin */}
            <Route path="/superadmin/dashboard" element={<SuperAdminDashboardPage />} />
            <Route path="/superadmin/companies" element={<CompaniesAndUnitsPage />} />
            <Route path="/superadmin/fares" element={<FaresConfigurationPage />} />
            <Route path="/superadmin/audit" element={<AuditLogsPage />} />

            {/* Perfil Común */}
            <Route path="/profile" element={<ProfilePage />} />
          </Route>

          {/* Redirección por defecto */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
