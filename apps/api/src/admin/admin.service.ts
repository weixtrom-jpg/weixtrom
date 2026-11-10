import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, UserStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { ListWorkshopsQueryDto, ListSuppliersQueryDto } from './dto/list-workshops-query.dto';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  // ─── WX-088: Listar usuarios con filtros ────────────

  async listUsers(query: ListUsersQueryDto) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 20;

    const where: Prisma.UserWhereInput = {};

    if (query.role) {
      where.role = query.role;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          status: true,
          emailVerified: true,
          lastLoginAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ─── WX-088: Detalle de usuario ────────────

  async getUserDetail(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        status: true,
        emailVerified: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        workshop: { select: { id: true, name: true, isVerified: true, isActive: true } },
        supplier: { select: { id: true, name: true, isVerified: true, isActive: true } },
      },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return user;
  }

  // ─── WX-088: Activar usuario ────────────

  async activateUser(targetUserId: string, adminId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (user.status === UserStatus.ACTIVE) {
      throw new BadRequestException('El usuario ya está activo');
    }

    const oldStatus = user.status;
    const updated = await this.prisma.user.update({
      where: { id: targetUserId },
      data: { status: UserStatus.ACTIVE },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, status: true },
    });

    await this.audit.log({
      userId: adminId,
      action: 'ACTIVATE_USER',
      entity: 'User',
      entityId: targetUserId,
      oldValue: { status: oldStatus },
      newValue: { status: UserStatus.ACTIVE },
    });

    return updated;
  }

  // ─── WX-088: Suspender usuario ────────────

  async suspendUser(targetUserId: string, adminId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new BadRequestException('El usuario ya está suspendido');
    }

    if (user.role === Role.SUPER_ADMIN) {
      throw new BadRequestException('No se puede suspender a un Super Admin');
    }

    const oldStatus = user.status;
    const updated = await this.prisma.user.update({
      where: { id: targetUserId },
      data: { status: UserStatus.SUSPENDED, lockedUntil: null },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, status: true },
    });

    await this.prisma.refreshToken.deleteMany({ where: { userId: targetUserId } });

    await this.audit.log({
      userId: adminId,
      action: 'SUSPEND_USER',
      entity: 'User',
      entityId: targetUserId,
      oldValue: { status: oldStatus },
      newValue: { status: UserStatus.SUSPENDED },
    });

    return updated;
  }

  // ─── WX-088: Soft delete de usuario ────────────

  async deleteUser(targetUserId: string, adminId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (user.role === Role.SUPER_ADMIN) {
      throw new BadRequestException('No se puede eliminar a un Super Admin');
    }

    const oldStatus = user.status;
    // Soft delete: cambiar status a BLOCKED (no hay DELETED en el enum, usamos BLOCKED)
    const updated = await this.prisma.user.update({
      where: { id: targetUserId },
      data: { status: UserStatus.BLOCKED, lockedUntil: null },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, status: true },
    });

    await this.prisma.refreshToken.deleteMany({ where: { userId: targetUserId } });

    await this.audit.log({
      userId: adminId,
      action: 'DELETE_USER',
      entity: 'User',
      entityId: targetUserId,
      oldValue: { status: oldStatus },
      newValue: { status: UserStatus.BLOCKED },
    });

    return updated;
  }

  // ─── WX-089: Cambiar rol de usuario ────────────

  async changeUserRole(targetUserId: string, newRole: Role, adminId: string) {
    if (targetUserId === adminId) {
      throw new BadRequestException('No puedes cambiar tu propio rol');
    }

    if (newRole === Role.SUPER_ADMIN) {
      throw new BadRequestException('No se puede asignar el rol SUPER_ADMIN por esta vía');
    }

    const user = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (user.role === Role.SUPER_ADMIN) {
      throw new BadRequestException('No se puede cambiar el rol de un Super Admin');
    }

    if (user.role === newRole) {
      throw new BadRequestException(`El usuario ya tiene el rol ${newRole}`);
    }

    const oldRole = user.role;
    const updated = await this.prisma.user.update({
      where: { id: targetUserId },
      data: { role: newRole },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, status: true },
    });

    // Invalidar refresh tokens para que el nuevo rol aplique de inmediato
    await this.prisma.refreshToken.deleteMany({ where: { userId: targetUserId } });

    await this.audit.log({
      userId: adminId,
      action: 'CHANGE_USER_ROLE',
      entity: 'User',
      entityId: targetUserId,
      oldValue: { role: oldRole },
      newValue: { role: newRole },
    });

    return updated;
  }

  // ─── WX-090: Listar talleres ────────────

  async listWorkshops(query: ListWorkshopsQueryDto) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 20;

    const where: Prisma.WorkshopWhereInput = {};

    if (query.isVerified !== undefined) {
      where.isVerified = query.isVerified;
    }
    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { city: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.workshop.findMany({
        where,
        include: {
          admin: { select: { id: true, email: true, firstName: true, lastName: true, status: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.workshop.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ─── WX-090: Verificar taller ────────────

  async verifyWorkshop(workshopId: string, adminId: string) {
    const workshop = await this.prisma.workshop.findUnique({ where: { id: workshopId } });
    if (!workshop) {
      throw new NotFoundException('Taller no encontrado');
    }

    if (workshop.isVerified) {
      throw new BadRequestException('El taller ya está verificado');
    }

    const updated = await this.prisma.workshop.update({
      where: { id: workshopId },
      data: { isVerified: true },
    });

    await this.audit.log({
      userId: adminId,
      action: 'VERIFY_WORKSHOP',
      entity: 'Workshop',
      entityId: workshopId,
      oldValue: { isVerified: false },
      newValue: { isVerified: true },
    });

    return updated;
  }

  // ─── WX-090: Suspender taller ────────────

  async suspendWorkshop(workshopId: string, adminId: string) {
    const workshop = await this.prisma.workshop.findUnique({ where: { id: workshopId } });
    if (!workshop) {
      throw new NotFoundException('Taller no encontrado');
    }

    const updated = await this.prisma.workshop.update({
      where: { id: workshopId },
      data: { isVerified: false, isActive: false },
    });

    await this.audit.log({
      userId: adminId,
      action: 'SUSPEND_WORKSHOP',
      entity: 'Workshop',
      entityId: workshopId,
      oldValue: { isVerified: workshop.isVerified, isActive: workshop.isActive },
      newValue: { isVerified: false, isActive: false },
    });

    return updated;
  }

  // ─── WX-090: Listar proveedores ────────────

  async listSuppliers(query: ListSuppliersQueryDto) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 20;

    const where: Prisma.SupplierWhereInput = {};

    if (query.isVerified !== undefined) {
      where.isVerified = query.isVerified;
    }
    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { city: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where,
        include: {
          admin: { select: { id: true, email: true, firstName: true, lastName: true, status: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.supplier.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ─── WX-090: Verificar proveedor ────────────

  async verifySupplier(supplierId: string, adminId: string) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id: supplierId } });
    if (!supplier) {
      throw new NotFoundException('Proveedor no encontrado');
    }

    if (supplier.isVerified) {
      throw new BadRequestException('El proveedor ya está verificado');
    }

    const updated = await this.prisma.supplier.update({
      where: { id: supplierId },
      data: { isVerified: true },
    });

    await this.audit.log({
      userId: adminId,
      action: 'VERIFY_SUPPLIER',
      entity: 'Supplier',
      entityId: supplierId,
      oldValue: { isVerified: false },
      newValue: { isVerified: true },
    });

    return updated;
  }

  // ─── WX-090: Suspender proveedor ────────────

  async suspendSupplier(supplierId: string, adminId: string) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id: supplierId } });
    if (!supplier) {
      throw new NotFoundException('Proveedor no encontrado');
    }

    const updated = await this.prisma.supplier.update({
      where: { id: supplierId },
      data: { isVerified: false, isActive: false },
    });

    await this.audit.log({
      userId: adminId,
      action: 'SUSPEND_SUPPLIER',
      entity: 'Supplier',
      entityId: supplierId,
      oldValue: { isVerified: supplier.isVerified, isActive: supplier.isActive },
      newValue: { isVerified: false, isActive: false },
    });

    return updated;
  }
}
