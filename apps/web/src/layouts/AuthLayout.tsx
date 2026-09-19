import { type ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-surface-muted flex">
      {/* Panel izquierdo: branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-brand-navy items-center justify-center p-12">
        <div className="text-white max-w-md">
          <h1 className="text-4xl font-bold mb-4">WEIXTROM</h1>
          <p className="text-lg text-blue-200">
            MecaniControl Vehicular — Conectamos clientes, talleres y proveedores
            en un flujo continuo de mantenimiento vehicular.
          </p>
        </div>
      </div>

      {/* Panel derecho: formulario */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
