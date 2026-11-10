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

interface DiagnosticRequest {
  id: string;
  description: string;
  status: 'PENDING' | 'TAKEN' | 'DIAGNOSED' | 'EXPIRED';
  vehicle: { brand: string; model: string; year: number; plate: string };
  createdAt: string;
}

interface PaginatedResponse {
  data: DiagnosticRequest[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const STATUS_BADGE: Record<DiagnosticRequest['status'], { label: string; variant: 'info' | 'warning' | 'success' | 'default' }> = {
  PENDING: { label: 'Pendiente', variant: 'info' },
  TAKEN: { label: 'Tomada', variant: 'warning' },
  DIAGNOSED: { label: 'Diagnosticada', variant: 'success' },
  EXPIRED: { label: 'Expirada', variant: 'default' },
};

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'PENDING', label: 'Pendientes' },
  { value: 'TAKEN', label: 'Tomadas' },
  { value: 'DIAGNOSED', label: 'Diagnosticadas' },
];

export function WorkshopRequestsPage() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<DiagnosticRequest[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string> = { page: String(page), limit: '10' };
      if (statusFilter) params.status = statusFilter;

      const res = await api.get<PaginatedResponse>('/diagnostics', params);
      setRequests(res.data);
      setTotalPages(res.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar solicitudes');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  function handleFilterChange(value: string) {
    setStatusFilter(value);
    setPage(1);
  }

  function truncate(text: string, max: number) {
    return text.length > max ? text.slice(0, max) + '...' : text;
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  return (
    <DashboardLayout roleName="Admin. Taller" navItems={workshopNav}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h1 className="text-xl font-bold text-text-primary">Solicitudes de diagnostico</h1>
        <select
          value={statusFilter}
          onChange={(e) => handleFilterChange(e.target.value)}
          className="px-3 py-2 min-h-[44px] rounded-btn border border-surface-border text-text-primary text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-orange/50"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {error && (
        <Card className="mb-4">
          <div className="text-center py-4 text-red-600 text-sm">{error}</div>
        </Card>
      )}

      <Card padding="none">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-6 w-6 border-4 border-brand-orange border-t-transparent rounded-full" />
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-12 text-text-secondary text-sm">
            No hay solicitudes{statusFilter ? ` con estado "${STATUS_BADGE[statusFilter as DiagnosticRequest['status']]?.label}"` : ''}. Cuando un cliente solicite un diagnostico, aparecera aqui.
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-border bg-surface-muted/50">
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">Vehiculo</th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">Placa</th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">Descripcion</th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">Estado</th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">Fecha</th>
                    <th className="text-right px-4 py-3 font-medium text-text-secondary">Accion</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((req) => {
                    const badge = STATUS_BADGE[req.status];
                    return (
                      <tr key={req.id} className="border-b border-surface-border last:border-b-0 hover:bg-surface-muted/30 transition-colors">
                        <td className="px-4 py-3 text-text-primary font-medium">
                          {req.vehicle.brand} {req.vehicle.model} {req.vehicle.year}
                        </td>
                        <td className="px-4 py-3 text-text-secondary font-mono text-xs">
                          {req.vehicle.plate}
                        </td>
                        <td className="px-4 py-3 text-text-secondary">
                          {truncate(req.description, 60)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                        </td>
                        <td className="px-4 py-3 text-text-secondary text-xs">
                          {formatDate(req.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/workshop/requests/${req.id}`)}
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
              {requests.map((req) => {
                const badge = STATUS_BADGE[req.status];
                return (
                  <div key={req.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-text-primary">
                          {req.vehicle.brand} {req.vehicle.model} {req.vehicle.year}
                        </p>
                        <p className="text-xs text-text-secondary font-mono">{req.vehicle.plate}</p>
                      </div>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </div>
                    <p className="text-sm text-text-secondary">{truncate(req.description, 60)}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-text-secondary">{formatDate(req.createdAt)}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/workshop/requests/${req.id}`)}
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
