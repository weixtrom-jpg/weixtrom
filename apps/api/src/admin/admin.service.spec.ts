import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Role, UserStatus } from '@prisma/client';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { createMockPrismaService } from '../test/prisma.mock';

describe('AdminService', () => {
  let service: AdminService;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let audit: Record<string, jest.Mock>;

  beforeEach(async () => {
    prisma = createMockPrismaService();
    audit = { log: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  // ─── WX-088: listUsers ────────────

  describe('listUsers', () => {
    it('debe listar usuarios con paginación por defecto', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(0);

      const result = await service.listUsers({});

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(prisma.user.findMany).toHaveBeenCalled();
    });

    it('debe aplicar filtro de rol', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(0);

      await service.listUsers({ role: Role.CLIENT });

      const call = prisma.user.findMany.mock.calls[0][0];
      expect(call.where.role).toBe(Role.CLIENT);
    });

    it('debe aplicar búsqueda por nombre/email', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(0);

      await service.listUsers({ search: 'juan' });

      const call = prisma.user.findMany.mock.calls[0][0];
      expect(call.where.OR).toBeDefined();
      expect(call.where.OR.length).toBe(3);
    });
  });

  // ─── WX-088: getUserDetail ────────────

  describe('getUserDetail', () => {
    it('debe devolver el detalle del usuario', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        firstName: 'Test',
      });

      const result = await service.getUserDetail('user-1');
      expect(result.id).toBe('user-1');
    });

    it('debe lanzar NotFoundException si no existe', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getUserDetail('no-existe')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── WX-088: activateUser ────────────

  describe('activateUser', () => {
    it('debe activar un usuario suspendido', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        status: UserStatus.SUSPENDED,
      });
      prisma.user.update.mockResolvedValue({
        id: 'user-1',
        status: UserStatus.ACTIVE,
      });

      const result = await service.activateUser('user-1', 'admin-1');
      expect(result.status).toBe(UserStatus.ACTIVE);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'ACTIVATE_USER' }),
      );
    });

    it('debe lanzar BadRequestException si ya está activo', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        status: UserStatus.ACTIVE,
      });

      await expect(service.activateUser('user-1', 'admin-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('debe lanzar NotFoundException si no existe', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.activateUser('no-existe', 'admin-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── WX-088: suspendUser ────────────

  describe('suspendUser', () => {
    it('debe suspender un usuario activo e invalidar tokens', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        status: UserStatus.ACTIVE,
        role: Role.CLIENT,
      });
      prisma.user.update.mockResolvedValue({
        id: 'user-1',
        status: UserStatus.SUSPENDED,
      });
      prisma.refreshToken.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.suspendUser('user-1', 'admin-1');
      expect(result.status).toBe(UserStatus.SUSPENDED);
      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'SUSPEND_USER' }),
      );
    });

    it('debe lanzar BadRequestException si se intenta suspender a un SUPER_ADMIN', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        status: UserStatus.ACTIVE,
        role: Role.SUPER_ADMIN,
      });

      await expect(service.suspendUser('user-1', 'admin-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('debe lanzar BadRequestException si ya está suspendido', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        status: UserStatus.SUSPENDED,
        role: Role.CLIENT,
      });

      await expect(service.suspendUser('user-1', 'admin-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ─── WX-088: deleteUser ────────────

  describe('deleteUser', () => {
    it('debe hacer soft delete (status BLOCKED)', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        status: UserStatus.ACTIVE,
        role: Role.CLIENT,
      });
      prisma.user.update.mockResolvedValue({
        id: 'user-1',
        status: UserStatus.BLOCKED,
      });
      prisma.refreshToken.deleteMany.mockResolvedValue({ count: 0 });

      const result = await service.deleteUser('user-1', 'admin-1');
      expect(result.status).toBe(UserStatus.BLOCKED);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'DELETE_USER' }),
      );
    });

    it('debe lanzar BadRequestException si se intenta eliminar a un SUPER_ADMIN', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        role: Role.SUPER_ADMIN,
      });

      await expect(service.deleteUser('user-1', 'admin-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ─── WX-089: changeUserRole ────────────

  describe('changeUserRole', () => {
    it('debe cambiar el rol e invalidar tokens', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        role: Role.CLIENT,
      });
      prisma.user.update.mockResolvedValue({
        id: 'user-1',
        role: Role.WORKSHOP_ADMIN,
      });
      prisma.refreshToken.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.changeUserRole('user-1', Role.WORKSHOP_ADMIN, 'admin-1');
      expect(result.role).toBe(Role.WORKSHOP_ADMIN);
      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CHANGE_USER_ROLE' }),
      );
    });

    it('debe lanzar BadRequestException si intenta cambiar su propio rol', async () => {
      await expect(
        service.changeUserRole('admin-1', Role.CLIENT, 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe lanzar BadRequestException si el rol es el mismo', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        role: Role.CLIENT,
      });

      await expect(
        service.changeUserRole('user-1', Role.CLIENT, 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('debe lanzar NotFoundException si el usuario no existe', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.changeUserRole('no-existe', Role.CLIENT, 'admin-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── WX-090: Talleres ────────────

  describe('listWorkshops', () => {
    it('debe listar talleres con filtros', async () => {
      prisma.workshop.findMany.mockResolvedValue([]);
      prisma.workshop.count.mockResolvedValue(0);

      const result = await service.listWorkshops({ isVerified: true });

      const call = prisma.workshop.findMany.mock.calls[0][0];
      expect(call.where.isVerified).toBe(true);
      expect(result.page).toBe(1);
    });
  });

  describe('verifyWorkshop', () => {
    it('debe verificar un taller no verificado', async () => {
      prisma.workshop.findUnique.mockResolvedValue({ id: 'ws-1', isVerified: false });
      prisma.workshop.update.mockResolvedValue({ id: 'ws-1', isVerified: true });

      const result = await service.verifyWorkshop('ws-1', 'admin-1');
      expect(result.isVerified).toBe(true);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'VERIFY_WORKSHOP' }),
      );
    });

    it('debe lanzar BadRequestException si ya está verificado', async () => {
      prisma.workshop.findUnique.mockResolvedValue({ id: 'ws-1', isVerified: true });

      await expect(service.verifyWorkshop('ws-1', 'admin-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('debe lanzar NotFoundException si no existe', async () => {
      prisma.workshop.findUnique.mockResolvedValue(null);

      await expect(service.verifyWorkshop('no-existe', 'admin-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('suspendWorkshop', () => {
    it('debe suspender un taller', async () => {
      prisma.workshop.findUnique.mockResolvedValue({ id: 'ws-1', isVerified: true, isActive: true });
      prisma.workshop.update.mockResolvedValue({ id: 'ws-1', isVerified: false, isActive: false });

      const result = await service.suspendWorkshop('ws-1', 'admin-1');
      expect(result.isActive).toBe(false);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'SUSPEND_WORKSHOP' }),
      );
    });

    it('debe lanzar NotFoundException si no existe', async () => {
      prisma.workshop.findUnique.mockResolvedValue(null);

      await expect(service.suspendWorkshop('no-existe', 'admin-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── WX-090: Proveedores ────────────

  describe('listSuppliers', () => {
    it('debe listar proveedores con filtros', async () => {
      (prisma as any).supplier.findMany.mockResolvedValue([]);
      (prisma as any).supplier.count.mockResolvedValue(0);

      const result = await service.listSuppliers({ isVerified: false });

      const call = (prisma as any).supplier.findMany.mock.calls[0][0];
      expect(call.where.isVerified).toBe(false);
      expect(result.page).toBe(1);
    });
  });

  describe('verifySupplier', () => {
    it('debe verificar un proveedor no verificado', async () => {
      (prisma as any).supplier.findUnique.mockResolvedValue({ id: 'sup-1', isVerified: false });
      (prisma as any).supplier.update.mockResolvedValue({ id: 'sup-1', isVerified: true });

      const result = await service.verifySupplier('sup-1', 'admin-1');
      expect(result.isVerified).toBe(true);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'VERIFY_SUPPLIER' }),
      );
    });

    it('debe lanzar BadRequestException si ya está verificado', async () => {
      (prisma as any).supplier.findUnique.mockResolvedValue({ id: 'sup-1', isVerified: true });

      await expect(service.verifySupplier('sup-1', 'admin-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('debe lanzar NotFoundException si no existe', async () => {
      (prisma as any).supplier.findUnique.mockResolvedValue(null);

      await expect(service.verifySupplier('no-existe', 'admin-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('suspendSupplier', () => {
    it('debe suspender un proveedor', async () => {
      (prisma as any).supplier.findUnique.mockResolvedValue({ id: 'sup-1', isVerified: true, isActive: true });
      (prisma as any).supplier.update.mockResolvedValue({ id: 'sup-1', isVerified: false, isActive: false });

      const result = await service.suspendSupplier('sup-1', 'admin-1');
      expect(result.isActive).toBe(false);
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'SUSPEND_SUPPLIER' }),
      );
    });

    it('debe lanzar NotFoundException si no existe', async () => {
      (prisma as any).supplier.findUnique.mockResolvedValue(null);

      await expect(service.suspendSupplier('no-existe', 'admin-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
