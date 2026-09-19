import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const ROLE_HOME: Record<string, string> = {
  CLIENT: '/client',
  WORKSHOP_ADMIN: '/workshop',
  TECHNICIAN: '/technician',
  SUPPLIER_ADMIN: '/supplier',
  SUPER_ADMIN: '/admin',
};

interface PublicRouteProps {
  children: React.ReactNode;
}

export function PublicRoute({ children }: PublicRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-muted">
        <div className="animate-spin h-8 w-8 border-4 border-brand-orange border-t-transparent rounded-full" />
      </div>
    );
  }

  if (isAuthenticated && user) {
    const home = ROLE_HOME[user.role] || '/';
    return <Navigate to={home} replace />;
  }

  return <>{children}</>;
}
