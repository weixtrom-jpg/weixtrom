import { DashboardLayout } from '@/layouts';
import { Card, Badge } from '@/components/ui';

const clientNav = [
  { label: 'Inicio', href: '/client' },
  { label: 'Vehiculos', href: '/client/vehicles' },
  { label: 'Servicios', href: '/client/services' },
  { label: 'Facturas', href: '/client/invoices' },
  { label: 'Mi perfil', href: '/client/profile' },
];

export function ClientDashboard() {
  return (
    <DashboardLayout roleName="Cliente" navItems={clientNav}>
      <h1 className="text-xl font-bold text-text-primary mb-4">Mi panel</h1>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Vehiculos registrados', value: '0', variant: 'info' as const },
          { label: 'Alertas legales', value: '0', variant: 'warning' as const },
          { label: 'Servicios activos', value: '0', variant: 'success' as const },
        ].map((kpi) => (
          <Card key={kpi.label} padding="sm">
            <p className="text-xs text-text-secondary">{kpi.label}</p>
            <p className="text-2xl font-bold text-text-primary mt-1">{kpi.value}</p>
            <Badge variant={kpi.variant} className="mt-2">Al dia</Badge>
          </Card>
        ))}
      </div>

      <Card>
        <h2 className="font-semibold text-text-primary mb-3">Actividad reciente</h2>
        <div className="text-center py-8 text-text-secondary text-sm">
          Registra tu primer vehiculo para empezar.
        </div>
      </Card>
    </DashboardLayout>
  );
}
