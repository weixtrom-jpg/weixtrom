import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateVehicleDto } from './create-vehicle.dto';

function createDto(overrides: Partial<CreateVehicleDto> = {}): CreateVehicleDto {
  return plainToInstance(CreateVehicleDto, {
    plate: 'ABC123',
    brand: 'Chevrolet',
    model: 'Spark',
    year: 2020,
    color: 'Rojo',
    ...overrides,
  });
}

describe('CreateVehicleDto — Validación de placa colombiana', () => {
  it('ABC123 (auto) es válida', async () => {
    const dto = createDto({ plate: 'ABC123' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('ABC12D (moto) es válida', async () => {
    const dto = createDto({ plate: 'ABC12D' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('XYZ99A (moto) es válida', async () => {
    const dto = createDto({ plate: 'XYZ99A' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('abc123 se transforma a mayúscula y es válida', async () => {
    const dto = createDto({ plate: 'abc123' });
    expect(dto.plate).toBe('ABC123');
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('ABC-123 se limpia (quita guión) y es válida', async () => {
    const dto = createDto({ plate: 'ABC-123' });
    expect(dto.plate).toBe('ABC123');
  });

  it('12AB34 (no empieza con 3 letras) es inválida', async () => {
    const dto = createDto({ plate: '12AB34' });
    const errors = await validate(dto);
    const plateErrors = errors.filter((e) => e.property === 'plate');
    expect(plateErrors.length).toBeGreaterThan(0);
  });

  it('ABCDEFG (7 chars) es inválida', async () => {
    const dto = createDto({ plate: 'ABCDEFG' });
    const errors = await validate(dto);
    const plateErrors = errors.filter((e) => e.property === 'plate');
    expect(plateErrors.length).toBeGreaterThan(0);
  });

  it('placa vacía es inválida', async () => {
    const dto = createDto({ plate: '' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('ABC1234 (7 chars sin guión) es inválida', async () => {
    const dto = createDto({ plate: 'ABC1234' });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('AB123 (5 chars) no cumple el regex', async () => {
    const dto = createDto({ plate: 'AB123' });
    const errors = await validate(dto);
    const plateErrors = errors.filter((e) => e.property === 'plate');
    expect(plateErrors.length).toBeGreaterThan(0);
  });
});
