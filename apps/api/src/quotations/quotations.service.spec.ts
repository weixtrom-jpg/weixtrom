import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { QuotationStatus, QuotationItemType, WorkOrderStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { QuotationsService } from './quotations.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notifications/notification.service';
import { createMockPrismaService } from '../test/prisma.mock';

describe('QuotationsService', () => {
  let service: QuotationsService;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let notifications: Record<string, jest.Mock>;

  const workshopAdminId = 'wa-1';
  const clientId = 'client-1';
  const workshopId = 'ws-1';
  const quotationId = 'q-1';
  const itemId = 'qi-1';
  const diagnosticRequestId = 'dr-1';

  const mockWorkshop = { id: workshopId, adminId: workshopAdminId, name: 'Taller Test' };

  beforeEach(async () => {
    prisma = createMockPrismaService();
    notifications = {
      createInAppNotification: jest.fn().mockResolvedValue({}),
      sendNotificationEmail: jest.fn().mockResolvedValue(true),
      sendNewDiagnosticRequestEmail: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuotationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationService, useValue: notifications },
      ],
    }).compile();

    service = module.get<QuotationsService>(QuotationsService);
  });

  // ─── create ────────────

  describe('create', () => {
    const dto = { diagnosticRequestId };

    it('debe crear una cotizacion cuando el diagnosticRequest pertenece al taller', async () => {
      prisma.workshop.findUnique.mockResolvedValue(mockWorkshop);
      prisma.diagnosticRequest.findUnique.mockResolvedValue({
        id: diagnosticRequestId,
        workshopId,
      });
      prisma.quotation.findUnique.mockResolvedValue(null);
      const created = {
        id: quotationId,
        diagnosticRequestId,
        workshopId,
        status: QuotationStatus.DRAFT,
        items: [],
      };
      prisma.quotation.create.mockResolvedValue(created);

      const result = await service.create(workshopAdminId, dto);

      expect(result.id).toBe(quotationId);
      expect(result.status).toBe(QuotationStatus.DRAFT);
      expect(prisma.quotation.create).toHaveBeenCalled();
    });

    it('debe lanzar NotFoundException si no tiene taller', async () => {
      prisma.workshop.findUnique.mockResolvedValue(null);

      await expect(service.create(workshopAdminId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debe lanzar NotFoundException si el diagnosticRequest no existe', async () => {
      prisma.workshop.findUnique.mockResolvedValue(mockWorkshop);
      prisma.diagnosticRequest.findUnique.mockResolvedValue(null);

      await expect(service.create(workshopAdminId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debe lanzar ForbiddenException si el diagnosticRequest no pertenece al taller', async () => {
      prisma.workshop.findUnique.mockResolvedValue(mockWorkshop);
      prisma.diagnosticRequest.findUnique.mockResolvedValue({
        id: diagnosticRequestId,
        workshopId: 'otro-taller',
      });

      await expect(service.create(workshopAdminId, dto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('debe lanzar ConflictException si ya existe cotizacion para esa solicitud', async () => {
      prisma.workshop.findUnique.mockResolvedValue(mockWorkshop);
      prisma.diagnosticRequest.findUnique.mockResolvedValue({
        id: diagnosticRequestId,
        workshopId,
      });
      prisma.quotation.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(service.create(workshopAdminId, dto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  // ─── WX-054: Calculo automatico del total con 3 items ────────────

  describe('addItem / recalculateTotals (WX-054)', () => {
    const draftQuotation = {
      id: quotationId,
      workshopId,
      status: QuotationStatus.DRAFT,
    };

    it('debe recalcular subtotal, tax y total al agregar 3 items', async () => {
      prisma.workshop.findUnique.mockResolvedValue(mockWorkshop);
      prisma.quotation.findUnique.mockResolvedValue(draftQuotation);

      // Simular los 3 items creados secuencialmente
      const items = [
        { id: 'qi-1', total: new Prisma.Decimal(100000) }, // 2 * 50000
        { id: 'qi-2', total: new Prisma.Decimal(60000) },  // 3 * 20000
        { id: 'qi-3', total: new Prisma.Decimal(150000) }, // 1 * 150000
      ];

      prisma.quotationItem.create.mockResolvedValue(items[0]);
      prisma.quotationItem.findMany.mockResolvedValue(items);
      prisma.quotation.update.mockResolvedValue({});

      await service.addItem(quotationId, workshopAdminId, {
        type: QuotationItemType.SERVICE,
        description: 'Cambio de aceite',
        quantity: 2,
        unitPrice: 50000,
      });

      // Verificar que recalculateTotals fue invocado
      const updateCall = prisma.quotation.update.mock.calls[0][0];
      const subtotal = new Prisma.Decimal(310000); // 100000 + 60000 + 150000
      const tax = subtotal.mul(new Prisma.Decimal('0.19'));     // 58900
      const total = subtotal.add(tax);                          // 368900

      expect(updateCall.data.subtotal.toString()).toBe(subtotal.toString());
      expect(updateCall.data.tax.toString()).toBe(tax.toString());
      expect(updateCall.data.total.toString()).toBe(total.toString());
    });
  });

  // ─── updateItem ────────────

  describe('updateItem', () => {
    const draftQuotation = {
      id: quotationId,
      workshopId,
      status: QuotationStatus.DRAFT,
    };

    it('debe actualizar item y recalcular totales', async () => {
      prisma.workshop.findUnique.mockResolvedValue(mockWorkshop);
      prisma.quotation.findUnique.mockResolvedValue(draftQuotation);
      prisma.quotationItem.findFirst.mockResolvedValue({
        id: itemId,
        quotationId,
        quantity: 1,
        unitPrice: new Prisma.Decimal(50000),
      });
      prisma.quotationItem.update.mockResolvedValue({ id: itemId });
      prisma.quotationItem.findMany.mockResolvedValue([
        { id: itemId, total: new Prisma.Decimal(150000) }, // 3 * 50000
      ]);
      prisma.quotation.update.mockResolvedValue({});

      const result = await service.updateItem(quotationId, itemId, workshopAdminId, {
        quantity: 3,
      });

      expect(result.id).toBe(itemId);
      expect(prisma.quotation.update).toHaveBeenCalled();
    });

    it('debe lanzar NotFoundException si el item no pertenece a la cotizacion', async () => {
      prisma.workshop.findUnique.mockResolvedValue(mockWorkshop);
      prisma.quotation.findUnique.mockResolvedValue(draftQuotation);
      prisma.quotationItem.findFirst.mockResolvedValue(null);

      await expect(
        service.updateItem(quotationId, 'bad-id', workshopAdminId, { quantity: 2 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── removeItem ────────────

  describe('removeItem', () => {
    it('debe eliminar item y recalcular totales', async () => {
      prisma.workshop.findUnique.mockResolvedValue(mockWorkshop);
      prisma.quotation.findUnique.mockResolvedValue({
        id: quotationId,
        workshopId,
        status: QuotationStatus.DRAFT,
      });
      prisma.quotationItem.findFirst.mockResolvedValue({ id: itemId, quotationId });
      prisma.quotationItem.delete.mockResolvedValue({});
      prisma.quotationItem.findMany.mockResolvedValue([]);
      prisma.quotation.update.mockResolvedValue({});

      const result = await service.removeItem(quotationId, itemId, workshopAdminId);

      expect(result.message).toBe('Item eliminado');
      expect(prisma.quotationItem.delete).toHaveBeenCalledWith({
        where: { id: itemId },
      });
    });
  });

  // ─── send ────────────

  describe('send', () => {
    it('debe cambiar status a SENT y notificar al cliente', async () => {
      prisma.workshop.findUnique.mockResolvedValue(mockWorkshop);
      prisma.quotation.findUnique.mockResolvedValue({
        id: quotationId,
        workshopId,
        status: QuotationStatus.DRAFT,
      });
      prisma.quotation.update.mockResolvedValue({
        id: quotationId,
        status: QuotationStatus.SENT,
        diagnosticRequest: { client: { id: clientId } },
        workshop: mockWorkshop,
      });

      const result = await service.send(quotationId, workshopAdminId);

      expect(result.status).toBe(QuotationStatus.SENT);
      expect(notifications.createInAppNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: clientId,
          type: 'QUOTATION_SENT',
        }),
      );
    });
  });

  // ─── WX-055: Inmutabilidad ────────────

  describe('inmutabilidad (WX-055)', () => {
    it('debe lanzar ConflictException al intentar agregar item a cotizacion APPROVED', async () => {
      prisma.workshop.findUnique.mockResolvedValue(mockWorkshop);
      prisma.quotation.findUnique.mockResolvedValue({
        id: quotationId,
        workshopId,
        status: QuotationStatus.APPROVED,
      });

      await expect(
        service.addItem(quotationId, workshopAdminId, {
          type: QuotationItemType.SERVICE,
          description: 'Test',
          quantity: 1,
          unitPrice: 10000,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('debe lanzar ConflictException al intentar enviar cotizacion REJECTED', async () => {
      prisma.workshop.findUnique.mockResolvedValue(mockWorkshop);
      prisma.quotation.findUnique.mockResolvedValue({
        id: quotationId,
        workshopId,
        status: QuotationStatus.REJECTED,
      });

      await expect(
        service.send(quotationId, workshopAdminId),
      ).rejects.toThrow(ConflictException);
    });

    it('debe lanzar ConflictException al intentar comentar cotizacion APPROVED', async () => {
      prisma.quotation.findUnique.mockResolvedValue({
        id: quotationId,
        workshopId,
        status: QuotationStatus.APPROVED,
        diagnosticRequest: { vehicle: { ownerId: clientId } },
        workshop: mockWorkshop,
      });

      await expect(
        service.addComment(quotationId, clientId, 'Un ajuste'),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─── WX-056: Aprobar ────────────

  describe('approve (WX-056)', () => {
    const sentQuotation = {
      id: quotationId,
      workshopId,
      status: QuotationStatus.SENT,
      diagnosticRequest: {
        vehicle: { ownerId: clientId },
      },
      workshop: mockWorkshop,
    };

    it('debe aprobar y crear WorkOrder en transaccion', async () => {
      prisma.quotation.findUnique.mockResolvedValue(sentQuotation);
      const updatedQ = { ...sentQuotation, status: QuotationStatus.APPROVED };
      const createdWO = {
        id: 'wo-1',
        quotationId,
        workshopId,
        status: WorkOrderStatus.CREATED,
      };
      (prisma as any).$transaction.mockResolvedValue([updatedQ, createdWO]);

      const result = await service.approve(quotationId, clientId);

      expect(result.status).toBe(QuotationStatus.APPROVED);
      expect(result.workOrder.id).toBe('wo-1');
      expect((prisma as any).$transaction).toHaveBeenCalled();
      expect(notifications.createInAppNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: workshopAdminId,
          type: 'QUOTATION_APPROVED',
        }),
      );
    });

    it('debe lanzar ForbiddenException si el cliente no es dueno del vehiculo', async () => {
      prisma.quotation.findUnique.mockResolvedValue({
        ...sentQuotation,
        diagnosticRequest: { vehicle: { ownerId: 'otro-cliente' } },
      });

      await expect(
        service.approve(quotationId, clientId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debe lanzar NotFoundException si la cotizacion no existe', async () => {
      prisma.quotation.findUnique.mockResolvedValue(null);

      await expect(
        service.approve(quotationId, clientId),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe lanzar BadRequestException si la cotizacion no esta en SENT', async () => {
      prisma.quotation.findUnique.mockResolvedValue({
        ...sentQuotation,
        status: QuotationStatus.DRAFT,
      });

      await expect(
        service.approve(quotationId, clientId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── WX-056: Rechazar ────────────

  describe('reject (WX-056)', () => {
    const sentQuotation = {
      id: quotationId,
      workshopId,
      status: QuotationStatus.SENT,
      diagnosticRequest: {
        vehicle: { ownerId: clientId },
      },
      workshop: mockWorkshop,
    };

    it('debe rechazar con motivo opcional y notificar al taller', async () => {
      prisma.quotation.findUnique.mockResolvedValue(sentQuotation);
      const updated = { ...sentQuotation, status: QuotationStatus.REJECTED, rejectionReason: 'Muy caro' };
      prisma.quotation.update.mockResolvedValue(updated);

      const result = await service.reject(quotationId, clientId, 'Muy caro');

      expect(result.status).toBe(QuotationStatus.REJECTED);
      expect(notifications.createInAppNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: workshopAdminId,
          type: 'QUOTATION_REJECTED',
        }),
      );
    });

    it('debe rechazar sin motivo', async () => {
      prisma.quotation.findUnique.mockResolvedValue(sentQuotation);
      prisma.quotation.update.mockResolvedValue({
        ...sentQuotation,
        status: QuotationStatus.REJECTED,
        rejectionReason: null,
      });

      const result = await service.reject(quotationId, clientId);

      expect(result.status).toBe(QuotationStatus.REJECTED);
    });

    it('debe lanzar ForbiddenException si no es el dueno del vehiculo', async () => {
      prisma.quotation.findUnique.mockResolvedValue({
        ...sentQuotation,
        diagnosticRequest: { vehicle: { ownerId: 'otro' } },
      });

      await expect(
        service.reject(quotationId, clientId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── WX-057: Comentario ────────────

  describe('addComment (WX-057)', () => {
    const sentQuotation = {
      id: quotationId,
      workshopId,
      status: QuotationStatus.SENT,
      diagnosticRequest: {
        vehicle: { ownerId: clientId },
      },
      workshop: mockWorkshop,
    };

    it('debe guardar comentario y notificar al taller sin cambiar status', async () => {
      prisma.quotation.findUnique.mockResolvedValue(sentQuotation);
      const updated = { ...sentQuotation, clientComment: 'Necesito descuento' };
      prisma.quotation.update.mockResolvedValue(updated);

      const result = await service.addComment(quotationId, clientId, 'Necesito descuento');

      expect(result.clientComment).toBe('Necesito descuento');
      expect(result.status).toBe(QuotationStatus.SENT); // No cambio
      expect(notifications.createInAppNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: workshopAdminId,
          type: 'QUOTATION_COMMENT',
        }),
      );
    });

    it('debe lanzar ForbiddenException si no es el dueno del vehiculo', async () => {
      prisma.quotation.findUnique.mockResolvedValue({
        ...sentQuotation,
        diagnosticRequest: { vehicle: { ownerId: 'otro' } },
      });

      await expect(
        service.addComment(quotationId, clientId, 'Hola'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── Hallazgos reviewer: validaciones de status ────────────

  describe('send — solo desde DRAFT', () => {
    it('debe lanzar BadRequestException al enviar cotizacion ya SENT', async () => {
      prisma.workshop.findUnique.mockResolvedValue(mockWorkshop);
      prisma.quotation.findUnique.mockResolvedValue({
        id: quotationId,
        workshopId,
        status: QuotationStatus.SENT,
      });

      await expect(
        service.send(quotationId, workshopAdminId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('addComment — solo en status SENT', () => {
    it('debe lanzar BadRequestException al comentar cotizacion en DRAFT', async () => {
      prisma.quotation.findUnique.mockResolvedValue({
        id: quotationId,
        workshopId,
        status: QuotationStatus.DRAFT,
        diagnosticRequest: { vehicle: { ownerId: clientId } },
        workshop: mockWorkshop,
      });

      await expect(
        service.addComment(quotationId, clientId, 'Un comentario'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── findOne ────────────

  describe('findOne', () => {
    it('debe lanzar NotFoundException si no existe', async () => {
      prisma.quotation.findUnique.mockResolvedValue(null);

      await expect(
        service.findOne('bad-id', clientId, 'CLIENT' as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe lanzar ForbiddenException si CLIENT no es dueno', async () => {
      prisma.quotation.findUnique.mockResolvedValue({
        id: quotationId,
        workshopId,
        diagnosticRequest: { clientId: 'otro', client: {} },
        workshop: mockWorkshop,
      });

      await expect(
        service.findOne(quotationId, clientId, 'CLIENT' as any),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
