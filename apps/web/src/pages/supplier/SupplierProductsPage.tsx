import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/layouts';
import { Card, Badge, Button, Input } from '@/components/ui';
import { api } from '@/lib/api';

const supplierNav = [
  { label: 'Panel', href: '/supplier' },
  { label: 'Catalogo', href: '/supplier/products' },
  { label: 'Cotizaciones', href: '/supplier/quotes' },
];

type ProductStatus = 'ACTIVE' | 'OUT_OF_STOCK' | 'INACTIVE';

interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  stock: number;
  status: ProductStatus;
  createdAt: string;
}

interface PaginatedResponse {
  data: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface ProductFormData {
  name: string;
  description: string;
  category: string;
  price: string;
  stock: string;
}

const EMPTY_FORM: ProductFormData = { name: '', description: '', category: '', price: '', stock: '' };

const STATUS_BADGE: Record<ProductStatus, { label: string; variant: 'success' | 'default' | 'danger' }> = {
  ACTIVE: { label: 'Activo', variant: 'success' },
  OUT_OF_STOCK: { label: 'Sin stock', variant: 'default' },
  INACTIVE: { label: 'Inactivo', variant: 'danger' },
};

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'ACTIVE', label: 'Activos' },
  { value: 'OUT_OF_STOCK', label: 'Sin stock' },
  { value: 'INACTIVE', label: 'Inactivos' },
];

function formatPrice(value: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
}

export function SupplierProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductFormData>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof ProductFormData, string>>>({});
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string> = { page: String(page), limit: '10' };
      if (statusFilter) params.status = statusFilter;
      if (appliedSearch.trim()) params.search = appliedSearch.trim();

      const res = await api.get<PaginatedResponse>('/products', params);
      setProducts(res.data);
      setTotalPages(res.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar productos');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, appliedSearch]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  function handleFilterChange(value: string) {
    setStatusFilter(value);
    setPage(1);
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAppliedSearch(search);
    setPage(1);
  }

  function openCreateModal() {
    setEditingProduct(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setShowModal(true);
  }

  function openEditModal(product: Product) {
    setEditingProduct(product);
    setForm({
      name: product.name,
      description: product.description,
      category: product.category,
      price: String(product.price),
      stock: String(product.stock),
    });
    setFormErrors({});
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingProduct(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
  }

  function validateForm(): boolean {
    const errors: Partial<Record<keyof ProductFormData, string>> = {};
    if (!form.name.trim()) errors.name = 'El nombre es obligatorio';
    if (!form.category.trim()) errors.category = 'La categoria es obligatoria';
    const price = parseFloat(form.price);
    if (isNaN(price) || price < 0) errors.price = 'Precio invalido (debe ser >= 0)';
    const stock = parseInt(form.stock, 10);
    if (isNaN(stock) || stock < 0) errors.stock = 'Stock invalido (debe ser entero >= 0)';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSave() {
    if (!validateForm()) return;
    setSaving(true);
    setError('');
    try {
      const body = {
        name: form.name.trim(),
        description: form.description.trim(),
        category: form.category.trim(),
        price: parseFloat(parseFloat(form.price).toFixed(2)),
        stock: parseInt(form.stock, 10),
      };

      if (editingProduct) {
        await api.patch(`/products/${editingProduct.id}`, body);
      } else {
        await api.post('/products', body);
      }
      closeModal();
      fetchProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar producto');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    setError('');
    try {
      await api.delete(`/products/${deleteId}`);
      setDeleteId(null);
      fetchProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar producto');
    } finally {
      setDeleting(false);
    }
  }

  function updateField(field: keyof ProductFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  return (
    <DashboardLayout roleName="Admin. Proveedor" navItems={supplierNav}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h1 className="text-xl font-bold text-text-primary">Catalogo de productos</h1>
        <Button size="sm" onClick={openCreateModal}>Nuevo producto</Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <form onSubmit={handleSearchSubmit} className="flex gap-2 flex-1">
          <Input
            placeholder="Buscar por nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1"
          />
          <Button variant="outline" size="sm" type="submit">Buscar</Button>
        </form>
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
        ) : products.length === 0 ? (
          <div className="text-center py-12 text-text-secondary text-sm">
            No hay productos{statusFilter ? ` con estado "${STATUS_BADGE[statusFilter as ProductStatus]?.label}"` : ''}
            {search ? ` que coincidan con "${search}"` : ''}. Agrega tu primer producto con el boton "Nuevo producto".
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-border bg-surface-muted/50">
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">Nombre</th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">Categoria</th>
                    <th className="text-right px-4 py-3 font-medium text-text-secondary">Precio</th>
                    <th className="text-right px-4 py-3 font-medium text-text-secondary">Stock</th>
                    <th className="text-left px-4 py-3 font-medium text-text-secondary">Estado</th>
                    <th className="text-right px-4 py-3 font-medium text-text-secondary">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => {
                    const badge = STATUS_BADGE[p.status];
                    return (
                      <tr key={p.id} className="border-b border-surface-border last:border-b-0 hover:bg-surface-muted/30 transition-colors">
                        <td className="px-4 py-3 text-text-primary font-medium">{p.name}</td>
                        <td className="px-4 py-3 text-text-secondary">{p.category}</td>
                        <td className="px-4 py-3 text-text-primary text-right font-mono text-xs">{formatPrice(p.price)}</td>
                        <td className="px-4 py-3 text-text-primary text-right">{p.stock}</td>
                        <td className="px-4 py-3"><Badge variant={badge.variant}>{badge.label}</Badge></td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => openEditModal(p)}>Editar</Button>
                            <Button variant="danger" size="sm" onClick={() => setDeleteId(p.id)}>Eliminar</Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-surface-border">
              {products.map((p) => {
                const badge = STATUS_BADGE[p.status];
                return (
                  <div key={p.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-text-primary">{p.name}</p>
                        <p className="text-xs text-text-secondary">{p.category}</p>
                      </div>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-text-primary font-mono">{formatPrice(p.price)}</span>
                      <span className="text-text-secondary">Stock: {p.stock}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEditModal(p)}>Editar</Button>
                      <Button variant="danger" size="sm" onClick={() => setDeleteId(p.id)}>Eliminar</Button>
                    </div>
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

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={closeModal} />
          <div className="relative bg-white rounded-card border border-surface-border shadow-lg w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold text-text-primary">
              {editingProduct ? 'Editar producto' : 'Nuevo producto'}
            </h2>
            <Input label="Nombre" value={form.name} error={formErrors.name} onChange={(e) => updateField('name', e.target.value)} />
            <div className="space-y-1">
              <label className="block text-sm font-medium text-text-primary">Descripcion</label>
              <textarea
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-btn border border-surface-border text-text-primary placeholder:text-text-secondary/50 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/50 focus:border-brand-orange resize-none"
              />
            </div>
            <Input label="Categoria" value={form.category} error={formErrors.category} onChange={(e) => updateField('category', e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Precio" type="number" step="0.01" min="0" value={form.price} error={formErrors.price} onChange={(e) => updateField('price', e.target.value)} />
              <Input label="Stock" type="number" step="1" min="0" value={form.stock} error={formErrors.stock} onChange={(e) => updateField('stock', e.target.value)} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={closeModal} disabled={saving}>Cancelar</Button>
              <Button size="sm" loading={saving} onClick={handleSave}>{editingProduct ? 'Guardar' : 'Crear'}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => !deleting && setDeleteId(null)} />
          <div className="relative bg-white rounded-card border border-surface-border shadow-lg w-full max-w-sm p-6 space-y-4">
            <h2 className="text-lg font-bold text-text-primary">Eliminar producto</h2>
            <p className="text-sm text-text-secondary">Este producto se marcara como inactivo. Esta accion se puede revertir desde el backend.</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setDeleteId(null)} disabled={deleting}>Cancelar</Button>
              <Button variant="danger" size="sm" loading={deleting} onClick={handleDelete}>Eliminar</Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
