import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/layouts';
import { Card, Badge, Button, Input } from '@/components/ui';
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
type ItemType = 'SERVICE' | 'PART';

interface QuotationItem {
  id: string;
  type: ItemType;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface QuotationDetail {
  id: string;
  shortId?: string;
  status: QuotationStatus;
  description: string;
  subtotal: number;
  tax: number;
  total: number;
  rejectionReason?: string;
  clientComment?: string;
  vehicle: { brand: string; model: string; year: number; plate: string };
  items: QuotationItem[];
  createdAt: string;
}

const STATUS_BADGE: Record<QuotationStatus, { label: string; variant: 'default' | 'info' | 'success' | 'danger' }> = {
  DRAFT: { label: 'Borrador', variant: 'default' },
  SENT: { label: 'Enviada', variant: 'info' },
  APPROVED: { label: 'Aprobada', variant: 'success' },
  REJECTED: { label: 'Rechazada', variant: 'danger' },
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
}

interface ItemFormData {
  type: ItemType;
  description: string;
  quantity: string;
  unitPrice: string;
}

const EMPTY_ITEM_FORM: ItemFormData = { type: 'SERVICE', description: '', quantity: '1', unitPrice: '' };

export function WorkshopQuotationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [detail, setDetail] = useState<QuotationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Item form state
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState<ItemFormData>(EMPTY_ITEM_FORM);
  const [itemFormErrors, setItemFormErrors] = useState<Partial<Record<keyof ItemFormData, string>>>({});
  const [itemSubmitting, setItemSubmitting] = useState(false);
  const [itemError, setItemError] = useState('');

  // Action states
  const [sendLoading, setSendLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.get<QuotationDetail>(`/quotations/${id}`);
      setDetail(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar la cotizacion');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  function openAddForm() {
    setEditingItemId(null);
    setItemForm(EMPTY_ITEM_FORM);
    setItemFormErrors({});
    setItemError('');
    setShowItemForm(true);
  }

  function openEditForm(item: QuotationItem) {
    setEditingItemId(item.id);
    setItemForm({
      type: item.type,
      description: item.description,
      quantity: String(item.quantity),
      unitPrice: String(item.unitPrice),
    });
    setItemFormErrors({});
    setItemError('');
    setShowItemForm(true);
  }

  function closeItemForm() {
    setShowItemForm(false);
    setEditingItemId(null);
    setItemForm(EMPTY_ITEM_FORM);
    setItemFormErrors({});
    setItemError('');
  }

  function validateItemForm(): boolean {
    const errors: Partial<Record<keyof ItemFormData, string>> = {};
    if (!itemForm.description.trim()) errors.description = 'La descripcion es requerida';
    const qty = parseInt(itemForm.quantity, 10);
    if (isNaN(qty) || qty < 1) errors.quantity = 'Cantidad minima: 1';
    const price = parseFloat(itemForm.unitPrice);
    if (isNaN(price) || price < 0) errors.unitPrice = 'Precio invalido';
    setItemFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleItemSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !validateItemForm()) return;

    setItemSubmitting(true);
    setItemError('');
    const payload = {
      type: itemForm.type,
      description: itemForm.description.trim(),
      quantity: parseInt(itemForm.quantity, 10),
      unitPrice: parseFloat(itemForm.unitPrice),
    };

    try {
      if (editingItemId) {
        await api.patch(`/quotations/${id}/items/${editingItemId}`, payload);
      } else {
        await api.post(`/quotations/${id}/items`, payload);
      }
      closeItemForm();
      await fetchDetail();
    } catch (err) {
      setItemError(err instanceof Error ? err.message : 'Error al guardar el item');
    } finally {
      setItemSubmitting(false);
    }
  }

  async function handleDeleteItem(itemId: string) {
    if (!id) return;
    setDeletingItemId(itemId);
    setActionError('');
    try {
      await api.delete(`/quotations/${id}/items/${itemId}`);
      await fetchDetail();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Error al eliminar el item');
    } finally {
      setDeletingItemId(null);
    }
  }

  async function handleSend() {
    if (!id) return;
    setSendLoading(true);
    setActionError('');
    try {
      await api.patch(`/quotations/${id}/send`);
      await fetchDetail();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Error al enviar la cotizacion');
    } finally {
      setSendLoading(false);
    }
  }

  const isDraft = detail?.status === 'DRAFT';
  const hasItems = (detail?.items?.length ?? 0) > 0;

  return (
    <DashboardLayout roleName="Admin. Taller" navItems={workshopNav}>
      <div className="mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/workshop/quotations')}>
          &larr; Volver a cotizaciones
        </Button>
      </div>

      {loading && (
        <div className="animate-pulse space-y-3 p-4">
          <div className="h-4 bg-surface-border rounded w-1/3" />
            <div className="h-4 bg-surface-border rounded w-full" />
            <div className="h-4 bg-surface-border rounded w-2/3" />
        </div>
      )}

      {error && (
        <Card>
          <div className="text-center py-8 text-red-600 text-sm">{error}</div>
        </Card>
      )}

      {!loading && !error && detail && (() => {
        const badge = STATUS_BADGE[detail.status];
        return (
          <div className="space-y-4 max-w-4xl">
            {/* Header */}
            <Card>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <h1 className="text-xl font-bold text-text-primary">
                  Cotizacion {detail.shortId || detail.id.slice(0, 8)}
                </h1>
                <Badge variant={badge.variant}>{badge.label}</Badge>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-text-secondary mb-1">Vehiculo</p>
                  <p className="text-sm font-medium text-text-primary">
                    {detail.vehicle.brand} {detail.vehicle.model} {detail.vehicle.year}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-text-secondary mb-1">Placa</p>
                  <p className="text-sm font-medium text-text-primary font-mono">{detail.vehicle.plate}</p>
                </div>
                <div>
                  <p className="text-xs text-text-secondary mb-1">Fecha de creacion</p>
                  <p className="text-sm text-text-primary">{formatDate(detail.createdAt)}</p>
                </div>
                {detail.description && (
                  <div>
                    <p className="text-xs text-text-secondary mb-1">Descripcion</p>
                    <p className="text-sm text-text-primary">{detail.description}</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Client comment */}
            {detail.clientComment && (
              <Card>
                <h2 className="font-semibold text-text-primary mb-2">Comentario del cliente</h2>
                <p className="text-sm text-text-primary whitespace-pre-wrap">{detail.clientComment}</p>
              </Card>
            )}

            {/* Rejection reason */}
            {detail.status === 'REJECTED' && detail.rejectionReason && (
              <Card>
                <h2 className="font-semibold text-red-700 mb-2">Motivo de rechazo</h2>
                <p className="text-sm text-text-primary whitespace-pre-wrap">{detail.rejectionReason}</p>
              </Card>
            )}

            {/* Items table */}
            <Card padding="none">
              <div className="flex items-center justify-between px-4 py-3 sm:px-6">
                <h2 className="font-semibold text-text-primary">Items de la cotizacion</h2>
                {isDraft && (
                  <Button size="sm" onClick={openAddForm} disabled={showItemForm}>
                    Agregar item
                  </Button>
                )}
              </div>

              {actionError && (
                <div className="px-4 sm:px-6 pb-3 text-red-600 text-sm">{actionError}</div>
              )}

              {/* Item form (inline) */}
              {showItemForm && (
                <div className="px-4 sm:px-6 pb-4 border-b border-surface-border">
                  <form onSubmit={handleItemSubmit} className="space-y-3">
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label htmlFor="item-type" className="block text-sm font-medium text-text-primary">Tipo</label>
                        <select
                          id="item-type"
                          value={itemForm.type}
                          onChange={(e) => setItemForm((f) => ({ ...f, type: e.target.value as ItemType }))}
                          className="w-full px-3 py-2 min-h-[44px] rounded-btn border border-surface-border text-text-primary text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-orange/50"
                        >
                          <option value="SERVICE">Servicio</option>
                          <option value="PART">Repuesto</option>
                        </select>
                      </div>
                      <Input
                        label="Descripcion"
                        value={itemForm.description}
                        onChange={(e) => setItemForm((f) => ({ ...f, description: e.target.value }))}
                        placeholder="Descripcion del item"
                        error={itemFormErrors.description}
                      />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <Input
                        label="Cantidad"
                        type="number"
                        min="1"
                        step="1"
                        value={itemForm.quantity}
                        onChange={(e) => setItemForm((f) => ({ ...f, quantity: e.target.value }))}
                        error={itemFormErrors.quantity}
                      />
                      <Input
                        label="Precio unitario"
                        type="number"
                        min="0"
                        step="0.01"
                        value={itemForm.unitPrice}
                        onChange={(e) => setItemForm((f) => ({ ...f, unitPrice: e.target.value }))}
                        error={itemFormErrors.unitPrice}
                      />
                    </div>
                    {itemError && (
                      <div className="text-red-600 text-sm">{itemError}</div>
                    )}
                    <div className="flex items-center gap-2">
                      <Button type="submit" size="sm" loading={itemSubmitting}>
                        {editingItemId ? 'Guardar cambios' : 'Agregar'}
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={closeItemForm}>
                        Cancelar
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              {!hasItems ? (
                <div className="text-center py-8 text-text-secondary text-sm">
                  No hay items en esta cotizacion.{isDraft ? ' Agrega items para construir la cotizacion.' : ''}
                </div>
              ) : (
                <>
                  {/* Desktop items table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-surface-border bg-surface-muted/50">
                          <th className="text-left px-4 py-3 font-medium text-text-secondary">Tipo</th>
                          <th className="text-left px-4 py-3 font-medium text-text-secondary">Descripcion</th>
                          <th className="text-right px-4 py-3 font-medium text-text-secondary">Cant.</th>
                          <th className="text-right px-4 py-3 font-medium text-text-secondary">P. Unitario</th>
                          <th className="text-right px-4 py-3 font-medium text-text-secondary">Total</th>
                          {isDraft && <th className="text-right px-4 py-3 font-medium text-text-secondary">Acciones</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {detail.items.map((item) => (
                          <tr key={item.id} className="border-b border-surface-border last:border-b-0">
                            <td className="px-4 py-3">
                              <Badge variant={item.type === 'SERVICE' ? 'info' : 'warning'}>
                                {item.type === 'SERVICE' ? 'Servicio' : 'Repuesto'}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-text-primary">{item.description}</td>
                            <td className="px-4 py-3 text-right text-text-primary">{item.quantity}</td>
                            <td className="px-4 py-3 text-right text-text-primary">{formatCurrency(item.unitPrice)}</td>
                            <td className="px-4 py-3 text-right text-text-primary font-medium">{formatCurrency(item.total)}</td>
                            {isDraft && (
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button variant="ghost" size="sm" onClick={() => openEditForm(item)}>
                                    Editar
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    loading={deletingItemId === item.id}
                                    onClick={() => handleDeleteItem(item.id)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  >
                                    Eliminar
                                  </Button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile items */}
                  <div className="md:hidden divide-y divide-surface-border">
                    {detail.items.map((item) => (
                      <div key={item.id} className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <Badge variant={item.type === 'SERVICE' ? 'info' : 'warning'}>
                              {item.type === 'SERVICE' ? 'Servicio' : 'Repuesto'}
                            </Badge>
                            <p className="text-sm text-text-primary mt-1">{item.description}</p>
                          </div>
                          <p className="text-sm font-medium text-text-primary whitespace-nowrap">
                            {formatCurrency(item.total)}
                          </p>
                        </div>
                        <div className="flex items-center justify-between text-xs text-text-secondary">
                          <span>{item.quantity} x {formatCurrency(item.unitPrice)}</span>
                          {isDraft && (
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="sm" onClick={() => openEditForm(item)}>
                                Editar
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                loading={deletingItemId === item.id}
                                onClick={() => handleDeleteItem(item.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                Eliminar
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Card>

            {/* Financial summary */}
            <Card>
              <h2 className="font-semibold text-text-primary mb-3">Resumen financiero</h2>
              <div className="space-y-2 max-w-xs ml-auto">
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Subtotal</span>
                  <span className="text-text-primary">{formatCurrency(detail.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">IVA (19%)</span>
                  <span className="text-text-primary">{formatCurrency(detail.tax)}</span>
                </div>
                <div className="border-t border-surface-border pt-2 flex justify-between text-base font-bold">
                  <span className="text-text-primary">Total</span>
                  <span className="text-brand-orange">{formatCurrency(detail.total)}</span>
                </div>
              </div>
            </Card>

            {/* Actions */}
            {isDraft && (
              <Card>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <p className="text-sm text-text-secondary">
                    {hasItems
                      ? 'Cuando la cotizacion este lista, enviala al cliente para su aprobacion.'
                      : 'Agrega al menos un item antes de enviar la cotizacion.'}
                  </p>
                  <Button
                    onClick={handleSend}
                    loading={sendLoading}
                    disabled={!hasItems}
                  >
                    Enviar al cliente
                  </Button>
                </div>
              </Card>
            )}

            {detail.status === 'APPROVED' && (
              <Card>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <Badge variant="success">Aprobada</Badge>
                    <p className="text-sm text-text-secondary mt-2">
                      El cliente aprobo esta cotizacion. Puedes proceder a generar la orden de trabajo.
                    </p>
                  </div>
                  <Button variant="secondary" disabled>
                    Orden de trabajo (proximamente)
                  </Button>
                </div>
              </Card>
            )}
          </div>
        );
      })()}
    </DashboardLayout>
  );
}
