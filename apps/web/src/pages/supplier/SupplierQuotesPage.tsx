import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/layouts';
import { Card, Badge, Button, Input } from '@/components/ui';
import { api } from '@/lib/api';

const supplierNav = [
  { label: 'Panel', href: '/supplier' },
  { label: 'Catalogo', href: '/supplier/products' },
  { label: 'Cotizaciones', href: '/supplier/quotes' },
];

type QuoteStatus = 'PENDING' | 'PARTIALLY_RESPONDED' | 'FULLY_RESPONDED' | 'EXPIRED';
type Availability = 'AVAILABLE' | 'UNAVAILABLE';

interface SupplierQuote {
  id: string;
  requestId: string;
  workshopName: string;
  partDescription: string;
  status: QuoteStatus;
  expiresAt: string;
  createdAt: string;
  response?: {
    price: number;
    availability: Availability;
    notes?: string;
  };
}

interface PaginatedResponse {
  data: SupplierQuote[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface RespondFormData {
  price: string;
  availability: Availability;
  notes: string;
}

const EMPTY_RESPOND: RespondFormData = { price: '', availability: 'AVAILABLE', notes: '' };

const STATUS_BADGE: Record<QuoteStatus, { label: string; variant: 'warning' | 'info' | 'success' | 'default' }> = {
  PENDING: { label: 'Pendiente', variant: 'warning' },
  PARTIALLY_RESPONDED: { label: 'Parcial', variant: 'info' },
  FULLY_RESPONDED: { label: 'Respondida', variant: 'success' },
  EXPIRED: { label: 'Expirada', variant: 'default' },
};

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'PENDING', label: 'Pendientes' },
  { value: 'PARTIALLY_RESPONDED', label: 'Parciales' },
  { value: 'FULLY_RESPONDED', label: 'Respondidas' },
  { value: 'EXPIRED', label: 'Expiradas' },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatPrice(value: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
}

export function SupplierQuotesPage() {
  const [quotes, setQuotes] = useState<SupplierQuote[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Respond modal
  const [respondQuote, setRespondQuote] = useState<SupplierQuote | null>(null);
  const [respondForm, setRespondForm] = useState<RespondFormData>(EMPTY_RESPOND);
  const [respondErrors, setRespondErrors] = useState<Partial<Record<keyof RespondFormData, string>>>({});
  const [responding, setResponding] = useState(false);

  const fetchQuotes = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string> = { page: String(page), limit: '10' };
      if (statusFilter) params.status = statusFilter;

      const res = await api.get<PaginatedResponse>('/supplier-quotes', params);
      setQuotes(res.data);
      setTotalPages(res.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar solicitudes');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  function handleFilterChange(value: string) {
    setStatusFilter(value);
    setPage(1);
  }

  function openRespondModal(quote: SupplierQuote) {
    setRespondQuote(quote);
    setRespondForm(EMPTY_RESPOND);
    setRespondErrors({});
  }

  function closeRespondModal() {
    setRespondQuote(null);
    setRespondForm(EMPTY_RESPOND);
    setRespondErrors({});
  }

  function validateRespond(): boolean {
    const errors: Partial<Record<keyof RespondFormData, string>> = {};
    const price = parseFloat(respondForm.price);
    if (respondForm.availability === 'AVAILABLE' && (isNaN(price) || price <= 0)) {
      errors.price = 'Precio invalido (debe ser > 0)';
    }
    setRespondErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleRespond() {
    if (!respondQuote || !validateRespond()) return;
    setResponding(true);
    setError('');
    try {
      const body: { price?: number; availability: Availability; notes?: string } = {
        availability: respondForm.availability,
      };
      if (respondForm.availability === 'AVAILABLE') {
        body.price = parseFloat(parseFloat(respondForm.price).toFixed(2));
      }
      if (respondForm.notes.trim()) {
        body.notes = respondForm.notes.trim();
      }

      await api.post(`/supplier-quotes/${respondQuote.requestId}/respond`, body);
      closeRespondModal();
      fetchQuotes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al responder solicitud');
    } finally {
      setResponding(false);
    }
  }

  function truncate(text: string, max: number) {
    return text.length > max ? text.slice(0, max) + '...' : text;
  }

  return (
    <DashboardLayout roleName="Admin. Proveedor" navItems={supplierNav}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h1 className="text-xl font-bold text-text-primary">Solicitudes de cotizacion</h1>
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
        ) : quotes.length === 0 ? (
          <div className="text-center py-12 text-text-secondary text-sm">
            No hay solicitudes{statusFilter ? ` con estado "${STATUS_BADGE[statusFilter as QuoteStatus]?.label}"` : ''}.
            Cuando un taller solicite cotizacion, aparecera aqui.
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-border bg-surface-muted/50">
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">Taller</th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">Repuesto</th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">Estado</th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">Fecha</th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">Expira</th>
                    <th className="text-right px-4 py-3 font-medium text-text-secondary">Accion</th>
                  </tr>
                </thead>
                <tbody>
                  {quotes.map((q) => {
                    const badge = STATUS_BADGE[q.status];
                    return (
                      <tr key={q.id} className="border-b border-surface-border last:border-b-0 hover:bg-surface-muted/30 transition-colors">
                        <td className="px-4 py-3 text-text-primary font-medium">{q.workshopName}</td>
                        <td className="px-4 py-3 text-text-secondary">{truncate(q.partDescription, 50)}</td>
                        <td className="px-4 py-3"><Badge variant={badge.variant}>{badge.label}</Badge></td>
                        <td className="px-4 py-3 text-text-secondary text-xs">{formatDate(q.createdAt)}</td>
                        <td className="px-4 py-3 text-text-secondary text-xs">{formatDate(q.expiresAt)}</td>
                        <td className="px-4 py-3 text-right">
                          {q.status === 'PENDING' ? (
                            <Button size="sm" onClick={() => openRespondModal(q)}>Responder</Button>
                          ) : q.response ? (
                            <span className="text-xs text-text-secondary">
                              {q.response.availability === 'AVAILABLE'
                                ? formatPrice(q.response.price)
                                : 'No disponible'}
                            </span>
                          ) : (
                            <span className="text-xs text-text-secondary">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-surface-border">
              {quotes.map((q) => {
                const badge = STATUS_BADGE[q.status];
                return (
                  <div key={q.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-text-primary">{q.workshopName}</p>
                        <p className="text-xs text-text-secondary">{truncate(q.partDescription, 60)}</p>
                      </div>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-text-secondary">
                      <span>{formatDate(q.createdAt)}</span>
                      <span>Expira: {formatDate(q.expiresAt)}</span>
                    </div>
                    {q.status === 'PENDING' ? (
                      <Button size="sm" onClick={() => openRespondModal(q)} className="w-full">Responder</Button>
                    ) : q.response ? (
                      <div className="text-sm text-text-secondary">
                        Respuesta: {q.response.availability === 'AVAILABLE'
                          ? formatPrice(q.response.price)
                          : 'No disponible'}
                        {q.response.notes && <p className="text-xs mt-1">Nota: {q.response.notes}</p>}
                      </div>
                    ) : null}
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

      {/* Respond modal */}
      {respondQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => !responding && closeRespondModal()} />
          <div className="relative bg-white rounded-card border border-surface-border shadow-lg w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold text-text-primary">Responder cotizacion</h2>
            <div className="text-sm text-text-secondary space-y-1">
              <p><span className="font-medium text-text-primary">Taller:</span> {respondQuote.workshopName}</p>
              <p><span className="font-medium text-text-primary">Repuesto:</span> {respondQuote.partDescription}</p>
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-text-primary">Disponibilidad</label>
              <select
                value={respondForm.availability}
                onChange={(e) => setRespondForm((prev) => ({ ...prev, availability: e.target.value as Availability }))}
                className="w-full px-3 py-2 min-h-[44px] rounded-btn border border-surface-border text-text-primary text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-orange/50"
              >
                <option value="AVAILABLE">Disponible</option>
                <option value="UNAVAILABLE">No disponible</option>
              </select>
            </div>
            {respondForm.availability === 'AVAILABLE' && (
              <Input
                label="Precio"
                type="number"
                step="0.01"
                min="0"
                value={respondForm.price}
                error={respondErrors.price}
                onChange={(e) => {
                  setRespondForm((prev) => ({ ...prev, price: e.target.value }));
                  if (respondErrors.price) setRespondErrors((prev) => ({ ...prev, price: undefined }));
                }}
              />
            )}
            <div className="space-y-1">
              <label className="block text-sm font-medium text-text-primary">Notas (opcional)</label>
              <textarea
                value={respondForm.notes}
                onChange={(e) => setRespondForm((prev) => ({ ...prev, notes: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 rounded-btn border border-surface-border text-text-primary placeholder:text-text-secondary/50 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/50 focus:border-brand-orange resize-none"
                placeholder="Tiempo de entrega, condiciones, etc."
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={closeRespondModal} disabled={responding}>Cancelar</Button>
              <Button size="sm" loading={responding} onClick={handleRespond}>Enviar respuesta</Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
