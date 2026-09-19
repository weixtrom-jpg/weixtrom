import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AuthLayout } from '@/layouts';
import { Button, Input, Card } from '@/components/ui';
import { api } from '@/lib/api';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <AuthLayout>
        <Card className="text-center py-8">
          <h2 className="text-xl font-bold text-text-primary mb-2">Enlace invalido</h2>
          <p className="text-text-secondary mb-4">El enlace de restablecimiento no es valido.</p>
          <Link to="/forgot-password" className="text-brand-orange hover:underline font-medium">
            Solicitar un nuevo enlace
          </Link>
        </Card>
      </AuthLayout>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Las contrasenas no coinciden');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword: password });
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al restablecer');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <AuthLayout>
        <Card className="text-center py-8">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-green-600 text-2xl">✓</span>
          </div>
          <h2 className="text-xl font-bold text-text-primary mb-2">Contrasena actualizada</h2>
          <p className="text-text-secondary mb-6">Ya puedes iniciar sesion con tu nueva contrasena.</p>
          <Link to="/login" className="inline-block bg-brand-orange text-white px-6 py-2 rounded-btn font-medium hover:bg-orange-600">
            Iniciar sesion
          </Link>
        </Card>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <Card>
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-brand-navy">Nueva contrasena</h2>
          <p className="text-text-secondary text-sm mt-1">Ingresa tu nueva contrasena</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-btn text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Nueva contrasena" type="password" name="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 8 caracteres" required />
          <Input label="Confirmar contrasena" type="password" name="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repite tu contrasena" required />
          <Button type="submit" className="w-full" loading={loading}>
            Restablecer contrasena
          </Button>
        </form>
      </Card>
    </AuthLayout>
  );
}
