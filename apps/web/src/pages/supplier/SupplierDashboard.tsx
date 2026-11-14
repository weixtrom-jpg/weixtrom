import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '@/layouts';
import { Card, Badge, Button } from '@/components/ui';
import { api } from '@/lib/api';

const supplierNav = [
  { label: 'Panel', href: '/supplier' },
  { label: 'Catalogo', href: '/supplier/products' },
  { label: 'Cotizaciones', href: '/supplier/quotes' },
];

interface KpiData {
  activeProducts: number;
  pendingQuotes: number;
}

interface RecentQuote {
  id: string;
  workshopName: string;
  partDescription: string;
  createdAt: string;
}

interface PaginatedProducts {
  data: unknown[];
  total: number;
}

interface PaginatedQuotes {
  data: RecentQuote[];
  total: number;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

function truncate(text: string, max: number) {
  return text.length > max ? text.slice(0, max) + '...' : text;
}

export function SupplierDashboard() {
  const [kpis, setKpis] = useState<KpiData>({ activeProducts: 0, pendingQuotes: 0 });
  const [recentQuotes, setRecentQuotes] = useState<RecentQuote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      try {
        const [productsRes, pendingRes, recentRes] = await Promise.allSettled([
          api.get<PaginatedProducts>('/products', { status: 'ACTIVE', limit: '1' }),
          api.get<PaginatedQuotes>('/supplier-quotes/requests', { status: 'PENDING', limit: '1' }),
          api.get<PaginatedQuotes>('/supplier-quotes/requests', { status: 'PENDING', limit: '3' }),
        ]);

        setKpis({
          activeProducts: productsRes.status === 'fulfilled' ? productsRes.value.total : 0,
          pendingQuotes: pendingRes.status === 'fulfilled' ? pendingRes.value.total : 0,
        });

        if (recentRes.status === 'fulfilled') {
          setRecentQuotes(recentRes.value.data);
        }
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  return (
    <DashboardLayout roleName="Admin. Proveedor" navItems={supplierNav}>
      <h1 className="text-xl font-bold text-text-primary mb-4">Panel del Proveedor</h1>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} padding="sm">
              <div className="animate-pulse space-y-2">
                <div className="h-3 bg-gray-200 rounded w-20" />
                <div className="h-7 bg-gray-200 rounded w-10" />
              </div>
            </Card>
          ))
        ) : (
          <>
            <Card padding="sm">
              <p className="text-xs text-text-secondary">Productos activos</p>
              <p className="text-2xl font-bold text-text-primary mt-1">{kpis.activeProducts}</p>
              <Badge variant="info" className="mt-2">
                <Link to="/supplier/products">Ver catalogo</Link>
              </Badge>
            </Card>
            <Card padding="sm">
              <p className="text-xs text-text-secondary">Cotizaciones pendientes</p>
              <p className="text-2xl font-bold text-text-primary mt-1">{kpis.pendingQuotes}</p>
              <Badge variant={kpis.pendingQuotes > 0 ? 'warning' : 'success'} className="mt-2">
                {kpis.pendingQuotes > 0 ? 'Requieren respuesta' : 'Al dia'}
              </Badge>
            </Card>
            <Card padding="sm">
              <p className="text-xs text-text-secondary">Respondidas (recientes)</p>
              <p className="text-2xl font-bold text-text-primary mt-1">-</p>
              <Badge variant="success" className="mt-2">Proximamente</Badge>
            </Card>
          </>
        )}
      </div>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-text-primary">Solicitudes pendientes</h2>
          <Link to="/supplier/quotes">
            <Button variant="ghost" size="sm">Ver todas</Button>
          </Link>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-6 w-6 border-4 border-brand-orange border-t-transparent rounded-full" />
          </div>
        ) : recentQuotes.length === 0 ? (
          <div className="text-center py-8 text-text-secondary text-sm">
            No hay solicitudes pendientes de respuesta.
          </div>
        ) : (
          <div className="divide-y divide-surface-border">
            {recentQuotes.map((q) => (
              <div key={q.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{q.workshopName}</p>
                  <p className="text-xs text-text-secondary truncate">{truncate(q.partDescription, 60)}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs text-text-secondary hidden sm:inline">{formatDate(q.createdAt)}</span>
                  <Badge variant="warning">Pendiente</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </DashboardLayout>
  );
}
