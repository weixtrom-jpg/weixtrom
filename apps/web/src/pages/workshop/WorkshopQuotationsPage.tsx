import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/layouts';
import { Card, Badge, Button } from '@/components/ui';
import { api } from '@/lib/api';

const workshopNav = [
  { label: 'Panel', href: '/workshop' },
  { label: 'Solicitudes', href: '/workshop/requests' },
  { label: 'Cotizaciones', href: '/workshop/quotations' },
  { label: 'Ordenes', href: '/workshop/orders' },
  { label: 'Facturas', href: '/workshop/invoices' },
  { label: 'Tecnicos', href: '/workshop/technicians' },
];

type QuotationStatus = 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED';

interface Quotation {
  id: string;
  shortId?: string;
  status: QuotationStatus;
  total: number;
  diagnosticRequest?: { vehicle: { brand: string; model: string; year: number; plate: string } };
  createdAt: string;
}

interface PaginatedResponse {
  data: Quotation[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const STATUS_BADGE: Record<QuotationStatus, { label: string; variant: 'default' | 'info' | 'success' | 'danger' }> = {
  DRAFT: { label: 'Borrador', variant: 'default' },
  SENT: { label: 'Enviada', variant: 'info' },
  APPROVED: { label: 'Aprobada', variant: 'success' },
  REJECTED: { label: 'Rechazada', variant: 'danger' },
};

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'DRAFT', label: 'Borradores' },
  { value: 'SENT', label: 'Enviadas' },
  { value: 'APPROVED', label: 'Aprobadas' },
  { value: 'REJECTED', label: 'Rechazadas' },
];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function WorkshopQuotationsPage() {
  const navigate = useNavigate();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchQuotations = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string> = { page: String(page), limit: '10' };
      if (statusFilter) params.status = statusFilter;

      const res = await api.get<PaginatedResponse>('/quotations', params);
      setQuotations(res.data);
      setTotalPages(res.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar cotizaciones');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

  function handleFilterChange(value: string) {
    setStatusFilter(value);
    setPage(1);
  }

  return (
    <DashboardLayout roleName="Admin. Taller" navItems={workshopNav}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h1 className="text-xl font-bold text-text-primary">Cotizaciones</h1>
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="px-3 py-2 min-h-[44px] rounded-btn border border-surface-border text-text-primary text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-orange/50"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <Button onClick={() => navigate('/workshop/quotations/new')}>
            Nueva cotizacion
          </Button>
        </div>
      </div>

      {error && (
        <Card className="mb-4">
          <div className="text-center py-4 text-red-600 text-sm">{error}</div>
        </Card>
      )}

      <Card padding="none">
        {loading ? (
          <div className="animate-pulse space-y-3 p-4">
            <div className="h-4 bg-surface-border rounded w-1/3" />
            <div className="h-4 bg-surface-border rounded w-full" />
            <div className="h-4 bg-surface-border rounded w-2/3" />
          </div>
        ) : quotations.length === 0 ? (
          <div className="text-center py-12 text-text-secondary text-sm">
            No hay cotizaciones{statusFilter ? ` con estado "${STATUS_BADGE[statusFilter as QuotationStatus]?.label}"` : ''}. Crea una nueva cotizacion para comenzar.
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-border bg-surface-muted/50">
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">ID</th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">Vehiculo</th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">Placa</th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">Estado</th>
                    <th className="text-right px-4 py-3 font-medium text-text-secondary">Total</th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">Fecha</th>
                    <th className="text-right px-4 py-3 font-medium text-text-secondary">Accion</th>
                  </tr>
                </thead>
                <tbody>
                  {quotations.map((q) => {
                    const badge = STATUS_BADGE[q.status];
                    return (
                      <tr key={q.id} className="border-b border-surface-border last:border-b-0 hover:bg-surface-muted/30 transition-colors">
                        <td className="px-4 py-3 text-text-secondary font-mono text-xs">
                          {q.shortId || q.id.slice(0, 8)}
                        </td>
                        <td className="px-4 py-3 text-text-primary font-medium">
                          {q.diagnosticRequest?.vehicle?.brand} {q.diagnosticRequest?.vehicle?.model} {q.diagnosticRequest?.vehicle?.year}
                        </td>
                        <td className="px-4 py-3 text-text-secondary font-mono text-xs">
                          {q.diagnosticRequest?.vehicle?.plate}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right text-text-primary font-medium">
                          {formatCurrency(q.total)}
                        </td>
                        <td className="px-4 py-3 text-text-secondary text-xs">
                          {formatDate(q.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/workshop/quotations/${q.id}`)}
                          >
                            Ver
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-surface-border">
              {quotations.map((q) => {
                const badge = STATUS_BADGE[q.status];
                return (
                  <div key={q.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-text-primary">
                          {q.diagnosticRequest?.vehicle?.brand} {q.diagnosticRequest?.vehicle?.model} {q.diagnosticRequest?.vehicle?.year}
                        </p>
                        <p className="text-xs text-text-secondary font-mono">{q.diagnosticRequest?.vehicle?.plate}</p>
                      </div>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-text-primary">{formatCurrency(q.total)}</span>
                      <span className="text-xs text-text-secondary">{formatDate(q.createdAt)}</span>
                    </div>
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/workshop/quotations/${q.id}`)}
                      >
                        Ver
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-surface-border">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Anterior
                </Button>
                <span className="text-sm text-text-secondary">
                  Pagina {page} de {totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Siguiente
                </Button>
              </div>
            )}
          </>
        )}
      </Card>
    </DashboardLayout>
  );
}
