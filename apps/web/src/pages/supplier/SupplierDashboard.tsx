import { DashboardLayout } from '@/layouts';
import { Card, Badge } from '@/components/ui';

const supplierNav = [
  { label: 'Panel', href: '/supplier' },
  { label: 'Catalogo', href: '/supplier/products' },
  { label: 'Cotizaciones', href: '/supplier/quotes' },
];

export function SupplierDashboard() {
  return (
    <DashboardLayout roleName="Admin. Proveedor" navItems={supplierNav}>
      <h1 className="text-xl font-bold text-text-primary mb-4">Panel del Proveedor</h1>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Productos activos', value: '0', variant: 'info' as const },
          { label: 'Cotizaciones pendientes', value: '0', variant: 'warning' as const },
          { label: 'Respondidas este mes', value: '0', variant: 'success' as const },
        ].map((kpi) => (
          <Card key={kpi.label} padding="sm">
            <p className="text-xs text-text-secondary">{kpi.label}</p>
            <p className="text-2xl font-bold text-text-primary mt-1">{kpi.value}</p>
            <Badge variant={kpi.variant} className="mt-2">Actualizado</Badge>
          </Card>
        ))}
      </div>

      <Card>
        <h2 className="font-semibold text-text-primary mb-3">Solicitudes de cotizacion</h2>
        <div className="text-center py-8 text-text-secondary text-sm">
          No hay solicitudes pendientes de respuesta.
        </div>
      </Card>
    </DashboardLayout>
  );
}
