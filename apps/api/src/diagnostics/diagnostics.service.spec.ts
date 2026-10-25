import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { DiagnosticRequestStatus, Role } from '@prisma/client';
import { DiagnosticsService } from './diagnostics.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { createMockPrismaService } from '../test/prisma.mock';

describe('DiagnosticsService', () => {
  let service: DiagnosticsService;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let audit: Record<string, jest.Mock>;

  beforeEach(async () => {
    prisma = createMockPrismaService();
    audit = { log: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiagnosticsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get<DiagnosticsService>(DiagnosticsService);
  });

  // ─── create ────────────

  describe('create', () => {
    const clientId = 'client-1';
    const dto = { vehicleId: 'v-1', description: 'El motor hace ruido al acelerar' };

    it('debe crear una solicitud de diagnóstico cuando el vehículo pertenece al cliente', async () => {
      prisma.vehicle.findUnique.mockResolvedValue({ id: 'v-1', ownerId: clientId });
      const created = {
        id: 'dr-1',
        ...dto,
        clientId,
        status: DiagnosticRequestStatus.PENDING,
        vehicle: { id: 'v-1' },
      };
      prisma.diagnosticRequest.create.mockResolvedValue(created);

      const result = await service.create(clientId, dto);

      expect(result.id).toBe('dr-1');
      expect(result.status).toBe(DiagnosticRequestStatus.PENDING);
      expect(prisma.diagnosticRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            vehicleId: 'v-1',
            clientId,
            status: DiagnosticRequestStatus.PENDING,
          }),
        }),
      );
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CREATE_DIAGNOSTIC_REQUEST' }),
      );
    });

    it('debe lanzar NotFoundException si el vehículo no existe', async () => {
      prisma.vehicle.findUnique.mockResolvedValue(null);

      await expect(service.create(clientId, dto)).rejects.toThrow(NotFoundException);
      expect(prisma.diagnosticRequest.create).not.toHaveBeenCalled();
    });

    it('debe lanzar ForbiddenException si el vehículo no pertenece al cliente', async () => {
      prisma.vehicle.findUnique.mockResolvedValue({ id: 'v-1', ownerId: 'otro-usuario' });

      await expect(service.create(clientId, dto)).rejects.toThrow(ForbiddenException);
      expect(prisma.diagnosticRequest.create).not.toHaveBeenCalled();
    });
  });

  // ─── take ────────────

  describe('take', () => {
    const workshopAdminId = 'wa-1';
    const requestId = 'dr-1';

    it('debe permitir que un taller tome una solicitud PENDING', async () => {
      prisma.workshop.findUnique.mockResolvedValue({ id: 'ws-1', adminId: workshopAdminId });
      prisma.diagnosticRequest.updateMany.mockResolvedValue({ count: 1 });
      const updated = {
        id: requestId,
        status: DiagnosticRequestStatus.TAKEN,
        workshopId: 'ws-1',
        vehicle: { id: 'v-1' },
        workshop: { id: 'ws-1' },
      };
      prisma.diagnosticRequest.findUnique.mockResolvedValue(updated);

      const result = await service.take(requestId, workshopAdminId);

      expect(result!.status).toBe(DiagnosticRequestStatus.TAKEN);
      expect(result!.workshopId).toBe('ws-1');
      expect(prisma.diagnosticRequest.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: requestId,
            status: DiagnosticRequestStatus.PENDING,
            workshopId: null,
          }),
        }),
      );
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'TAKE_DIAGNOSTIC_REQUEST' }),
      );
    });

    it('debe lanzar ConflictException si la solicitud ya fue tomada (concurrencia)', async () => {
      prisma.workshop.findUnique.mockResolvedValue({ id: 'ws-1', adminId: workshopAdminId });
      prisma.diagnosticRequest.updateMany.mockResolvedValue({ count: 0 });
      // Existe pero ya fue tomada
      prisma.diagnosticRequest.findUnique.mockResolvedValue({
        id: requestId,
        status: DiagnosticRequestStatus.TAKEN,
        workshopId: 'ws-otro',
      });

      await expect(service.take(requestId, workshopAdminId)).rejects.toThrow(ConflictException);
    });

    it('debe lanzar NotFoundException si la solicitud no existe', async () => {
      prisma.workshop.findUnique.mockResolvedValue({ id: 'ws-1', adminId: workshopAdminId });
      prisma.diagnosticRequest.updateMany.mockResolvedValue({ count: 0 });
      prisma.diagnosticRequest.findUnique.mockResolvedValue(null);

      await expect(service.take(requestId, workshopAdminId)).rejects.toThrow(NotFoundException);
    });

    it('debe lanzar NotFoundException si el admin no tiene taller', async () => {
      prisma.workshop.findUnique.mockResolvedValue(null);

      await expect(service.take(requestId, workshopAdminId)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── diagnose ────────────

  describe('diagnose', () => {
    const workshopAdminId = 'wa-1';
    const requestId = 'dr-1';
    const dto = { findings: 'Balatas desgastadas', recommendation: 'Cambiar balatas' };

    it('debe registrar el diagnóstico para una solicitud en estado TAKEN', async () => {
      prisma.workshop.findUnique.mockResolvedValue({ id: 'ws-1', adminId: workshopAdminId });
      prisma.diagnosticRequest.findUnique
        .mockResolvedValueOnce({
          id: requestId,
          status: DiagnosticRequestStatus.TAKEN,
          workshopId: 'ws-1',
        })
        .mockResolvedValueOnce({
          id: requestId,
          status: DiagnosticRequestStatus.DIAGNOSED,
          workshopId: 'ws-1',
          diagnosis: { findings: dto.findings, recommendation: dto.recommendation },
          vehicle: { id: 'v-1' },
          photos: [],
        });

      const diagnosisRecord = { id: 'diag-1', ...dto, diagnosticRequestId: requestId };
      (prisma as any).$transaction.mockResolvedValue([diagnosisRecord, {}]);

      const result = await service.diagnose(requestId, workshopAdminId, dto);

      expect(result!.status).toBe(DiagnosticRequestStatus.DIAGNOSED);
      expect((prisma as any).$transaction).toHaveBeenCalled();
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'DIAGNOSE_REQUEST' }),
      );
    });

    it('debe lanzar BadRequestException si la solicitud no está en TAKEN', async () => {
      prisma.workshop.findUnique.mockResolvedValue({ id: 'ws-1', adminId: workshopAdminId });
      prisma.diagnosticRequest.findUnique.mockResolvedValue({
        id: requestId,
        status: DiagnosticRequestStatus.PENDING,
        workshopId: null,
      });

      await expect(service.diagnose(requestId, workshopAdminId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('debe lanzar ForbiddenException si la solicitud no pertenece al taller del admin', async () => {
      prisma.workshop.findUnique.mockResolvedValue({ id: 'ws-1', adminId: workshopAdminId });
      prisma.diagnosticRequest.findUnique.mockResolvedValue({
        id: requestId,
        status: DiagnosticRequestStatus.TAKEN,
        workshopId: 'ws-otro',
      });

      await expect(service.diagnose(requestId, workshopAdminId, dto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('debe lanzar NotFoundException si la solicitud no existe', async () => {
      prisma.workshop.findUnique.mockResolvedValue({ id: 'ws-1', adminId: workshopAdminId });
      prisma.diagnosticRequest.findUnique.mockResolvedValue(null);

      await expect(service.diagnose(requestId, workshopAdminId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── findAll ────────────

  describe('findAll', () => {
    it('CLIENT: debe listar solo sus propias solicitudes', async () => {
      prisma.diagnosticRequest.findMany.mockResolvedValue([]);
      prisma.diagnosticRequest.count.mockResolvedValue(0);

      await service.findAll('client-1', Role.CLIENT, {});

      const findCall = prisma.diagnosticRequest.findMany.mock.calls[0][0];
      expect(findCall.where.clientId).toBe('client-1');
    });

    it('WORKSHOP_ADMIN: debe listar PENDING + las de su taller', async () => {
      prisma.workshop.findUnique.mockResolvedValue({ id: 'ws-1', adminId: 'wa-1' });
      prisma.diagnosticRequest.findMany.mockResolvedValue([]);
      prisma.diagnosticRequest.count.mockResolvedValue(0);

      await service.findAll('wa-1', Role.WORKSHOP_ADMIN, {});

      const findCall = prisma.diagnosticRequest.findMany.mock.calls[0][0];
      expect(findCall.where.OR).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ status: DiagnosticRequestStatus.PENDING }),
          expect.objectContaining({ workshopId: 'ws-1' }),
        ]),
      );
    });

    it('SUPER_ADMIN: debe listar todas sin filtro de userId', async () => {
      prisma.diagnosticRequest.findMany.mockResolvedValue([]);
      prisma.diagnosticRequest.count.mockResolvedValue(0);

      await service.findAll('admin-1', Role.SUPER_ADMIN, {});

      const findCall = prisma.diagnosticRequest.findMany.mock.calls[0][0];
      expect(findCall.where.clientId).toBeUndefined();
      expect(findCall.where.OR).toBeUndefined();
    });

    it('WORKSHOP_ADMIN sin taller: debe lanzar NotFoundException', async () => {
      prisma.workshop.findUnique.mockResolvedValue(null);

      await expect(
        service.findAll('wa-1', Role.WORKSHOP_ADMIN, {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe aplicar paginación correctamente', async () => {
      prisma.diagnosticRequest.findMany.mockResolvedValue([]);
      prisma.diagnosticRequest.count.mockResolvedValue(25);

      const result = await service.findAll('client-1', Role.CLIENT, { page: 2, limit: 5 });

      expect(result.page).toBe(2);
      expect(result.limit).toBe(5);
      expect(result.totalPages).toBe(5);
      const findCall = prisma.diagnosticRequest.findMany.mock.calls[0][0];
      expect(findCall.skip).toBe(5);
      expect(findCall.take).toBe(5);
    });
  });

  // ─── findOne ────────────

  describe('findOne', () => {
    it('debe devolver la solicitud si el cliente es dueño', async () => {
      const request = {
        id: 'dr-1',
        clientId: 'client-1',
        status: DiagnosticRequestStatus.PENDING,
        vehicle: {},
        photos: [],
        diagnosis: null,
      };
      prisma.diagnosticRequest.findUnique.mockResolvedValue(request);

      const result = await service.findOne('dr-1', 'client-1', Role.CLIENT);

      expect(result.id).toBe('dr-1');
    });

    it('debe lanzar ForbiddenException si un CLIENT intenta ver solicitud ajena', async () => {
      prisma.diagnosticRequest.findUnique.mockResolvedValue({
        id: 'dr-1',
        clientId: 'otro-cliente',
        status: DiagnosticRequestStatus.PENDING,
      });

      await expect(
        service.findOne('dr-1', 'client-1', Role.CLIENT),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debe lanzar NotFoundException si la solicitud no existe', async () => {
      prisma.diagnosticRequest.findUnique.mockResolvedValue(null);

      await expect(
        service.findOne('dr-nonexistent', 'client-1', Role.CLIENT),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe lanzar ForbiddenException si un TECHNICIAN intenta ver una solicitud', async () => {
      prisma.diagnosticRequest.findUnique.mockResolvedValue({
        id: 'dr-1',
        clientId: 'client-1',
        status: DiagnosticRequestStatus.PENDING,
        vehicle: {},
        photos: [],
        diagnosis: null,
      });

      await expect(
        service.findOne('dr-1', 'tech-1', Role.TECHNICIAN),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debe lanzar ForbiddenException si un SUPPLIER_ADMIN intenta ver una solicitud', async () => {
      prisma.diagnosticRequest.findUnique.mockResolvedValue({
        id: 'dr-1',
        clientId: 'client-1',
        status: DiagnosticRequestStatus.PENDING,
        vehicle: {},
        photos: [],
        diagnosis: null,
      });

      await expect(
        service.findOne('dr-1', 'sup-1', Role.SUPPLIER_ADMIN),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── findAll con filtro de status para WORKSHOP_ADMIN ────────────

  describe('findAll — WORKSHOP_ADMIN con filtro de status', () => {
    it('debe combinar filtro de rol + status PENDING correctamente', async () => {
      prisma.workshop.findUnique.mockResolvedValue({ id: 'ws-1', adminId: 'wa-1' });
      prisma.diagnosticRequest.findMany.mockResolvedValue([]);
      prisma.diagnosticRequest.count.mockResolvedValue(0);

      await service.findAll('wa-1', Role.WORKSHOP_ADMIN, {
        status: DiagnosticRequestStatus.PENDING,
      });

      const findCall = prisma.diagnosticRequest.findMany.mock.calls[0][0];
      expect(findCall.where.AND).toBeDefined();
    });
  });
});
