import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/layouts';
import { Card, Button, Input } from '@/components/ui';
import { api } from '@/lib/api';

const workshopNav = [
  { label: 'Panel', href: '/workshop' },
  { label: 'Solicitudes', href: '/workshop/requests' },
  { label: 'Cotizaciones', href: '/workshop/quotations' },
  { label: 'Ordenes', href: '/workshop/orders' },
  { label: 'Facturas', href: '/workshop/invoices' },
  { label: 'Tecnicos', href: '/workshop/technicians' },
];

interface DiagnosticOption {
  id: string;
  description: string;
  vehicle: { id: string; brand: string; model: string; year: number; plate: string };
}

interface DiagnosticListResponse {
  data: DiagnosticOption[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface CreatedQuotation {
  id: string;
}

export function WorkshopQuotationNewPage() {
  const navigate = useNavigate();

  const [diagnostics, setDiagnostics] = useState<DiagnosticOption[]>([]);
  const [loadingDiagnostics, setLoadingDiagnostics] = useState(true);
  const [fetchError, setFetchError] = useState('');

  const [selectedDiagnosticId, setSelectedDiagnosticId] = useState('');
  const [description, setDescription] = useState('');
  const [formErrors, setFormErrors] = useState<{ diagnostic?: string; description?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    async function loadDiagnostics() {
      setLoadingDiagnostics(true);
      setFetchError('');
      try {
        const res = await api.get<DiagnosticListResponse>('/diagnostics', { status: 'DIAGNOSED', limit: '100' });
        setDiagnostics(res.data);
      } catch (err) {
        setFetchError(err instanceof Error ? err.message : 'Error al cargar diagnosticos');
      } finally {
        setLoadingDiagnostics(false);
      }
    }
    loadDiagnostics();
  }, []);

  function validate(): boolean {
    const errors: { diagnostic?: string; description?: string } = {};
    if (!selectedDiagnosticId) errors.diagnostic = 'Selecciona un diagnostico';
    if (!description.trim()) errors.description = 'La descripcion es requerida';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const selected = diagnostics.find((d) => d.id === selectedDiagnosticId);
    if (!selected) return;

    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await api.post<CreatedQuotation>('/quotations', {
        diagnosticRequestId: selected.id,
      });
      navigate(`/workshop/quotations/${res.id}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Error al crear la cotizacion');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DashboardLayout roleName="Admin. Taller" navItems={workshopNav}>
      <div className="mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/workshop/quotations')}>
          &larr; Volver a cotizaciones
        </Button>
      </div>

      <div className="max-w-2xl">
        <Card>
          <h1 className="text-xl font-bold text-text-primary mb-6">Nueva cotizacion</h1>

          {fetchError && (
            <div className="mb-4 text-center py-3 text-red-600 text-sm">{fetchError}</div>
          )}

          {loadingDiagnostics ? (
            <div className="animate-pulse space-y-3 p-4">
              <div className="h-4 bg-surface-border rounded w-1/3" />
            <div className="h-4 bg-surface-border rounded w-full" />
            <div className="h-4 bg-surface-border rounded w-2/3" />
            </div>
          ) : diagnostics.length === 0 && !fetchError ? (
            <div className="text-center py-8 text-text-secondary text-sm">
              No hay diagnosticos disponibles para cotizar. Primero debe existir una solicitud diagnosticada.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label htmlFor="diagnostic-select" className="block text-sm font-medium text-text-primary">
                  Diagnostico / Vehiculo
                </label>
                <select
                  id="diagnostic-select"
                  value={selectedDiagnosticId}
                  onChange={(e) => {
                    setSelectedDiagnosticId(e.target.value);
                    if (formErrors.diagnostic) setFormErrors((prev) => ({ ...prev, diagnostic: undefined }));
                  }}
                  className={`
                    w-full px-3 py-2 min-h-[44px] rounded-btn border text-text-primary text-sm bg-white
                    focus:outline-none focus:ring-2 focus:ring-brand-orange/50 focus:border-brand-orange
                    transition-colors duration-200
                    ${formErrors.diagnostic ? 'border-red-500' : 'border-surface-border'}
                  `}
                >
                  <option value="">Selecciona un diagnostico...</option>
                  {diagnostics.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.vehicle.plate} - {d.vehicle.brand} {d.vehicle.model} {d.vehicle.year}
                    </option>
                  ))}
                </select>
                {formErrors.diagnostic && (
                  <p className="text-sm text-red-600">{formErrors.diagnostic}</p>
                )}
              </div>

              <div className="space-y-1">
                <Input
                  label="Descripcion / Notas"
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    if (formErrors.description) setFormErrors((prev) => ({ ...prev, description: undefined }));
                  }}
                  placeholder="Describe brevemente la cotizacion..."
                  error={formErrors.description}
                />
              </div>

              {submitError && (
                <div className="text-center py-2 text-red-600 text-sm">{submitError}</div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <Button type="submit" loading={submitting}>
                  Crear cotizacion
                </Button>
                <Button variant="outline" type="button" onClick={() => navigate('/workshop/quotations')}>
                  Cancelar
                </Button>
              </div>
            </form>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
