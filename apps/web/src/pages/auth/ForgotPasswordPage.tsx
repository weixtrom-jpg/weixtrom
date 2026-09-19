import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthLayout } from '@/layouts';
import { Button, Input, Card } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';

export function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <Card>
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-brand-navy">Recuperar contrasena</h2>
          <p className="text-text-secondary text-sm mt-1">
            Ingresa tu correo y te enviaremos un enlace
          </p>
        </div>

        {sent ? (
          <div className="text-center py-4">
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-btn text-sm text-green-700">
              Si el correo esta registrado, recibiras un enlace para restablecer tu contrasena.
            </div>
            <Link to="/login" className="text-brand-orange hover:underline text-sm font-medium">
              Volver al inicio de sesion
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Correo electronico"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              required
            />
            <Button type="submit" className="w-full" loading={loading}>
              Enviar enlace
            </Button>
            <div className="text-center">
              <Link to="/login" className="text-text-secondary hover:text-text-primary text-sm">
                Volver al inicio de sesion
              </Link>
            </div>
          </form>
        )}
      </Card>
    </AuthLayout>
  );
}
