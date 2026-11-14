import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/layouts';
import { Card, Badge } from '@/components/ui';
import { api } from '@/lib/api';

const clientNav = [
  { label: 'Inicio', href: '/client' },
  { label: 'Vehiculos', href: '/client/vehicles' },
  { label: 'Servicios', href: '/client/services' },
  { label: 'Facturas', href: '/client/invoices' },
  { label: 'Mi perfil', href: '/client/profile' },
];

interface KpiData {
  vehicles: number;
  legalAlerts: number;
  activeServices: number;
}

interface RecentDiagnostic {
  id: string;
  description: string;
  status: string;
  createdAt: string;
  vehicle: { brand: string; model: string; plate: string };
}

export function ClientDashboard() {
  const [kpis, setKpis] = useState<KpiData | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentDiagnostic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchKpis() {
      const results = await Promise.allSettled([
        api.get<{ data: unknown[]; total: number }>('/vehicles'),
        api.get<{ data: RecentDiagnostic[]; total: number }>('/diagnostics', { limit: '5' }),
        api.get<{ total: number; unread: number }>('/notifications', { unread: 'true' }),
      ]);

      const vehiclesTotal = results[0].status === 'fulfilled' ? results[0].value.total : 0;
      const diagData = results[1].status === 'fulfilled' ? results[1].value.data : [];
      const activeServices = diagData.filter((d) => d.status === 'PENDING' || d.status === 'IN_PROGRESS').length;

      setKpis({
        vehicles: vehiclesTotal,
        legalAlerts: 0,
        activeServices,
      });
      setRecentActivity(diagData);
      setLoading(false);
    }

    fetchKpis();
  }, []);

  const kpiItems = [
    { label: 'Vehiculos registrados', value: kpis?.vehicles ?? 0, variant: 'info' as const, badge: 'Al dia' },
    { label: 'Alertas legales', value: kpis?.legalAlerts ?? 0, variant: 'warning' as const, badge: 'Proximamente' },
    { label: 'Servicios activos', value: kpis?.activeServices ?? 0, variant: 'success' as const, badge: 'Al dia' },
  ];

  return (
    <DashboardLayout roleName="Cliente" navItems={clientNav}>
      <h1 className="text-xl font-bold text-text-primary mb-4">Mi panel</h1>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {kpiItems.map((kpi) => (
          <Card key={kpi.label} padding="sm">
            <p className="text-xs text-text-secondary">{kpi.label}</p>
            {loading ? (
              <div className="animate-pulse h-8 bg-surface-border rounded w-12 mt-1" />
            ) : (
              <p className="text-2xl font-bold text-text-primary mt-1">{kpi.value}</p>
            )}
            <Badge variant={kpi.variant} className="mt-2">{kpi.badge}</Badge>
          </Card>
        ))}
      </div>

      <Card>
        <h2 className="font-semibold text-text-primary mb-3">Actividad reciente</h2>
        {loading ? (
          <div className="animate-pulse space-y-3 p-2">
            <div className="h-4 bg-surface-border rounded w-1/3" />
            <div className="h-4 bg-surface-border rounded w-full" />
          </div>
        ) : recentActivity.length === 0 ? (
          <div className="text-center py-8 text-text-secondary text-sm">
            Registra tu primer vehiculo para empezar.
          </div>
        ) : (
          <div className="divide-y divide-surface-border">
            {recentActivity.map((d) => (
              <div key={d.id} className="flex items-center justify-between py-3 px-1">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {d.vehicle.brand} {d.vehicle.model} — {d.vehicle.plate}
                  </p>
                  <p className="text-xs text-text-secondary truncate">{d.description}</p>
                </div>
                <Badge variant={d.status === 'DIAGNOSED' ? 'success' : d.status === 'PENDING' ? 'info' : 'warning'} className="flex-shrink-0 ml-3">
                  {d.status === 'PENDING' ? 'Pendiente' : d.status === 'TAKEN' ? 'En proceso' : d.status === 'DIAGNOSED' ? 'Diagnosticado' : d.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </DashboardLayout>
  );
}
