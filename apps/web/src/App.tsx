import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { PrivateRoute } from '@/components/guards/PrivateRoute';
import { PublicRoute } from '@/components/guards/PublicRoute';

// Auth pages
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { VerifyEmailPage } from '@/pages/auth/VerifyEmailPage';
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage';

// Role dashboards
import { ClientDashboard } from '@/pages/client/ClientDashboard';
import { WorkshopDashboard } from '@/pages/workshop/WorkshopDashboard';
import { WorkshopRequestsPage } from '@/pages/workshop/WorkshopRequestsPage';
import { WorkshopRequestDetailPage } from '@/pages/workshop/WorkshopRequestDetailPage';
import { WorkshopQuotationsPage } from '@/pages/workshop/WorkshopQuotationsPage';
import { WorkshopQuotationNewPage } from '@/pages/workshop/WorkshopQuotationNewPage';
import { WorkshopQuotationDetailPage } from '@/pages/workshop/WorkshopQuotationDetailPage';
import { TechnicianDashboard } from '@/pages/technician/TechnicianDashboard';
import { SupplierDashboard } from '@/pages/supplier/SupplierDashboard';
import { SupplierProductsPage } from '@/pages/supplier/SupplierProductsPage';
import { SupplierQuotesPage } from '@/pages/supplier/SupplierQuotesPage';
import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage';
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
          <Route path="/verify" element={<VerifyEmailPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/* Redirect raíz según rol */}
          <Route path="/" element={<RoleRedirect />} />

          {/* Cliente */}
          <Route path="/client" element={
            <PrivateRoute allowedRoles={['CLIENT']}><ClientDashboard /></PrivateRoute>
          } />

          {/* Admin Taller */}
          <Route path="/workshop" element={
            <PrivateRoute allowedRoles={['WORKSHOP_ADMIN']}><WorkshopDashboard /></PrivateRoute>
          } />
          <Route path="/workshop/requests" element={
            <PrivateRoute allowedRoles={['WORKSHOP_ADMIN']}><WorkshopRequestsPage /></PrivateRoute>
          } />
          <Route path="/workshop/requests/:id" element={
            <PrivateRoute allowedRoles={['WORKSHOP_ADMIN']}><WorkshopRequestDetailPage /></PrivateRoute>
          } />
          <Route path="/workshop/quotations" element={
            <PrivateRoute allowedRoles={['WORKSHOP_ADMIN']}><WorkshopQuotationsPage /></PrivateRoute>
          } />
          <Route path="/workshop/quotations/new" element={
            <PrivateRoute allowedRoles={['WORKSHOP_ADMIN']}><WorkshopQuotationNewPage /></PrivateRoute>
          } />
          <Route path="/workshop/quotations/:id" element={
            <PrivateRoute allowedRoles={['WORKSHOP_ADMIN']}><WorkshopQuotationDetailPage /></PrivateRoute>
          } />

          {/* Técnico */}
          <Route path="/technician" element={
            <PrivateRoute allowedRoles={['TECHNICIAN']}><TechnicianDashboard /></PrivateRoute>
          } />

          {/* Proveedor */}
          <Route path="/supplier" element={
            <PrivateRoute allowedRoles={['SUPPLIER_ADMIN']}><SupplierDashboard /></PrivateRoute>
          } />
          <Route path="/supplier/products" element={
            <PrivateRoute allowedRoles={['SUPPLIER_ADMIN']}><SupplierProductsPage /></PrivateRoute>
          } />
          <Route path="/supplier/quotes" element={
            <PrivateRoute allowedRoles={['SUPPLIER_ADMIN']}><SupplierQuotesPage /></PrivateRoute>
          } />

          {/* Super Admin */}
          <Route path="/admin" element={
            <PrivateRoute allowedRoles={['SUPER_ADMIN']}><AdminDashboard /></PrivateRoute>
          } />
          <Route path="/admin/users" element={
            <PrivateRoute allowedRoles={['SUPER_ADMIN']}><AdminUsersPage /></PrivateRoute>
          } />

          {/* 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
