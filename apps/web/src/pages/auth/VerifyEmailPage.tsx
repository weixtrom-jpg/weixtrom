import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AuthLayout } from '@/layouts';
import { Card } from '@/components/ui';
import { api } from '@/lib/api';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Token de verificacion no proporcionado.');
      return;
    }

    api.get<{ message: string }>(`/auth/verify/${token}`)
      .then((res) => {
        setStatus('success');
        setMessage(res.message);
      })
      .catch((err: unknown) => {
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'Token invalido o expirado.');
      });
  }, [token]);

  return (
    <AuthLayout>
      <Card className="text-center">
        {status === 'loading' && (
          <div className="py-8">
            <div className="animate-spin h-8 w-8 border-4 border-brand-orange border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-text-secondary">Verificando tu correo...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="py-8">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-green-600 text-2xl">✓</span>
            </div>
            <h2 className="text-xl font-bold text-text-primary mb-2">Correo verificado</h2>
            <p className="text-text-secondary mb-6">{message}</p>
            <Link to="/login" className="inline-block bg-brand-orange text-white px-6 py-2 rounded-btn font-medium hover:bg-orange-600">
              Iniciar sesion
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="py-8">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-600 text-2xl">✕</span>
            </div>
            <h2 className="text-xl font-bold text-text-primary mb-2">Error de verificacion</h2>
            <p className="text-text-secondary mb-6">{message}</p>
            <Link to="/login" className="text-brand-orange hover:underline font-medium">
              Volver al inicio de sesion
            </Link>
          </div>
        )}
      </Card>
    </AuthLayout>
  );
}
