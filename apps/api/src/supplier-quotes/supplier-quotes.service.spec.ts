import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { SupplierQuoteRequestStatus, Role } from '@prisma/client';
import { SupplierQuotesService } from './supplier-quotes.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationService } from '../notifications/notification.service';
import { createMockPrismaService } from '../test/prisma.mock';

describe('SupplierQuotesService', () => {
  let service: SupplierQuotesService;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let audit: Record<string, jest.Mock>;
  let notifications: Record<string, jest.Mock>;

  beforeEach(async () => {
    prisma = createMockPrismaService();
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    notifications = {
      createInAppNotification: jest.fn().mockResolvedValue({}),
      sendNotificationEmail: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupplierQuotesService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
        { provide: NotificationService, useValue: notifications },
      ],
    }).compile();

    service = module.get<SupplierQuotesService>(SupplierQuotesService);
  });

  // ─── create ────────────

  describe('create', () => {
    const userId = 'wa-1';
    const dto = {
      partName: 'Pastillas de freno delanteras',
      quantity: 2,
      supplierIds: ['sup-1', 'sup-2'],
    };

    it('debe crear una solicitud con expiresAt a 48h y supplierIds persistidos', async () => {
      prisma.workshop.findUnique.mockResolvedValue({ id: 'ws-1', adminId: userId });
      prisma.supplier.findMany.mockResolvedValue([
        { id: 'sup-1', adminId: 'sa-1', name: 'Prov A', isActive: true },
        { id: 'sup-2', adminId: 'sa-2', name: 'Prov B', isActive: true },
      ]);

      const now = Date.now();
      const created = {
        id: 'sqr-1',
        workshopId: 'ws-1',
        partName: dto.partName,
        quantity: dto.quantity,
        supplierIds: ['sup-1', 'sup-2'],
        status: SupplierQuoteRequestStatus.PENDING,
        expiresAt: new Date(now + 48 * 60 * 60 * 1000),
        createdAt: new Date(now),
      };
      prisma.supplierQuoteRequest.create.mockResolvedValue(created);

      const result = await service.create(userId, dto);

      expect(result.id).toBe('sqr-1');
      expect(result.status).toBe(SupplierQuoteRequestStatus.PENDING);
      expect(result.supplierIds).toEqual(['sup-1', 'sup-2']);
      expect(result.expectedResponses).toBe(2);
      expect(prisma.supplierQuoteRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            workshopId: 'ws-1',
            partName: dto.partName,
            quantity: dto.quantity,
            supplierIds: ['sup-1', 'sup-2'],
            status: SupplierQuoteRequestStatus.PENDING,
          }),
        }),
      );
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CREATE_SUPPLIER_QUOTE_REQUEST' }),
      );
    });

    it('debe lanzar NotFoundException si el admin no tiene taller', async () => {
      prisma.workshop.findUnique.mockResolvedValue(null);

      await expect(service.create(userId, dto)).rejects.toThrow(NotFoundException);
    });

    it('debe lanzar BadRequestException si algún proveedor no existe o está inactivo', async () => {
      prisma.workshop.findUnique.mockResolvedValue({ id: 'ws-1', adminId: userId });
      // Solo 1 de 2 proveedores encontrado
      prisma.supplier.findMany.mockResolvedValue([
        { id: 'sup-1', adminId: 'sa-1', name: 'Prov A', isActive: true },
      ]);

      await expect(service.create(userId, dto)).rejects.toThrow(BadRequestException);
    });
  });

  // ─── respond ────────────

  describe('respond', () => {
    const userId = 'sa-1';
    const requestId = 'sqr-1';
    const dto = { price: '150000.00', deliveryDays: 3 };

    it('debe crear una respuesta y actualizar status a PARTIALLY_RESPONDED', async () => {
      prisma.supplier.findUnique.mockResolvedValue({ id: 'sup-1', adminId: userId, name: 'Prov A' });
      prisma.supplierQuoteRequest.findUnique.mockResolvedValue({
        id: requestId,
        supplierIds: ['sup-1', 'sup-2'],
        status: SupplierQuoteRequestStatus.PENDING,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        responses: [],
      });

      const createdResponse = {
        id: 'sqresp-1',
        requestId,
        supplierId: 'sup-1',
        price: '150000.00',
        deliveryDays: 3,
        supplier: { id: 'sup-1', name: 'Prov A' },
      };

      // Mock $transaction: execute the callback with a tx proxy
      prisma.$transaction.mockImplementation(async (cb: (tx: any) => Promise<any>) => {
        const tx = {
          supplierQuoteResponse: { create: jest.fn().mockResolvedValue(createdResponse) },
          supplierQuoteRequest: { update: jest.fn().mockResolvedValue({}) },
        };
        return cb(tx);
      });

      const result = await service.respond(requestId, userId, dto);

      expect(result.requestStatus).toBe(SupplierQuoteRequestStatus.PARTIALLY_RESPONDED);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('debe actualizar status a FULLY_RESPONDED cuando todos responden', async () => {
      prisma.supplier.findUnique.mockResolvedValue({ id: 'sup-2', adminId: userId, name: 'Prov B' });
      prisma.supplierQuoteRequest.findUnique.mockResolvedValue({
        id: requestId,
        supplierIds: ['sup-1', 'sup-2'],
        status: SupplierQuoteRequestStatus.PARTIALLY_RESPONDED,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        responses: [{ supplierId: 'sup-1' }],
      });

      const createdResponse = {
        id: 'sqresp-2',
        requestId,
        supplierId: 'sup-2',
        price: '140000.00',
        deliveryDays: 5,
        supplier: { id: 'sup-2', name: 'Prov B' },
      };

      prisma.$transaction.mockImplementation(async (cb: (tx: any) => Promise<any>) => {
        const tx = {
          supplierQuoteResponse: { create: jest.fn().mockResolvedValue(createdResponse) },
          supplierQuoteRequest: { update: jest.fn().mockResolvedValue({}) },
        };
        return cb(tx);
      });

      const result = await service.respond(requestId, userId, dto);

      expect(result.requestStatus).toBe(SupplierQuoteRequestStatus.FULLY_RESPONDED);
    });

    it('debe lanzar ConflictException si el proveedor ya respondió (409)', async () => {
      prisma.supplier.findUnique.mockResolvedValue({ id: 'sup-1', adminId: userId, name: 'Prov A' });
      prisma.supplierQuoteRequest.findUnique.mockResolvedValue({
        id: requestId,
        supplierIds: ['sup-1', 'sup-2'],
        status: SupplierQuoteRequestStatus.PARTIALLY_RESPONDED,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        responses: [{ supplierId: 'sup-1' }],
      });

      await expect(service.respond(requestId, userId, dto)).rejects.toThrow(ConflictException);
    });

    it('debe lanzar BadRequestException si la solicitud ha expirado (por status)', async () => {
      prisma.supplier.findUnique.mockResolvedValue({ id: 'sup-1', adminId: userId, name: 'Prov A' });
      prisma.supplierQuoteRequest.findUnique.mockResolvedValue({
        id: requestId,
        supplierIds: ['sup-1', 'sup-2'],
        status: SupplierQuoteRequestStatus.EXPIRED,
        expiresAt: new Date(Date.now() - 1000),
        responses: [],
      });

      await expect(service.respond(requestId, userId, dto)).rejects.toThrow(BadRequestException);
    });

    it('debe lanzar NotFoundException si la solicitud no existe', async () => {
      prisma.supplier.findUnique.mockResolvedValue({ id: 'sup-1', adminId: userId, name: 'Prov A' });
      prisma.supplierQuoteRequest.findUnique.mockResolvedValue(null);

      await expect(service.respond(requestId, userId, dto)).rejects.toThrow(NotFoundException);
    });

    it('debe lanzar NotFoundException si el usuario no tiene proveedor', async () => {
      prisma.supplier.findUnique.mockResolvedValue(null);

      await expect(service.respond(requestId, userId, dto)).rejects.toThrow(NotFoundException);
    });

    it('debe lanzar BadRequestException si la solicitud ya está FULLY_RESPONDED', async () => {
      prisma.supplier.findUnique.mockResolvedValue({ id: 'sup-1', adminId: userId, name: 'Prov A' });
      prisma.supplierQuoteRequest.findUnique.mockResolvedValue({
        id: requestId,
        supplierIds: ['sup-1', 'sup-2'],
        status: SupplierQuoteRequestStatus.FULLY_RESPONDED,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        responses: [{ supplierId: 'sup-2' }],
      });

      await expect(service.respond(requestId, userId, dto)).rejects.toThrow(BadRequestException);
    });

    // 🔴 #2 — Proveedor no invitado no puede responder
    it('debe lanzar ForbiddenException si el proveedor no fue invitado', async () => {
      prisma.supplier.findUnique.mockResolvedValue({ id: 'sup-3', adminId: userId, name: 'Prov C' });
      prisma.supplierQuoteRequest.findUnique.mockResolvedValue({
        id: requestId,
        supplierIds: ['sup-1', 'sup-2'],
        status: SupplierQuoteRequestStatus.PENDING,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        responses: [],
      });

      await expect(service.respond(requestId, userId, dto)).rejects.toThrow(ForbiddenException);
    });

    // 🟠 #5 — Expirada por fecha pero no por status
    it('debe lanzar BadRequestException si expiresAt ya pasó aunque status no sea EXPIRED', async () => {
      prisma.supplier.findUnique.mockResolvedValue({ id: 'sup-1', adminId: userId, name: 'Prov A' });
      prisma.supplierQuoteRequest.findUnique.mockResolvedValue({
        id: requestId,
        supplierIds: ['sup-1', 'sup-2'],
        status: SupplierQuoteRequestStatus.PENDING, // cron no ha corrido aun
        expiresAt: new Date(Date.now() - 60 * 60 * 1000), // hace 1 hora
        responses: [],
      });

      await expect(service.respond(requestId, userId, dto)).rejects.toThrow(BadRequestException);
    });
  });

  // ─── findAll ────────────

  describe('findAll', () => {
    it('WORKSHOP_ADMIN: debe listar solicitudes de su taller', async () => {
      prisma.workshop.findUnique.mockResolvedValue({ id: 'ws-1', adminId: 'wa-1' });
      prisma.supplierQuoteRequest.findMany.mockResolvedValue([]);
      prisma.supplierQuoteRequest.count.mockResolvedValue(0);

      await service.findAll('wa-1', Role.WORKSHOP_ADMIN, {});

      const findCall = prisma.supplierQuoteRequest.findMany.mock.calls[0][0];
      expect(findCall.where.workshopId).toBe('ws-1');
    });

    it('SUPPLIER_ADMIN: debe listar solicitudes donde fue invitado (supplierIds)', async () => {
      prisma.supplier.findUnique.mockResolvedValue({ id: 'sup-1', adminId: 'sa-1' });
      prisma.supplierQuoteRequest.findMany.mockResolvedValue([]);
      prisma.supplierQuoteRequest.count.mockResolvedValue(0);

      await service.findAll('sa-1', Role.SUPPLIER_ADMIN, {});

      const findCall = prisma.supplierQuoteRequest.findMany.mock.calls[0][0];
      expect(findCall.where.supplierIds).toEqual({ has: 'sup-1' });
    });

    it('SUPPLIER_ADMIN: debe ver solicitudes PENDING dirigidas a el', async () => {
      prisma.supplier.findUnique.mockResolvedValue({ id: 'sup-1', adminId: 'sa-1' });
      const pendingRequest = {
        id: 'sqr-1',
        supplierIds: ['sup-1'],
        status: SupplierQuoteRequestStatus.PENDING,
        responses: [],
        workshop: { id: 'ws-1', name: 'Taller X' },
      };
      prisma.supplierQuoteRequest.findMany.mockResolvedValue([pendingRequest]);
      prisma.supplierQuoteRequest.count.mockResolvedValue(1);

      const result = await service.findAll('sa-1', Role.SUPPLIER_ADMIN, { status: SupplierQuoteRequestStatus.PENDING });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].status).toBe(SupplierQuoteRequestStatus.PENDING);
      const findCall = prisma.supplierQuoteRequest.findMany.mock.calls[0][0];
      // Filtra por supplierIds (no por responses), asi que ve las PENDING
      expect(findCall.where.supplierIds).toEqual({ has: 'sup-1' });
      expect(findCall.where.status).toBe(SupplierQuoteRequestStatus.PENDING);
    });

    it('WORKSHOP_ADMIN sin taller: debe lanzar NotFoundException', async () => {
      prisma.workshop.findUnique.mockResolvedValue(null);

      await expect(
        service.findAll('wa-1', Role.WORKSHOP_ADMIN, {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('SUPPLIER_ADMIN sin proveedor: debe lanzar NotFoundException', async () => {
      prisma.supplier.findUnique.mockResolvedValue(null);

      await expect(
        service.findAll('sa-1', Role.SUPPLIER_ADMIN, {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe aplicar paginación correctamente', async () => {
      prisma.workshop.findUnique.mockResolvedValue({ id: 'ws-1', adminId: 'wa-1' });
      prisma.supplierQuoteRequest.findMany.mockResolvedValue([]);
      prisma.supplierQuoteRequest.count.mockResolvedValue(25);

      const result = await service.findAll('wa-1', Role.WORKSHOP_ADMIN, { page: 2, limit: 5 });

      expect(result.page).toBe(2);
      expect(result.limit).toBe(5);
      expect(result.totalPages).toBe(5);
      const findCall = prisma.supplierQuoteRequest.findMany.mock.calls[0][0];
      expect(findCall.skip).toBe(5);
      expect(findCall.take).toBe(5);
    });

    it('CLIENT no debe poder listar', async () => {
      await expect(
        service.findAll('c-1', Role.CLIENT, {}),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── findOne ────────────

  describe('findOne', () => {
    it('WORKSHOP_ADMIN: debe devolver la solicitud si pertenece a su taller', async () => {
      const request = {
        id: 'sqr-1',
        workshopId: 'ws-1',
        status: SupplierQuoteRequestStatus.PENDING,
        responses: [],
        workshop: { id: 'ws-1', name: 'Mi Taller' },
      };
      prisma.supplierQuoteRequest.findUnique.mockResolvedValue(request);
      prisma.workshop.findUnique.mockResolvedValue({ id: 'ws-1', adminId: 'wa-1' });

      const result = await service.findOne('sqr-1', 'wa-1', Role.WORKSHOP_ADMIN);

      expect(result.id).toBe('sqr-1');
    });

    it('debe lanzar NotFoundException si la solicitud no existe', async () => {
      prisma.supplierQuoteRequest.findUnique.mockResolvedValue(null);

      await expect(
        service.findOne('sqr-nonexistent', 'wa-1', Role.WORKSHOP_ADMIN),
      ).rejects.toThrow(NotFoundException);
    });

    it('WORKSHOP_ADMIN: debe lanzar ForbiddenException si la solicitud no es de su taller', async () => {
      prisma.supplierQuoteRequest.findUnique.mockResolvedValue({
        id: 'sqr-1',
        workshopId: 'ws-otro',
        responses: [],
        workshop: { id: 'ws-otro', name: 'Otro Taller' },
      });
      prisma.workshop.findUnique.mockResolvedValue({ id: 'ws-1', adminId: 'wa-1' });

      await expect(
        service.findOne('sqr-1', 'wa-1', Role.WORKSHOP_ADMIN),
      ).rejects.toThrow(ForbiddenException);
    });

    it('SUPPLIER_ADMIN: debe lanzar ForbiddenException si no fue invitado a esta solicitud', async () => {
      prisma.supplierQuoteRequest.findUnique.mockResolvedValue({
        id: 'sqr-1',
        workshopId: 'ws-1',
        supplierIds: ['sup-otro'],
        responses: [{ supplierId: 'sup-otro' }],
        workshop: { id: 'ws-1', name: 'Taller' },
      });
      prisma.supplier.findUnique.mockResolvedValue({ id: 'sup-1', adminId: 'sa-1' });

      await expect(
        service.findOne('sqr-1', 'sa-1', Role.SUPPLIER_ADMIN),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── WX-061: expireStaleRequests ────────────

  describe('expireStaleRequests', () => {
    it('debe marcar como EXPIRED las solicitudes con expiresAt pasado y status PENDING', async () => {
      prisma.supplierQuoteRequest.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.expireStaleRequests();

      expect(result).toBe(3);
      expect(prisma.supplierQuoteRequest.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            expiresAt: { lt: expect.any(Date) },
            status: {
              in: [
                SupplierQuoteRequestStatus.PENDING,
                SupplierQuoteRequestStatus.PARTIALLY_RESPONDED,
              ],
            },
          }),
          data: { status: SupplierQuoteRequestStatus.EXPIRED },
        }),
      );
    });

    it('debe retornar 0 si no hay solicitudes expiradas', async () => {
      prisma.supplierQuoteRequest.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.expireStaleRequests();

      expect(result).toBe(0);
    });

    it('debe incluir PARTIALLY_RESPONDED en el filtro', async () => {
      prisma.supplierQuoteRequest.updateMany.mockResolvedValue({ count: 1 });

      await service.expireStaleRequests();

      const call = prisma.supplierQuoteRequest.updateMany.mock.calls[0][0];
      expect(call.where.status.in).toContain(SupplierQuoteRequestStatus.PARTIALLY_RESPONDED);
    });
  });
});
