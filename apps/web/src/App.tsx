import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { PrivateRoute } from '@/components/guards/PrivateRoute';
import { PublicRoute } from '@/components/guards/PublicRoute';

// Auth pages
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';

// Role dashboards
import { ClientDashboard } from '@/pages/client/ClientDashboard';
import { WorkshopDashboard } from '@/pages/workshop/WorkshopDashboard';
import { TechnicianDashboard } from '@/pages/technician/TechnicianDashboard';
import { SupplierDashboard } from '@/pages/supplier/SupplierDashboard';
import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { UnauthorizedPage } from '@/pages/UnauthorizedPage';

const ROLE_HOME: Record<string, string> = {
  CLIENT: '/client',
  WORKSHOP_ADMIN: '/workshop',
  TECHNICIAN: '/technician',
  SUPPLIER_ADMIN: '/supplier',
  SUPER_ADMIN: '/admin',
};

function RoleRedirect() {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;

  const home = ROLE_HOME[user.role] || '/login';
  return <Navigate to={home} replace />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Rutas públicas */}
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/* Redirect raíz según rol */}
          <Route path="/" element={<RoleRedirect />} />

          {/* Cliente */}
          <Route path="/client/*" element={
            <PrivateRoute allowedRoles={['CLIENT']}>
              <Routes>
                <Route index element={<ClientDashboard />} />
              </Routes>
            </PrivateRoute>
          } />

          {/* Admin Taller */}
          <Route path="/workshop/*" element={
            <PrivateRoute allowedRoles={['WORKSHOP_ADMIN']}>
              <Routes>
                <Route index element={<WorkshopDashboard />} />
              </Routes>
            </PrivateRoute>
          } />

          {/* Técnico */}
          <Route path="/technician/*" element={
            <PrivateRoute allowedRoles={['TECHNICIAN']}>
              <Routes>
                <Route index element={<TechnicianDashboard />} />
              </Routes>
            </PrivateRoute>
          } />

          {/* Proveedor */}
          <Route path="/supplier/*" element={
            <PrivateRoute allowedRoles={['SUPPLIER_ADMIN']}>
              <Routes>
                <Route index element={<SupplierDashboard />} />
              </Routes>
            </PrivateRoute>
          } />

          {/* Super Admin */}
          <Route path="/admin/*" element={
            <PrivateRoute allowedRoles={['SUPER_ADMIN']}>
              <Routes>
                <Route index element={<AdminDashboard />} />
              </Routes>
            </PrivateRoute>
          } />

          {/* 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
