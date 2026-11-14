import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/layouts';
import { Card, Button, Input } from '@/components/ui';
import { api } from '@/lib/api';

const clientNav = [
  { label: 'Inicio', href: '/client' },
  { label: 'Vehiculos', href: '/client/vehicles' },
  { label: 'Servicios', href: '/client/services' },
  { label: 'Facturas', href: '/client/invoices' },
  { label: 'Mi perfil', href: '/client/profile' },
];

const PLATE_REGEX = /^[A-Z]{3}\d{2}[A-Z0-9]$/i;
const CURRENT_YEAR = new Date().getFullYear();

interface FormData {
  plate: string;
  brand: string;
  model: string;
  year: string;
  color: string;
}

const EMPTY_FORM: FormData = { plate: '', brand: '', model: '', year: '', color: '' };

export function ClientVehicleNewPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState('');

  function updateField(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate(): boolean {
    const errors: Partial<Record<keyof FormData, string>> = {};

    if (!form.plate.trim()) {
      errors.plate = 'La placa es obligatoria';
    } else if (!PLATE_REGEX.test(form.plate.trim())) {
      errors.plate = 'Formato invalido. Ejemplo: ABC123 o ABC12D';
    }

    if (!form.brand.trim()) errors.brand = 'La marca es obligatoria';
    if (!form.model.trim()) errors.model = 'El modelo es obligatorio';

    const yearNum = parseInt(form.year, 10);
    if (!form.year.trim()) {
      errors.year = 'El ano es obligatorio';
    } else if (isNaN(yearNum) || yearNum < 1980 || yearNum > CURRENT_YEAR + 1) {
      errors.year = `Debe ser entre 1980 y ${CURRENT_YEAR + 1}`;
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    setApiError('');
    try {
      await api.post('/vehicles', {
        plate: form.plate.trim().toUpperCase(),
        brand: form.brand.trim(),
        model: form.model.trim(),
        year: parseInt(form.year, 10),
        color: form.color.trim() || undefined,
      });
      navigate('/client/vehicles');
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Error al registrar el vehiculo');
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardLayout roleName="Cliente" navItems={clientNav}>
      <h1 className="text-xl font-bold text-text-primary mb-4">Registrar vehiculo</h1>

      <Card className="max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          {apiError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-btn p-3">
              {apiError}
            </div>
          )}

          <Input
            label="Placa"
            placeholder="ABC123"
            value={form.plate}
            error={formErrors.plate}
            onChange={(e) => updateField('plate', e.target.value)}
            maxLength={6}
          />

          <Input
            label="Marca"
            placeholder="Chevrolet, Renault, Toyota..."
            value={form.brand}
            error={formErrors.brand}
            onChange={(e) => updateField('brand', e.target.value)}
          />

          <Input
            label="Modelo"
            placeholder="Spark, Logan, Corolla..."
            value={form.model}
            error={formErrors.model}
            onChange={(e) => updateField('model', e.target.value)}
          />

          <Input
            label="Ano"
            type="number"
            placeholder={String(CURRENT_YEAR)}
            min={1980}
            max={CURRENT_YEAR + 1}
            value={form.year}
            error={formErrors.year}
            onChange={(e) => updateField('year', e.target.value)}
          />

          <Input
            label="Color"
            placeholder="Blanco, Negro, Rojo..."
            value={form.color}
            onChange={(e) => updateField('color', e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => navigate('/client/vehicles')}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button size="sm" type="submit" loading={saving}>
              Registrar
            </Button>
          </div>
        </form>
      </Card>
    </DashboardLayout>
  );
}
