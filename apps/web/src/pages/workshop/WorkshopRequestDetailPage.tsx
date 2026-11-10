import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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

type DiagnosticStatus = 'PENDING' | 'TAKEN' | 'DIAGNOSED' | 'EXPIRED';

interface DiagnosticDetail {
  id: string;
  description: string;
  status: DiagnosticStatus;
  vehicle: { brand: string; model: string; year: number; plate: string };
  createdAt: string;
  diagnosis?: { findings: string; recommendation: string };
}

const STATUS_BADGE: Record<DiagnosticStatus, { label: string; variant: 'info' | 'warning' | 'success' | 'default' }> = {
  PENDING: { label: 'Pendiente', variant: 'info' },
  TAKEN: { label: 'Tomada', variant: 'warning' },
  DIAGNOSED: { label: 'Diagnosticada', variant: 'success' },
  EXPIRED: { label: 'Expirada', variant: 'default' },
};

export function WorkshopRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [detail, setDetail] = useState<DiagnosticDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  const [findings, setFindings] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const [formErrors, setFormErrors] = useState<{ findings?: string; recommendation?: string }>({});

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.get<DiagnosticDetail>(`/diagnostics/${id}`);
      setDetail(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar la solicitud');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  async function handleTake() {
    if (!id) return;
    setActionLoading(true);
    setActionError('');
    try {
      await api.patch(`/diagnostics/${id}/take`);
      await fetchDetail();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al tomar la solicitud';
      setActionError(message);
    } finally {
      setActionLoading(false);
    }
  }

  function validateDiagnosis(): boolean {
    const errors: { findings?: string; recommendation?: string } = {};
    if (!findings.trim()) errors.findings = 'Los hallazgos son requeridos';
    if (!recommendation.trim()) errors.recommendation = 'La recomendacion es requerida';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleDiagnose(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !validateDiagnosis()) return;

    setActionLoading(true);
    setActionError('');
    try {
      await api.patch(`/diagnostics/${id}/diagnose`, {
        findings: findings.trim(),
        recommendation: recommendation.trim(),
      });
      await fetchDetail();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Error al registrar diagnostico');
    } finally {
      setActionLoading(false);
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  return (
    <DashboardLayout roleName="Admin. Taller" navItems={workshopNav}>
      <div className="mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/workshop/requests')}>
          &larr; Volver a solicitudes
        </Button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin h-6 w-6 border-4 border-brand-orange border-t-transparent rounded-full" />
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
          <div className="space-y-4 max-w-3xl">
            {/* Vehicle + status header */}
            <Card>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <h1 className="text-xl font-bold text-text-primary">Solicitud de diagnostico</h1>
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
                <div className="sm:col-span-2">
                  <p className="text-xs text-text-secondary mb-1">Descripcion del problema</p>
                  <p className="text-sm text-text-primary">{detail.description}</p>
                </div>
                <div>
                  <p className="text-xs text-text-secondary mb-1">Fecha de solicitud</p>
                  <p className="text-sm text-text-primary">{formatDate(detail.createdAt)}</p>
                </div>
              </div>
            </Card>

            {actionError && (
              <Card>
                <div className="text-center py-3 text-red-600 text-sm">{actionError}</div>
              </Card>
            )}

            {/* PENDING: Take button */}
            {detail.status === 'PENDING' && (
              <Card>
                <h2 className="font-semibold text-text-primary mb-3">Tomar solicitud</h2>
                <p className="text-sm text-text-secondary mb-4">
                  Al tomar esta solicitud, se asignara a tu taller para diagnostico.
                </p>
                <Button onClick={handleTake} loading={actionLoading}>
                  Tomar solicitud
                </Button>
              </Card>
            )}

            {/* TAKEN: Diagnosis form */}
            {detail.status === 'TAKEN' && (
              <Card>
                <h2 className="font-semibold text-text-primary mb-3">Registrar diagnostico</h2>
                <form onSubmit={handleDiagnose} className="space-y-4">
                  <div className="space-y-1">
                    <label htmlFor="findings" className="block text-sm font-medium text-text-primary">
                      Hallazgos
                    </label>
                    <textarea
                      id="findings"
                      value={findings}
                      onChange={(e) => setFindings(e.target.value)}
                      rows={4}
                      maxLength={5000}
                      className={`
                        w-full px-3 py-2 rounded-btn border text-text-primary text-sm
                        placeholder:text-text-secondary/50
                        focus:outline-none focus:ring-2 focus:ring-brand-orange/50 focus:border-brand-orange
                        transition-colors duration-200
                        ${formErrors.findings ? 'border-red-500' : 'border-surface-border'}
                      `}
                      placeholder="Describe los hallazgos del diagnostico..."
                    />
                    <div className="flex justify-between">
                      {formErrors.findings ? <p className="text-sm text-red-600">{formErrors.findings}</p> : <span />}
                      <span className="text-xs text-text-secondary">{findings.length}/5000</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="recommendation" className="block text-sm font-medium text-text-primary">
                      Recomendacion
                    </label>
                    <textarea
                      id="recommendation"
                      value={recommendation}
                      onChange={(e) => setRecommendation(e.target.value)}
                      rows={4}
                      maxLength={2000}
                      className={`
                        w-full px-3 py-2 rounded-btn border text-text-primary text-sm
                        placeholder:text-text-secondary/50
                        focus:outline-none focus:ring-2 focus:ring-brand-orange/50 focus:border-brand-orange
                        transition-colors duration-200
                        ${formErrors.recommendation ? 'border-red-500' : 'border-surface-border'}
                      `}
                      placeholder="Que recomiendas para el vehiculo..."
                    />
                    <div className="flex justify-between">
                      {formErrors.recommendation ? <p className="text-sm text-red-600">{formErrors.recommendation}</p> : <span />}
                      <span className="text-xs text-text-secondary">{recommendation.length}/2000</span>
                    </div>
                  </div>

                  <Button type="submit" loading={actionLoading}>
                    Registrar diagnostico
                  </Button>
                </form>
              </Card>
            )}

            {/* DIAGNOSED: Show results */}
            {detail.status === 'DIAGNOSED' && detail.diagnosis && (
              <Card>
                <h2 className="font-semibold text-text-primary mb-3">Diagnostico registrado</h2>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-text-secondary mb-1">Hallazgos</p>
                    <p className="text-sm text-text-primary whitespace-pre-wrap">{detail.diagnosis.findings}</p>
                  </div>
                  <div>
                    <p className="text-xs text-text-secondary mb-1">Recomendacion</p>
                    <p className="text-sm text-text-primary whitespace-pre-wrap">{detail.diagnosis.recommendation}</p>
                  </div>
                </div>
              </Card>
            )}

            {/* EXPIRED */}
            {detail.status === 'EXPIRED' && (
              <Card>
                <div className="text-center py-4 text-text-secondary text-sm">
                  Esta solicitud ha expirado y ya no puede ser atendida.
                </div>
              </Card>
            )}
          </div>
        );
      })()}
    </DashboardLayout>
  );
}
