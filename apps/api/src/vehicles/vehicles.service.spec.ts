import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { VehiclesService } from './vehicles.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { createMockPrismaService } from '../test/prisma.mock';

describe('VehiclesService', () => {
  let service: VehiclesService;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let audit: Record<string, jest.Mock>;

  beforeEach(async () => {
    prisma = createMockPrismaService();
    audit = { log: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehiclesService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get<VehiclesService>(VehiclesService);
  });

  describe('create', () => {
    const userId = 'user-1';
    const dto = { plate: 'ABC123', brand: 'Toyota', model: 'Corolla', year: 2022, color: 'Blanco' };

    it('debe crear un vehículo nuevo', async () => {
      prisma.vehicle.findUnique.mockResolvedValue(null);
      prisma.vehicle.create.mockResolvedValue({ id: 'v-1', ...dto, ownerId: userId });

      const result = await service.create(userId, dto);

      expect(result.id).toBe('v-1');
      expect(result.plate).toBe('ABC123');
      expect(prisma.vehicle.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ plate: 'ABC123', ownerId: userId }),
        }),
      );
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CREATE_VEHICLE' }),
      );
    });

    it('debe rechazar placa duplicada del mismo usuario', async () => {
      prisma.vehicle.findUnique.mockResolvedValue({ id: 'existing', plate: 'ABC123' });

      await expect(service.create(userId, dto)).rejects.toThrow(ConflictException);
      expect(prisma.vehicle.create).not.toHaveBeenCalled();
    });

    it('debe manejar error P2002 de Prisma como conflicto', async () => {
      prisma.vehicle.findUnique.mockResolvedValue(null);
      const prismaError = new Prisma.PrismaClientKnownRequestError('Unique constraint', {
        code: 'P2002',
        clientVersion: '6.0.0',
      });
      prisma.vehicle.create.mockRejectedValue(prismaError);

      await expect(service.create(userId, dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('debe listar vehículos activos por defecto', async () => {
      prisma.vehicle.findMany.mockResolvedValue([]);
      prisma.vehicle.count.mockResolvedValue(0);

      const result = await service.findAll('user-1', {});

      expect(prisma.vehicle.findMany).toHaveBeenCalled();
      const findCall = prisma.vehicle.findMany.mock.calls[0][0];
      expect(findCall.where.ownerId).toBe('user-1');
    });
  });

  describe('findOne', () => {
    it('debe lanzar NotFoundException si el vehículo no existe', async () => {
      prisma.vehicle.findUnique.mockResolvedValue(null);

      await expect(service.findOne('user-1', 'v-nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('debe lanzar ForbiddenException si el vehículo no es del usuario', async () => {
      prisma.vehicle.findUnique.mockResolvedValue({ id: 'v-1', ownerId: 'other-user' });

      await expect(service.findOne('user-1', 'v-1')).rejects.toThrow(ForbiddenException);
    });

    it('debe devolver el vehículo si pertenece al usuario', async () => {
      const vehicle = { id: 'v-1', plate: 'ABC123', ownerId: 'user-1' };
      prisma.vehicle.findUnique.mockResolvedValue(vehicle);

      const result = await service.findOne('user-1', 'v-1');

      expect(result.plate).toBe('ABC123');
    });
  });
});
