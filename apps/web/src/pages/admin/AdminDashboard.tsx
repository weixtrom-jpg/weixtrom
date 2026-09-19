import { DashboardLayout } from '@/layouts';
import { Card, Badge } from '@/components/ui';

const adminNav = [
  { label: 'Panel', href: '/admin' },
  { label: 'Usuarios', href: '/admin/users' },
  { label: 'Talleres', href: '/admin/workshops' },
  { label: 'Proveedores', href: '/admin/suppliers' },
  { label: 'Reportes', href: '/admin/reports' },
  { label: 'Auditoria', href: '/admin/audit' },
  { label: 'Configuracion', href: '/admin/settings' },
];

export function AdminDashboard() {
  return (
    <DashboardLayout roleName="Super Admin" navItems={adminNav}>
      <h1 className="text-xl font-bold text-text-primary mb-4">Panel de administracion</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Usuarios totales', value: '5', variant: 'info' as const },
          { label: 'Talleres activos', value: '1', variant: 'success' as const },
          { label: 'Proveedores activos', value: '1', variant: 'success' as const },
          { label: 'Ordenes este mes', value: '0', variant: 'default' as const },
        ].map((kpi) => (
          <Card key={kpi.label} padding="sm">
            <p className="text-xs text-text-secondary">{kpi.label}</p>
            <p className="text-2xl font-bold text-text-primary mt-1">{kpi.value}</p>
            <Badge variant={kpi.variant} className="mt-2">Actualizado</Badge>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <h2 className="font-semibold text-text-primary mb-3">Usuarios recientes</h2>
          <div className="text-center py-6 text-text-secondary text-sm">
            5 usuarios registrados (seed de desarrollo)
          </div>
        </Card>
        <Card>
          <h2 className="font-semibold text-text-primary mb-3">Actividad reciente</h2>
          <div className="text-center py-6 text-text-secondary text-sm">
            Sin actividad registrada aun.
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
