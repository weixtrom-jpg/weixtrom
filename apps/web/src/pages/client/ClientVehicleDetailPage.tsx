import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/layouts';
import { Card, Badge, Button, Input } from '@/components/ui';
import { api } from '@/lib/api';

const clientNav = [
  { label: 'Inicio', href: '/client' },
  { label: 'Vehiculos', href: '/client/vehicles' },
  { label: 'Servicios', href: '/client/services' },
  { label: 'Facturas', href: '/client/invoices' },
  { label: 'Mi perfil', href: '/client/profile' },
];

type VehicleStatus = 'ACTIVE' | 'INACTIVE';
type ObligationType = 'SOAT' | 'RTM' | 'INSURANCE';

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

interface LegalObligation {
  id: string;
  type: ObligationType;
  expirationDate: string;
  alerts?: { id: string; alertDate: string; sent: boolean }[];
}

interface HistoryEntry {
  id: string;
  type: string;
  description: string;
  date: string;
  status: string;
}

interface HistoryResponse {
  data: HistoryEntry[];
  total: number;
  page: number;
  totalPages: number;
}

const STATUS_BADGE: Record<VehicleStatus, { label: string; variant: 'success' | 'default' }> = {
  ACTIVE: { label: 'Activo', variant: 'success' },
  INACTIVE: { label: 'Inactivo', variant: 'default' },
};

const OBLIGATION_LABELS: Record<ObligationType, string> = {
  SOAT: 'SOAT',
  RTM: 'Revision tecnico-mecanica',
  INSURANCE: 'Poliza / Seguro',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

function daysUntil(iso: string): number {
  const diff = new Date(iso).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function ClientVehicleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [obligations, setObligations] = useState<LegalObligation[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ brand: '', model: '', year: '', color: '' });
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // New obligation modal
  const [showOblModal, setShowOblModal] = useState(false);
  const [oblForm, setOblForm] = useState({ type: 'SOAT' as ObligationType, expirationDate: '' });
  const [oblSaving, setOblSaving] = useState(false);
  const [oblError, setOblError] = useState('');

  // Toggle status
  const [toggling, setToggling] = useState(false);

  const fetchVehicle = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const [v, oblRes, histRes] = await Promise.all([
        api.get<Vehicle>(`/vehicles/${id}`),
        api.get<{ data: LegalObligation[] }>(`/vehicles/${id}/legal-obligations`).catch(() => ({ data: [] })),
        api.get<HistoryResponse>(`/vehicles/${id}/history`, { limit: '20' }).catch(() => ({ data: [], total: 0, page: 1, totalPages: 1 })),
      ]);
      setVehicle(v);
      setObligations(oblRes.data);
      setHistory(histRes.data);
      setEditForm({ brand: v.brand, model: v.model, year: String(v.year), color: v.color || '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar vehiculo');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchVehicle(); }, [fetchVehicle]);

  function startEdit() {
    if (!vehicle) return;
    setEditForm({ brand: vehicle.brand, model: vehicle.model, year: String(vehicle.year), color: vehicle.color || '' });
    setEditErrors({});
    setEditing(true);
  }

  async function saveEdit() {
    const errors: Record<string, string> = {};
    if (!editForm.brand.trim()) errors.brand = 'Obligatorio';
    if (!editForm.model.trim()) errors.model = 'Obligatorio';
    const y = parseInt(editForm.year, 10);
    if (isNaN(y) || y < 1980 || y > new Date().getFullYear() + 1) errors.year = 'Ano invalido';
    setEditErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    try {
      await api.patch(`/vehicles/${id}`, {
        brand: editForm.brand.trim(),
        model: editForm.model.trim(),
        year: parseInt(editForm.year, 10),
        color: editForm.color.trim() || undefined,
      });
      setEditing(false);
      fetchVehicle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus() {
    if (!vehicle) return;
    setToggling(true);
    try {
      const action = vehicle.status === 'ACTIVE' ? 'inactivate' : 'activate';
      await api.patch(`/vehicles/${id}/${action}`, {});
      fetchVehicle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cambiar estado');
    } finally {
      setToggling(false);
    }
  }

  async function createObligation() {
    if (!oblForm.expirationDate) {
      setOblError('Selecciona una fecha de vencimiento');
      return;
    }
    setOblSaving(true);
    setOblError('');
    try {
      await api.post(`/vehicles/${id}/legal-obligations`, {
        type: oblForm.type,
        expirationDate: new Date(oblForm.expirationDate).toISOString(),
      });
      setShowOblModal(false);
      setOblForm({ type: 'SOAT', expirationDate: '' });
      fetchVehicle();
    } catch (err) {
      setOblError(err instanceof Error ? err.message : 'Error al crear obligacion');
    } finally {
      setOblSaving(false);
    }
  }

  if (loading) {
    return (
      <DashboardLayout roleName="Cliente" navItems={clientNav}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-surface-border rounded w-1/3" />
          <div className="h-40 bg-surface-border rounded" />
        </div>
      </DashboardLayout>
    );
  }

  if (error && !vehicle) {
    return (
      <DashboardLayout roleName="Cliente" navItems={clientNav}>
        <Card>
          <div className="text-center py-8">
            <p className="text-red-600 text-sm mb-4">{error}</p>
            <Button variant="outline" size="sm" onClick={() => navigate('/client/vehicles')}>Volver a vehiculos</Button>
          </div>
        </Card>
      </DashboardLayout>
    );
  }

  if (!vehicle) return null;

  const badge = STATUS_BADGE[vehicle.status] ?? STATUS_BADGE.ACTIVE;

  return (
    <DashboardLayout roleName="Cliente" navItems={clientNav}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/client/vehicles')}>
            &larr; Vehiculos
          </Button>
          <h1 className="text-xl font-bold text-text-primary font-mono">{vehicle.plate}</h1>
          <Badge variant={badge.variant}>{badge.label}</Badge>
        </div>
        <div className="flex gap-2">
          {!editing && (
            <Button variant="outline" size="sm" onClick={startEdit}>Editar</Button>
          )}
          <Button
            variant={vehicle.status === 'ACTIVE' ? 'danger' : 'secondary'}
            size="sm"
            loading={toggling}
            onClick={toggleStatus}
          >
            {vehicle.status === 'ACTIVE' ? 'Desactivar' : 'Activar'}
          </Button>
        </div>
      </div>

      {error && (
        <Card className="mb-4">
          <div className="text-center py-2 text-red-600 text-sm">{error}</div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Vehicle Info */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <h2 className="text-base font-semibold text-text-primary mb-3">Informacion del vehiculo</h2>
            {editing ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Marca" value={editForm.brand} error={editErrors.brand} onChange={(e) => setEditForm(f => ({ ...f, brand: e.target.value }))} />
                  <Input label="Modelo" value={editForm.model} error={editErrors.model} onChange={(e) => setEditForm(f => ({ ...f, model: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Ano" type="number" value={editForm.year} error={editErrors.year} onChange={(e) => setEditForm(f => ({ ...f, year: e.target.value }))} />
                  <Input label="Color" value={editForm.color} onChange={(e) => setEditForm(f => ({ ...f, color: e.target.value }))} />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="outline" size="sm" onClick={() => setEditing(false)} disabled={saving}>Cancelar</Button>
                  <Button size="sm" loading={saving} onClick={saveEdit}>Guardar</Button>
                </div>
              </div>
            ) : (
              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-4 text-sm">
                <div>
                  <dt className="text-text-secondary text-xs">Placa</dt>
                  <dd className="text-text-primary font-mono font-medium">{vehicle.plate}</dd>
                </div>
                <div>
                  <dt className="text-text-secondary text-xs">Marca</dt>
                  <dd className="text-text-primary">{vehicle.brand}</dd>
                </div>
                <div>
                  <dt className="text-text-secondary text-xs">Modelo</dt>
                  <dd className="text-text-primary">{vehicle.model}</dd>
                </div>
                <div>
                  <dt className="text-text-secondary text-xs">Ano</dt>
                  <dd className="text-text-primary">{vehicle.year}</dd>
                </div>
                <div>
                  <dt className="text-text-secondary text-xs">Color</dt>
                  <dd className="text-text-primary">{vehicle.color || 'No registrado'}</dd>
                </div>
                <div>
                  <dt className="text-text-secondary text-xs">Registrado</dt>
                  <dd className="text-text-primary">{formatDate(vehicle.createdAt)}</dd>
                </div>
              </dl>
            )}
          </Card>

          {/* History */}
          <Card>
            <h2 className="text-base font-semibold text-text-primary mb-3">Historial de servicios</h2>
            {history.length === 0 ? (
              <p className="text-sm text-text-secondary text-center py-6">
                Este vehiculo aun no tiene historial de servicios.
              </p>
            ) : (
              <div className="space-y-2">
                {history.map((h) => (
                  <div key={h.id} className="flex items-center justify-between p-3 rounded-lg border border-surface-border bg-surface-muted/30">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-text-primary truncate">{h.description}</p>
                      <p className="text-xs text-text-secondary">{h.type} &middot; {formatDate(h.date)}</p>
                    </div>
                    <Badge variant={h.status === 'COMPLETED' ? 'success' : h.status === 'PENDING' ? 'info' : 'default'}>
                      {h.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar: Legal Obligations */}
        <div className="space-y-4">
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-text-primary">Documentos legales</h2>
              <Button size="sm" onClick={() => setShowOblModal(true)}>Agregar</Button>
            </div>

            {obligations.length === 0 ? (
              <p className="text-sm text-text-secondary text-center py-4">
                Sin documentos legales registrados. Agrega tu SOAT, RTM o poliza.
              </p>
            ) : (
              <div className="space-y-3">
                {obligations.map((obl) => {
                  const days = daysUntil(obl.expirationDate);
                  const isExpired = days < 0;
                  const isWarning = !isExpired && days <= 30;
                  return (
                    <div key={obl.id} className="p-3 rounded-lg border border-surface-border">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-text-primary">
                          {OBLIGATION_LABELS[obl.type]}
                        </span>
                        <Badge variant={isExpired ? 'danger' : isWarning ? 'warning' : 'success'}>
                          {isExpired ? 'Vencido' : isWarning ? `${days} dias` : 'Vigente'}
                        </Badge>
                      </div>
                      <p className="text-xs text-text-secondary">
                        Vence: {formatDate(obl.expirationDate)}
                      </p>
                      {obl.alerts && obl.alerts.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {obl.alerts.map((a) => (
                            <div key={a.id} className="flex items-center gap-2 text-xs text-text-secondary">
                              <span className={`w-1.5 h-1.5 rounded-full ${a.sent ? 'bg-green-500' : 'bg-gray-300'}`} />
                              Alerta {formatDate(a.alertDate)} {a.sent ? '(enviada)' : '(pendiente)'}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* New Obligation Modal */}
      {showOblModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => !oblSaving && setShowOblModal(false)} />
          <div className="relative bg-white rounded-card border border-surface-border shadow-lg w-full max-w-sm p-6 space-y-4">
            <h2 className="text-lg font-bold text-text-primary">Nuevo documento legal</h2>

            {oblError && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-btn p-2">{oblError}</div>
            )}

            <div className="space-y-1">
              <label className="block text-sm font-medium text-text-primary">Tipo de documento</label>
              <select
                value={oblForm.type}
                onChange={(e) => setOblForm(f => ({ ...f, type: e.target.value as ObligationType }))}
                className="w-full px-3 py-2 min-h-[44px] rounded-btn border border-surface-border text-text-primary text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-orange/50"
              >
                <option value="SOAT">SOAT</option>
                <option value="RTM">Revision tecnico-mecanica</option>
                <option value="INSURANCE">Poliza / Seguro</option>
              </select>
            </div>

            <Input
              label="Fecha de vencimiento"
              type="date"
              value={oblForm.expirationDate}
              onChange={(e) => setOblForm(f => ({ ...f, expirationDate: e.target.value }))}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowOblModal(false)} disabled={oblSaving}>Cancelar</Button>
              <Button size="sm" loading={oblSaving} onClick={createObligation}>Guardar</Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
