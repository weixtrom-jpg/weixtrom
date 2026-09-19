import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface PrivateRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export function PrivateRoute({ children, allowedRoles }: PrivateRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-muted">
        <div className="animate-spin h-8 w-8 border-4 border-brand-orange border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
