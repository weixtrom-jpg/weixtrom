import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/layouts';
import { Card, Badge } from '@/components/ui';
import { api } from '@/lib/api';

const workshopNav = [
  { label: 'Panel', href: '/workshop' },
  { label: 'Solicitudes', href: '/workshop/requests' },
  { label: 'Cotizaciones', href: '/workshop/quotations' },
  { label: 'Ordenes', href: '/workshop/orders' },
  { label: 'Facturas', href: '/workshop/invoices' },
  { label: 'Tecnicos', href: '/workshop/technicians' },
];

interface DiagnosticRequest {
  id: string;
  description: string;
  status: 'PENDING' | 'TAKEN' | 'DIAGNOSED' | 'EXPIRED';
  vehicle: { brand: string; model: string; year: number; plate: string };
  createdAt: string;
}

interface KpiData {
  pending: number;
  taken: number;
  diagnosed: number;
  quotations: number;
}

const STATUS_BADGE: Record<string, { label: string; variant: 'info' | 'warning' | 'success' | 'default' }> = {
  PENDING: { label: 'Pendiente', variant: 'info' },
  TAKEN: { label: 'Tomada', variant: 'warning' },
  DIAGNOSED: { label: 'Diagnosticada', variant: 'success' },
  EXPIRED: { label: 'Expirada', variant: 'default' },
};

export function WorkshopDashboard() {
  const navigate = useNavigate();
  const [kpis, setKpis] = useState<KpiData | null>(null);
  const [recentRequests, setRecentRequests] = useState<DiagnosticRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const results = await Promise.allSettled([
        api.get<{ data: DiagnosticRequest[]; total: number }>('/diagnostics', { status: 'PENDING', limit: '1' }),
        api.get<{ data: unknown[]; total: number }>('/diagnostics', { status: 'TAKEN', limit: '1' }),
        api.get<{ data: unknown[]; total: number }>('/diagnostics', { status: 'DIAGNOSED', limit: '1' }),
        api.get<{ data: unknown[]; total: number }>('/quotations', { limit: '1' }),
        api.get<{ data: DiagnosticRequest[]; total: number }>('/diagnostics', { limit: '5' }),
      ]);

      setKpis({
        pending: results[0].status === 'fulfilled' ? results[0].value.total : 0,
        taken: results[1].status === 'fulfilled' ? results[1].value.total : 0,
        diagnosed: results[2].status === 'fulfilled' ? results[2].value.total : 0,
        quotations: results[3].status === 'fulfilled' ? results[3].value.total : 0,
      });

      if (results[4].status === 'fulfilled') {
        setRecentRequests(results[4].value.data);
      }

      setLoading(false);
    }

    fetchData();
  }, []);

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
  }

  const kpiItems = [
    { label: 'Solicitudes pendientes', value: kpis?.pending ?? 0, variant: 'info' as const },
    { label: 'En proceso', value: kpis?.taken ?? 0, variant: 'warning' as const },
    { label: 'Diagnosticadas', value: kpis?.diagnosed ?? 0, variant: 'success' as const },
    { label: 'Cotizaciones', value: kpis?.quotations ?? 0, variant: 'default' as const },
  ];

  return (
    <DashboardLayout roleName="Admin. Taller" navItems={workshopNav}>
      <h1 className="text-xl font-bold text-text-primary mb-4">Panel del Taller</h1>

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

      <Card>
        <h2 className="font-semibold text-text-primary mb-3">Solicitudes recientes</h2>
        {loading ? (
          <div className="animate-pulse space-y-3 p-2">
            <div className="h-4 bg-surface-border rounded w-1/3" />
            <div className="h-4 bg-surface-border rounded w-full" />
            <div className="h-4 bg-surface-border rounded w-2/3" />
          </div>
        ) : recentRequests.length === 0 ? (
          <div className="text-center py-8 text-text-secondary text-sm">
            No hay solicitudes pendientes. Cuando un cliente solicite un diagnostico, aparecera aqui.
          </div>
        ) : (
          <div className="divide-y divide-surface-border">
            {recentRequests.map((req) => {
              const badge = STATUS_BADGE[req.status] ?? { label: req.status, variant: 'default' as const };
              return (
                <div
                  key={req.id}
                  className="flex items-center justify-between py-3 px-1 cursor-pointer hover:bg-surface-muted/30 rounded transition-colors"
                  onClick={() => navigate(`/workshop/requests/${req.id}`)}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {req.vehicle.brand} {req.vehicle.model} — {req.vehicle.plate}
                    </p>
                    <p className="text-xs text-text-secondary truncate">{req.description}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                    <span className="text-xs text-text-secondary">{formatDate(req.createdAt)}</span>
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </DashboardLayout>
  );
}
