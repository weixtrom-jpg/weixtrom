import { AuthLayout } from '@/layouts';
import { Button, Input, Card } from '@/components/ui';

export function LoginPage() {
  return (
    <AuthLayout>
      <Card>
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-brand-navy">Iniciar sesion</h2>
          <p className="text-text-secondary text-sm mt-1">
            Ingresa a tu cuenta de MecaniControl
          </p>
        </div>

        <form className="space-y-4">
          <Input label="Correo electronico" type="email" placeholder="tu@correo.com" />
          <Input label="Contrasena" type="password" placeholder="••••••••" />

          <Button type="submit" className="w-full">
            Iniciar sesion
          </Button>
        </form>

        <div className="mt-4 text-center text-sm">
          <a href="/forgot-password" className="text-brand-orange hover:underline">
            Olvide mi contrasena
          </a>
        </div>

        <div className="mt-6 text-center text-sm text-text-secondary">
          No tienes cuenta?{' '}
          <a href="/register" className="text-brand-orange hover:underline font-medium">
            Registrate
          </a>
        </div>
      </Card>
    </AuthLayout>
  );
}
