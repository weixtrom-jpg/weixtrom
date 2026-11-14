import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/layouts';
import { Card, Badge, Button } from '@/components/ui';
import { api } from '@/lib/api';

const clientNav = [
  { label: 'Inicio', href: '/client' },
  { label: 'Vehiculos', href: '/client/vehicles' },
  { label: 'Servicios', href: '/client/services' },
  { label: 'Facturas', href: '/client/invoices' },
  { label: 'Mi perfil', href: '/client/profile' },
];

type VehicleStatus = 'ACTIVE' | 'INACTIVE';

interface Vehicle {
  id: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  status: VehicleStatus;
  createdAt: string;
}

interface PaginatedResponse {
  data: Vehicle[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const STATUS_BADGE: Record<VehicleStatus, { label: string; variant: 'success' | 'default' }> = {
  ACTIVE: { label: 'Activo', variant: 'success' },
  INACTIVE: { label: 'Inactivo', variant: 'default' },
};

export function ClientVehiclesPage() {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string> = { page: String(page), limit: '10' };
      const res = await api.get<PaginatedResponse>('/vehicles', params);
      setVehicles(res.data);
      setTotalPages(res.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar vehiculos');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  return (
    <DashboardLayout roleName="Cliente" navItems={clientNav}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h1 className="text-xl font-bold text-text-primary">Mis vehiculos</h1>
        <Button size="sm" onClick={() => navigate('/client/vehicles/new')}>Registrar vehiculo</Button>
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
        ) : vehicles.length === 0 ? (
          <div className="text-center py-12 text-text-secondary text-sm">
            No tienes vehiculos registrados. Usa el boton "Registrar vehiculo" para agregar el primero.
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-border bg-surface-muted/50">
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">Placa</th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">Marca</th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">Modelo</th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">Ano</th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">Color</th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicles.map((v) => {
                    const badge = STATUS_BADGE[v.status] ?? STATUS_BADGE.ACTIVE;
                    return (
                      <tr
                        key={v.id}
                        className="border-b border-surface-border last:border-b-0 hover:bg-surface-muted/30 transition-colors cursor-pointer"
                        onClick={() => navigate(`/client/vehicles/${v.id}`)}
                      >
                        <td className="px-4 py-3 text-text-primary font-mono text-xs font-medium">{v.plate}</td>
                        <td className="px-4 py-3 text-text-primary">{v.brand}</td>
                        <td className="px-4 py-3 text-text-secondary">{v.model}</td>
                        <td className="px-4 py-3 text-text-secondary">{v.year}</td>
                        <td className="px-4 py-3 text-text-secondary">{v.color}</td>
                        <td className="px-4 py-3"><Badge variant={badge.variant}>{badge.label}</Badge></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-surface-border">
              {vehicles.map((v) => {
                const badge = STATUS_BADGE[v.status] ?? STATUS_BADGE.ACTIVE;
                return (
                  <div
                    key={v.id}
                    className="p-4 space-y-2 cursor-pointer hover:bg-surface-muted/30 transition-colors"
                    onClick={() => navigate(`/client/vehicles/${v.id}`)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-text-primary font-mono">{v.plate}</p>
                        <p className="text-xs text-text-secondary">{v.brand} {v.model} {v.year}</p>
                      </div>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </div>
                    {v.color && (
                      <p className="text-xs text-text-secondary">Color: {v.color}</p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-surface-border">
                <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
                <span className="text-sm text-text-secondary">Pagina {page} de {totalPages}</span>
                <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Siguiente</Button>
              </div>
            )}
          </>
        )}
      </Card>
    </DashboardLayout>
  );
}
