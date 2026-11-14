import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/layouts';
import { Card, Badge } from '@/components/ui';
import { api } from '@/lib/api';

const adminNav = [
  { label: 'Panel', href: '/admin' },
  { label: 'Usuarios', href: '/admin/users' },
  { label: 'Talleres', href: '/admin/workshops' },
  { label: 'Proveedores', href: '/admin/suppliers' },
  { label: 'Reportes', href: '/admin/reports' },
  { label: 'Auditoria', href: '/admin/audit' },
  { label: 'Configuracion', href: '/admin/settings' },
];

interface KpiData {
  users: number;
  workshops: number;
  suppliers: number;
  diagnostics: number;
}

export function AdminDashboard() {
  const [kpis, setKpis] = useState<KpiData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchKpis() {
      const results = await Promise.allSettled([
        api.get<{ data: unknown[]; total: number }>('/admin/users', { limit: '1' }),
        api.get<{ data: unknown[]; total: number }>('/admin/workshops', { limit: '1' }),
        api.get<{ data: unknown[]; total: number }>('/admin/suppliers', { limit: '1' }),
        api.get<{ data: unknown[]; total: number }>('/diagnostics', { limit: '1' }),
      ]);

      setKpis({
        users: results[0].status === 'fulfilled' ? results[0].value.total : 0,
        workshops: results[1].status === 'fulfilled' ? results[1].value.total : 0,
        suppliers: results[2].status === 'fulfilled' ? results[2].value.total : 0,
        diagnostics: results[3].status === 'fulfilled' ? results[3].value.total : 0,
      });
      setLoading(false);
    }

    fetchKpis();
  }, []);

  const kpiItems = [
    { label: 'Usuarios totales', value: kpis?.users ?? 0, variant: 'info' as const },
    { label: 'Talleres activos', value: kpis?.workshops ?? 0, variant: 'success' as const },
    { label: 'Proveedores activos', value: kpis?.suppliers ?? 0, variant: 'success' as const },
    { label: 'Diagnosticos', value: kpis?.diagnostics ?? 0, variant: 'default' as const },
  ];

  return (
    <DashboardLayout roleName="Super Admin" navItems={adminNav}>
      <h1 className="text-xl font-bold text-text-primary mb-4">Panel de administracion</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpiItems.map((kpi) => (
          <Card key={kpi.label} padding="sm">
            <p className="text-xs text-text-secondary">{kpi.label}</p>
            {loading ? (
              <div className="animate-pulse h-8 bg-surface-border rounded w-12 mt-1" />
            ) : (
              <p className="text-2xl font-bold text-text-primary mt-1">{kpi.value}</p>
            )}
            <Badge variant={kpi.variant} className="mt-2">Actualizado</Badge>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <h2 className="font-semibold text-text-primary mb-3">Accesos rapidos</h2>
          <div className="space-y-2">
            <a href="/admin/users" className="block px-3 py-2 rounded-lg hover:bg-surface-muted/50 text-sm text-text-primary transition-colors">
              Gestionar usuarios y roles
            </a>
            <a href="/admin/workshops" className="block px-3 py-2 rounded-lg hover:bg-surface-muted/50 text-sm text-text-primary transition-colors">
              Administrar talleres
            </a>
            <a href="/admin/suppliers" className="block px-3 py-2 rounded-lg hover:bg-surface-muted/50 text-sm text-text-primary transition-colors">
              Administrar proveedores
            </a>
          </div>
        </Card>
        <Card>
          <h2 className="font-semibold text-text-primary mb-3">Estado del sistema</h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between py-1">
              <span className="text-text-secondary">API</span>
              <Badge variant="success">Operativo</Badge>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-text-secondary">Base de datos</span>
              <Badge variant="success">Conectada</Badge>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-text-secondary">Notificaciones por correo</span>
              <Badge variant="warning">Pendiente</Badge>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
