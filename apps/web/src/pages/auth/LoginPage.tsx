import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/layouts';
import { Button, Input, Card } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <Card>
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-brand-navy">Iniciar sesion</h2>
          <p className="text-text-secondary text-sm mt-1">
            Ingresa a tu cuenta de MecaniControl
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-btn text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Correo electronico"
            type="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@correo.com"
            required
          />
          <Input
            label="Contrasena"
            type="password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />

          <Button type="submit" className="w-full" loading={loading}>
            Iniciar sesion
          </Button>
        </form>

        <div className="mt-4 text-center text-sm">
          <Link to="/forgot-password" className="text-brand-orange hover:underline">
            Olvide mi contrasena
          </Link>
        </div>

        <div className="mt-6 text-center text-sm text-text-secondary">
          No tienes cuenta?{' '}
          <Link to="/register" className="text-brand-orange hover:underline font-medium">
            Registrate
          </Link>
        </div>
      </Card>
    </AuthLayout>
  );
}
