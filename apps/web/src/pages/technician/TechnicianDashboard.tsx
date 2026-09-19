import { DashboardLayout } from '@/layouts';
import { Card, Badge } from '@/components/ui';

const technicianNav = [
  { label: 'Mis ordenes', href: '/technician' },
  { label: 'Mi perfil', href: '/technician/profile' },
];

export function TechnicianDashboard() {
  return (
    <DashboardLayout roleName="Tecnico" navItems={technicianNav}>
      <h1 className="text-xl font-bold text-text-primary mb-4">Mis ordenes de trabajo</h1>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {[
          { label: 'Asignadas', value: '0', variant: 'info' as const },
          { label: 'En proceso', value: '0', variant: 'warning' as const },
        ].map((kpi) => (
          <Card key={kpi.label} padding="sm">
            <p className="text-xs text-text-secondary">{kpi.label}</p>
            <p className="text-2xl font-bold text-text-primary mt-1">{kpi.value}</p>
            <Badge variant={kpi.variant} className="mt-2">Hoy</Badge>
          </Card>
        ))}
      </div>

      <Card>
        <h2 className="font-semibold text-text-primary mb-3">Ordenes asignadas</h2>
        <div className="text-center py-8 text-text-secondary text-sm">
          No tienes ordenes asignadas en este momento.
        </div>
      </Card>
    </DashboardLayout>
  );
}
