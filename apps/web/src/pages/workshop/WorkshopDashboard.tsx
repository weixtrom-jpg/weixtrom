import { DashboardLayout } from '@/layouts';
import { Card, Badge } from '@/components/ui';

const workshopNav = [
  { label: 'Panel', href: '/workshop' },
  { label: 'Solicitudes', href: '/workshop/requests' },
  { label: 'Cotizaciones', href: '/workshop/quotations' },
  { label: 'Ordenes', href: '/workshop/orders' },
  { label: 'Facturas', href: '/workshop/invoices' },
  { label: 'Tecnicos', href: '/workshop/technicians' },
];

export function WorkshopDashboard() {
  return (
    <DashboardLayout roleName="Admin. Taller" navItems={workshopNav}>
      <h1 className="text-xl font-bold text-text-primary mb-4">Panel del Taller</h1>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Solicitudes pendientes', value: '0', variant: 'info' as const },
          { label: 'Ordenes en proceso', value: '0', variant: 'warning' as const },
          { label: 'Facturas por cobrar', value: '0', variant: 'danger' as const },
          { label: 'Completadas este mes', value: '0', variant: 'success' as const },
        ].map((kpi) => (
          <Card key={kpi.label} padding="sm">
            <p className="text-xs text-text-secondary">{kpi.label}</p>
            <p className="text-2xl font-bold text-text-primary mt-1">{kpi.value}</p>
            <Badge variant={kpi.variant} className="mt-2">Actualizado</Badge>
          </Card>
        ))}
      </div>

      {/* Solicitudes recientes */}
      <Card>
        <h2 className="font-semibold text-text-primary mb-3">Solicitudes recientes</h2>
        <div className="text-center py-8 text-text-secondary text-sm">
          No hay solicitudes pendientes. Cuando un cliente solicite un diagnostico, aparecera aqui.
        </div>
      </Card>
    </DashboardLayout>
  );
}
