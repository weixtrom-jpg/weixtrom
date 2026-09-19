import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/layouts';
import { Button, Input, Card } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';

const ROLES = [
  { value: 'CLIENT', label: 'Propietario de vehiculo' },
  { value: 'WORKSHOP_ADMIN', label: 'Administrador de taller' },
  { value: 'SUPPLIER_ADMIN', label: 'Proveedor de repuestos' },
  { value: 'TECHNICIAN', label: 'Tecnico mecanico' },
];

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    role: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.role) {
      setError('Selecciona tu rol');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await register(form);
      navigate('/login', {
        replace: true,
        state: { message: 'Cuenta creada. Revisa tu correo para verificar tu cuenta.' },
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al registrar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <Card>
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-brand-navy">Crear cuenta</h2>
          <p className="text-text-secondary text-sm mt-1">Selecciona tu rol y registrate</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-btn text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Nombre" name="firstName" value={form.firstName} onChange={handleChange} required />
            <Input label="Apellido" name="lastName" value={form.lastName} onChange={handleChange} required />
          </div>

          <Input label="Correo electronico" type="email" name="email" value={form.email} onChange={handleChange} required />
          <Input label="Telefono" type="tel" name="phone" value={form.phone} onChange={handleChange} />
          <Input label="Contrasena" type="password" name="password" value={form.password} onChange={handleChange} placeholder="Min. 8 caracteres, 1 mayuscula, 1 numero" required />

          <div className="space-y-1">
            <label className="block text-sm font-medium text-text-primary">Soy...</label>
            <div className="grid grid-cols-2 gap-2">
              {ROLES.map((role) => (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, role: role.value }))}
                  className={`p-3 border rounded-btn text-sm text-left transition-colors ${
                    form.role === role.value
                      ? 'border-brand-orange bg-orange-50 text-brand-orange font-medium'
                      : 'border-surface-border text-text-primary hover:border-brand-orange'
                  }`}
                >
                  {role.label}
                </button>
              ))}
            </div>
          </div>

          <Button type="submit" className="w-full" loading={loading}>
            Crear cuenta
          </Button>
        </form>

        <div className="mt-4 text-center text-sm text-text-secondary">
          Ya tienes cuenta?{' '}
          <Link to="/login" className="text-brand-orange hover:underline font-medium">
            Iniciar sesion
          </Link>
        </div>
      </Card>
    </AuthLayout>
  );
}
