import { AuthLayout } from '@/layouts';
import { Button, Input, Card } from '@/components/ui';

export function RegisterPage() {
  return (
    <AuthLayout>
      <Card>
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-brand-navy">Crear cuenta</h2>
          <p className="text-text-secondary text-sm mt-1">
            Selecciona tu rol y registrate
          </p>
        </div>

        <form className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Nombre" placeholder="Tu nombre" />
            <Input label="Apellido" placeholder="Tu apellido" />
          </div>

          <Input label="Correo electronico" type="email" placeholder="tu@correo.com" />
          <Input label="Telefono" type="tel" placeholder="300 123 4567" />
          <Input label="Contrasena" type="password" placeholder="Min. 8 caracteres" />

          {/* Selector de rol */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-text-primary">Soy...</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'CLIENT', label: 'Propietario de vehiculo' },
                { value: 'WORKSHOP_ADMIN', label: 'Administrador de taller' },
                { value: 'SUPPLIER_ADMIN', label: 'Proveedor de repuestos' },
                { value: 'TECHNICIAN', label: 'Tecnico mecanico' },
              ].map((role) => (
                <button
                  key={role.value}
                  type="button"
                  className="p-3 border border-surface-border rounded-btn text-sm text-text-primary hover:border-brand-orange hover:bg-orange-50 transition-colors text-left"
                >
                  {role.label}
                </button>
              ))}
            </div>
          </div>

          <Button type="submit" className="w-full">
            Crear cuenta
          </Button>
        </form>

        <div className="mt-4 text-center text-sm text-text-secondary">
          Ya tienes cuenta?{' '}
          <a href="/login" className="text-brand-orange hover:underline font-medium">
            Iniciar sesion
          </a>
        </div>
      </Card>
    </AuthLayout>
  );
}
