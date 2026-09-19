import { Link } from 'react-router-dom';
import { Card, Button } from '@/components/ui';

export function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-surface-muted flex items-center justify-center p-4">
      <Card className="max-w-md text-center">
        <h1 className="text-2xl font-bold text-text-primary mb-2">Acceso no autorizado</h1>
        <p className="text-text-secondary mb-6">
          No tienes permisos para acceder a esta seccion.
        </p>
        <Link to="/">
          <Button variant="secondary">Volver al inicio</Button>
        </Link>
      </Card>
    </div>
  );
}
