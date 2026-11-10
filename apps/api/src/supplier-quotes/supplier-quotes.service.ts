import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  Prisma,
  Role,
  SupplierQuoteRequestStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationService } from '../notifications/notification.service';
import { CreateSupplierQuoteRequestDto } from './dto/create-supplier-quote-request.dto';
import { RespondSupplierQuoteDto } from './dto/respond-supplier-quote.dto';

@Injectable()
export class SupplierQuotesService {
  private logger = new Logger(SupplierQuotesService.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private notifications: NotificationService,
  ) {}

  // ─── WX-060: Crear solicitud de cotización a proveedores ────────────

  async create(userId: string, dto: CreateSupplierQuoteRequestDto) {
    // Buscar el taller del WORKSHOP_ADMIN
    const workshop = await this.prisma.workshop.findUnique({
      where: { adminId: userId },
    });

    if (!workshop) {
      throw new NotFoundException('No tienes un taller asociado');
    }

    // Validar que los proveedores existan y estén activos
    const suppliers = await this.prisma.supplier.findMany({
      where: {
        id: { in: dto.supplierIds },
        isActive: true,
      },
    });

    if (suppliers.length !== dto.supplierIds.length) {
      const foundIds = suppliers.map((s) => s.id);
      const missing = dto.supplierIds.filter((id) => !foundIds.includes(id));
      throw new BadRequestException(
        `Proveedores no encontrados o inactivos: ${missing.join(', ')}`,
      );
    }

    // Crear la solicitud con expiresAt = now() + 48h
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const request = await this.prisma.supplierQuoteRequest.create({
      data: {
        workshopId: workshop.id,
        partName: dto.partName,
        quantity: dto.quantity,
        supplierIds: dto.supplierIds,
        status: SupplierQuoteRequestStatus.PENDING,
        expiresAt,
      },
    });

    // Guardar los supplierIds como metadata en el JSON
    // Nota: Los supplierIds se rastrean a través de las responses esperadas.
    // Almacenamos en audit log para trazabilidad.

    await this.audit.log({
      userId,
      action: 'CREATE_SUPPLIER_QUOTE_REQUEST',
      entity: 'SupplierQuoteRequest',
      entityId: request.id,
      newValue: {
        partName: dto.partName,
        quantity: dto.quantity,
        supplierIds: dto.supplierIds,
        expiresAt: expiresAt.toISOString(),
      },
    });

    // Notificar a cada proveedor (fire-and-forget)
    this.notifySuppliers(suppliers, request.id, dto.partName).catch(
      (err) => this.logger.error('Error notificando proveedores', err),
    );

    return {
      ...request,
      supplierIds: dto.supplierIds,
      expectedResponses: dto.supplierIds.length,
    };
  }

  // ─── WX-060: Listar solicitudes (filtro por rol) ────────────

  async findAll(
    userId: string,
    role: Role,
    query: { page?: number; limit?: number; status?: SupplierQuoteRequestStatus },
  ) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 10;

    const where: Prisma.SupplierQuoteRequestWhereInput = {};

    if (role === Role.WORKSHOP_ADMIN) {
      const workshop = await this.prisma.workshop.findUnique({
        where: { adminId: userId },
      });
      if (!workshop) {
        throw new NotFoundException('No tienes un taller asociado');
      }
      where.workshopId = workshop.id;
    } else if (role === Role.SUPPLIER_ADMIN) {
      const supplier = await this.prisma.supplier.findUnique({
        where: { adminId: userId },
      });
      if (!supplier) {
        throw new NotFoundException('No tienes un proveedor asociado');
      }
      // Solicitudes donde este proveedor fue invitado (pendientes y respondidas)
      where.supplierIds = { has: supplier.id };
    } else if (role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('No tienes permisos para listar solicitudes de cotización');
    }

    if (query.status) {
      where.status = query.status;
    }

    const [data, total] = await Promise.all([
      this.prisma.supplierQuoteRequest.findMany({
        where,
        include: {
          responses: {
            include: { supplier: { select: { id: true, name: true } } },
          },
          workshop: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.supplierQuoteRequest.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ─── WX-060: Detalle con respuestas ────────────

  async findOne(id: string, userId: string, role: Role) {
    const request = await this.prisma.supplierQuoteRequest.findUnique({
      where: { id },
      include: {
        responses: {
          include: {
            supplier: { select: { id: true, name: true } },
            product: { select: { id: true, name: true, price: true } },
          },
        },
        workshop: { select: { id: true, name: true } },
      },
    });

    if (!request) {
      throw new NotFoundException('Solicitud de cotización no encontrada');
    }

    // Validar acceso por rol
    if (role === Role.WORKSHOP_ADMIN) {
      const workshop = await this.prisma.workshop.findUnique({
        where: { adminId: userId },
      });
      if (!workshop || request.workshopId !== workshop.id) {
        throw new ForbiddenException('No tienes acceso a esta solicitud');
      }
    } else if (role === Role.SUPPLIER_ADMIN) {
      const supplier = await this.prisma.supplier.findUnique({
        where: { adminId: userId },
      });
      if (!supplier) {
        throw new ForbiddenException('No tienes acceso a esta solicitud');
      }
      // Verificar que el proveedor fue invitado a esta solicitud
      const wasInvited = request.supplierIds?.includes(supplier.id);
      if (!wasInvited) {
        throw new ForbiddenException('No tienes acceso a esta solicitud');
      }
    } else if (role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('No tienes acceso a esta solicitud');
    }

    return request;
  }

  // ─── WX-060: Responder solicitud de cotización ────────────

  async respond(requestId: string, userId: string, dto: RespondSupplierQuoteDto) {
    // Buscar el proveedor del SUPPLIER_ADMIN
    const supplier = await this.prisma.supplier.findUnique({
      where: { adminId: userId },
    });

    if (!supplier) {
      throw new NotFoundException('No tienes un proveedor asociado');
    }

    // Buscar la solicitud
    const request = await this.prisma.supplierQuoteRequest.findUnique({
      where: { id: requestId },
      include: { responses: true },
    });

    if (!request) {
      throw new NotFoundException('Solicitud de cotización no encontrada');
    }

    // 🔴 #2 — Verificar que el proveedor fue invitado
    if (!request.supplierIds.includes(supplier.id)) {
      throw new ForbiddenException('No fuiste invitado a esta solicitud');
    }

    // Verificar que no ha expirado por status
    if (request.status === SupplierQuoteRequestStatus.EXPIRED) {
      throw new BadRequestException('Esta solicitud ha expirado');
    }

    // 🟠 #5 — Verificar expiración por fecha real (el cron corre cada hora)
    if (new Date(request.expiresAt) < new Date()) {
      throw new BadRequestException('Esta solicitud ha expirado');
    }

    if (request.status === SupplierQuoteRequestStatus.FULLY_RESPONDED) {
      throw new BadRequestException('Esta solicitud ya tiene todas las respuestas');
    }

    // Verificar que el proveedor no haya respondido ya (unique constraint respaldado por BD)
    const existingResponse = request.responses.find(
      (r) => r.supplierId === supplier.id,
    );
    if (existingResponse) {
      throw new ConflictException('Ya respondiste a esta solicitud');
    }

    // 🟠 #4 — Transacción: crear response + actualizar status atómicamente
    const { response, newStatus } = await this.prisma.$transaction(async (tx) => {
      const createdResponse = await tx.supplierQuoteResponse.create({
        data: {
          requestId,
          supplierId: supplier.id,
          price: dto.price,
          deliveryDays: dto.deliveryDays,
          productId: dto.productId,
        },
        include: {
          supplier: { select: { id: true, name: true } },
        },
      });

      // 🔴 #1 — Usar supplierIds del modelo en vez del audit log
      const totalResponses = request.responses.length + 1;
      const expectedResponses = request.supplierIds.length;

      let status: SupplierQuoteRequestStatus;
      if (totalResponses >= expectedResponses) {
        status = SupplierQuoteRequestStatus.FULLY_RESPONDED;
      } else {
        status = SupplierQuoteRequestStatus.PARTIALLY_RESPONDED;
      }

      if (status !== request.status) {
        await tx.supplierQuoteRequest.update({
          where: { id: requestId },
          data: { status },
        });
      }

      return { response: createdResponse, newStatus: status };
    });

    await this.audit.log({
      userId,
      action: 'RESPOND_SUPPLIER_QUOTE',
      entity: 'SupplierQuoteResponse',
      entityId: response.id,
      newValue: {
        requestId,
        price: dto.price,
        deliveryDays: dto.deliveryDays,
        productId: dto.productId,
      },
    });

    return {
      ...response,
      requestStatus: newStatus,
    };
  }

  // ─── WX-061: Marcar solicitudes expiradas (cron cada hora) ────────────

  @Cron('0 */1 * * *')
  async handleExpiredRequests() {
    await this.expireStaleRequests();
  }

  /**
   * Método público para testear sin esperar al cron.
   * Busca requests con expiresAt < now() y status PENDING o PARTIALLY_RESPONDED,
   * y los marca como EXPIRED.
   */
  async expireStaleRequests(): Promise<number> {
    const now = new Date();

    const result = await this.prisma.supplierQuoteRequest.updateMany({
      where: {
        expiresAt: { lt: now },
        status: {
          in: [
            SupplierQuoteRequestStatus.PENDING,
            SupplierQuoteRequestStatus.PARTIALLY_RESPONDED,
          ],
        },
      },
      data: {
        status: SupplierQuoteRequestStatus.EXPIRED,
      },
    });

    if (result.count > 0) {
      this.logger.log(
        `WX-061: ${result.count} solicitudes de cotización marcadas como EXPIRED`,
      );
    }

    return result.count;
  }

  // ─── Notificar proveedores (in-app) ────────────

  private async notifySuppliers(
    suppliers: Array<{ id: string; adminId: string; name: string }>,
    requestId: string,
    partName: string,
  ) {
    try {
      await Promise.allSettled(
        suppliers.map((s) =>
          this.notifications.createInAppNotification({
            userId: s.adminId,
            title: 'Nueva solicitud de cotización',
            body: `Un taller solicita cotización para: ${partName}`,
            type: 'SUPPLIER_QUOTE_REQUEST',
            entityId: requestId,
          }),
        ),
      );
    } catch (error) {
      this.logger.error('Error al notificar proveedores', error);
    }
  }
}
