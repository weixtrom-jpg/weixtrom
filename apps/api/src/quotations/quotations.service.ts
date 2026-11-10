import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, QuotationStatus, Role, WorkOrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notifications/notification.service';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { AddItemDto } from './dto/add-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';

@Injectable()
export class QuotationsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationService,
  ) {}

  // ─── WX-053: Crear cotizacion ────────────

  async create(workshopAdminId: string, dto: CreateQuotationDto) {
    // Obtener el taller del admin
    const workshop = await this.prisma.workshop.findUnique({
      where: { adminId: workshopAdminId },
    });

    if (!workshop) {
      throw new NotFoundException('No tienes un taller asociado');
    }

    // Validar que la solicitud de diagnostico existe y pertenece al taller
    const diagnosticRequest = await this.prisma.diagnosticRequest.findUnique({
      where: { id: dto.diagnosticRequestId },
    });

    if (!diagnosticRequest) {
      throw new NotFoundException('Solicitud de diagnostico no encontrada');
    }

    if (diagnosticRequest.workshopId !== workshop.id) {
      throw new ForbiddenException(
        'Esta solicitud de diagnostico no pertenece a tu taller',
      );
    }

    // Verificar que no exista ya una cotizacion para esta solicitud
    const existing = await this.prisma.quotation.findUnique({
      where: { diagnosticRequestId: dto.diagnosticRequestId },
    });

    if (existing) {
      throw new ConflictException(
        'Ya existe una cotizacion para esta solicitud de diagnostico',
      );
    }

    const quotation = await this.prisma.quotation.create({
      data: {
        diagnosticRequestId: dto.diagnosticRequestId,
        workshopId: workshop.id,
        status: QuotationStatus.DRAFT,
      },
      include: { items: true, diagnosticRequest: { include: { vehicle: true } } },
    });

    return quotation;
  }

  // ─── WX-053: Listar cotizaciones ────────────

  async findAll(
    userId: string,
    role: Role,
    query: { page?: number; limit?: number; status?: QuotationStatus },
  ) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit =
      query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 10;

    const where: Prisma.QuotationWhereInput = {};

    if (role === Role.CLIENT) {
      where.diagnosticRequest = { clientId: userId };
    } else if (role === Role.WORKSHOP_ADMIN) {
      const workshop = await this.prisma.workshop.findUnique({
        where: { adminId: userId },
      });

      if (!workshop) {
        throw new NotFoundException('No tienes un taller asociado');
      }

      where.workshopId = workshop.id;
    } else if (role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException(
        'No tienes permisos para listar cotizaciones',
      );
    }

    if (query.status) {
      where.status = query.status;
    }

    const [data, total] = await Promise.all([
      this.prisma.quotation.findMany({
        where,
        include: {
          items: true,
          diagnosticRequest: { include: { vehicle: true } },
          workshop: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.quotation.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ─── WX-053: Detalle con items ────────────

  async findOne(id: string, userId: string, role: Role) {
    const quotation = await this.prisma.quotation.findUnique({
      where: { id },
      include: {
        items: true,
        diagnosticRequest: { include: { vehicle: true, client: true } },
        workshop: true,
        workOrder: true,
      },
    });

    if (!quotation) {
      throw new NotFoundException('Cotizacion no encontrada');
    }

    // Validar acceso por rol
    if (
      role === Role.CLIENT &&
      quotation.diagnosticRequest.clientId !== userId
    ) {
      throw new ForbiddenException('No tienes acceso a esta cotizacion');
    }

    if (role === Role.WORKSHOP_ADMIN) {
      const workshop = await this.prisma.workshop.findUnique({
        where: { adminId: userId },
      });
      if (!workshop || quotation.workshopId !== workshop.id) {
        throw new ForbiddenException('No tienes acceso a esta cotizacion');
      }
    }

    return quotation;
  }

  // ─── WX-053 / WX-054: Agregar item ────────────

  async addItem(quotationId: string, workshopAdminId: string, dto: AddItemDto) {
    const quotation = await this.getQuotationForWorkshop(
      quotationId,
      workshopAdminId,
    );

    this.assertMutable(quotation.status);

    const itemTotal = new Prisma.Decimal(dto.quantity).mul(
      new Prisma.Decimal(dto.unitPrice),
    );

    const item = await this.prisma.quotationItem.create({
      data: {
        quotationId,
        type: dto.type,
        description: dto.description,
        quantity: dto.quantity,
        unitPrice: dto.unitPrice,
        total: itemTotal,
        productId: dto.productId,
      },
    });

    await this.recalculateTotals(quotationId);

    return item;
  }

  // ─── WX-053 / WX-054: Editar item ────────────

  async updateItem(
    quotationId: string,
    itemId: string,
    workshopAdminId: string,
    dto: UpdateItemDto,
  ) {
    const quotation = await this.getQuotationForWorkshop(
      quotationId,
      workshopAdminId,
    );

    this.assertMutable(quotation.status);

    // Verificar que el item pertenece a esta cotizacion
    const existingItem = await this.prisma.quotationItem.findFirst({
      where: { id: itemId, quotationId },
    });

    if (!existingItem) {
      throw new NotFoundException('Item no encontrado en esta cotizacion');
    }

    const quantity = dto.quantity ?? existingItem.quantity;
    const unitPrice =
      dto.unitPrice !== undefined
        ? new Prisma.Decimal(dto.unitPrice)
        : existingItem.unitPrice;
    const itemTotal = new Prisma.Decimal(quantity).mul(unitPrice);

    const updated = await this.prisma.quotationItem.update({
      where: { id: itemId },
      data: {
        ...dto,
        total: itemTotal,
      },
    });

    await this.recalculateTotals(quotationId);

    return updated;
  }

  // ─── WX-053 / WX-054: Eliminar item ────────────

  async removeItem(
    quotationId: string,
    itemId: string,
    workshopAdminId: string,
  ) {
    const quotation = await this.getQuotationForWorkshop(
      quotationId,
      workshopAdminId,
    );

    this.assertMutable(quotation.status);

    const existingItem = await this.prisma.quotationItem.findFirst({
      where: { id: itemId, quotationId },
    });

    if (!existingItem) {
      throw new NotFoundException('Item no encontrado en esta cotizacion');
    }

    await this.prisma.quotationItem.delete({ where: { id: itemId } });

    await this.recalculateTotals(quotationId);

    return { message: 'Item eliminado' };
  }

  // ─── WX-053: Enviar cotizacion al cliente ────────────

  async send(quotationId: string, workshopAdminId: string) {
    const quotation = await this.getQuotationForWorkshop(
      quotationId,
      workshopAdminId,
    );

    this.assertMutable(quotation.status);

    if (quotation.status !== QuotationStatus.DRAFT) {
      throw new BadRequestException(
        'Solo se puede enviar una cotizacion en estado borrador',
      );
    }

    const updated = await this.prisma.quotation.update({
      where: { id: quotationId },
      data: { status: QuotationStatus.SENT },
      include: {
        diagnosticRequest: { include: { client: true } },
        workshop: true,
      },
    });

    // Notificar al cliente
    const client = updated.diagnosticRequest.client;
    await this.notifications.createInAppNotification({
      userId: client.id,
      title: 'Nueva cotizacion recibida',
      body: `El taller ${updated.workshop.name} te ha enviado una cotizacion.`,
      type: 'QUOTATION_SENT',
      entityId: quotationId,
    });

    return updated;
  }

  // ─── WX-056: Aprobar cotizacion ────────────

  async approve(quotationId: string, clientId: string) {
    const quotation = await this.prisma.quotation.findUnique({
      where: { id: quotationId },
      include: {
        diagnosticRequest: { include: { vehicle: true } },
        workshop: true,
      },
    });

    if (!quotation) {
      throw new NotFoundException('Cotizacion no encontrada');
    }

    this.assertMutable(quotation.status);

    if (quotation.status !== QuotationStatus.SENT) {
      throw new BadRequestException(
        'Solo se puede aprobar una cotizacion en estado SENT',
      );
    }

    // Solo el dueno del vehiculo puede aprobar
    if (quotation.diagnosticRequest.vehicle.ownerId !== clientId) {
      throw new ForbiddenException(
        'Solo el propietario del vehiculo puede aprobar esta cotizacion',
      );
    }

    // Transaccion atomica: aprobar + crear WorkOrder
    const [updatedQuotation, workOrder] = await this.prisma.$transaction([
      this.prisma.quotation.update({
        where: { id: quotationId },
        data: {
          status: QuotationStatus.APPROVED,
          approvedAt: new Date(),
        },
      }),
      this.prisma.workOrder.create({
        data: {
          quotationId,
          workshopId: quotation.workshopId,
          status: WorkOrderStatus.CREATED,
        },
      }),
    ]);

    // Notificar al taller
    await this.notifications.createInAppNotification({
      userId: quotation.workshop.adminId,
      title: 'Cotizacion aprobada',
      body: 'El cliente ha aprobado la cotizacion. Se ha generado una orden de trabajo.',
      type: 'QUOTATION_APPROVED',
      entityId: quotationId,
    });

    return { ...updatedQuotation, workOrder };
  }

  // ─── WX-056: Rechazar cotizacion ────────────

  async reject(
    quotationId: string,
    clientId: string,
    rejectionReason?: string,
  ) {
    const quotation = await this.prisma.quotation.findUnique({
      where: { id: quotationId },
      include: {
        diagnosticRequest: { include: { vehicle: true } },
        workshop: true,
      },
    });

    if (!quotation) {
      throw new NotFoundException('Cotizacion no encontrada');
    }

    this.assertMutable(quotation.status);

    if (quotation.status !== QuotationStatus.SENT) {
      throw new BadRequestException(
        'Solo se puede rechazar una cotizacion en estado SENT',
      );
    }

    // Solo el dueno del vehiculo puede rechazar
    if (quotation.diagnosticRequest.vehicle.ownerId !== clientId) {
      throw new ForbiddenException(
        'Solo el propietario del vehiculo puede rechazar esta cotizacion',
      );
    }

    const updated = await this.prisma.quotation.update({
      where: { id: quotationId },
      data: {
        status: QuotationStatus.REJECTED,
        rejectedAt: new Date(),
        rejectionReason: rejectionReason || null,
      },
    });

    // Notificar al taller
    await this.notifications.createInAppNotification({
      userId: quotation.workshop.adminId,
      title: 'Cotizacion rechazada',
      body: rejectionReason
        ? `El cliente ha rechazado la cotizacion. Motivo: ${rejectionReason}`
        : 'El cliente ha rechazado la cotizacion.',
      type: 'QUOTATION_REJECTED',
      entityId: quotationId,
    });

    return updated;
  }

  // ─── WX-057: Comentario del cliente ────────────

  async addComment(quotationId: string, clientId: string, comment: string) {
    const quotation = await this.prisma.quotation.findUnique({
      where: { id: quotationId },
      include: {
        diagnosticRequest: { include: { vehicle: true } },
        workshop: true,
      },
    });

    if (!quotation) {
      throw new NotFoundException('Cotizacion no encontrada');
    }

    this.assertMutable(quotation.status);

    if (quotation.status !== QuotationStatus.SENT) {
      throw new BadRequestException(
        'Solo se puede comentar una cotizacion enviada',
      );
    }

    // Solo el dueno del vehiculo puede comentar
    if (quotation.diagnosticRequest.vehicle.ownerId !== clientId) {
      throw new ForbiddenException(
        'Solo el propietario del vehiculo puede comentar esta cotizacion',
      );
    }

    const updated = await this.prisma.quotation.update({
      where: { id: quotationId },
      data: { clientComment: comment },
    });

    // Notificar al taller
    await this.notifications.createInAppNotification({
      userId: quotation.workshop.adminId,
      title: 'Comentario en cotizacion',
      body: `El cliente ha dejado un comentario: "${comment.substring(0, 100)}${comment.length > 100 ? '...' : ''}"`,
      type: 'QUOTATION_COMMENT',
      entityId: quotationId,
    });

    return updated;
  }

  // ─── Helpers privados ────────────

  /** WX-055: Inmutabilidad — lanza 409 si la cotizacion esta APPROVED o REJECTED */
  private assertMutable(status: QuotationStatus): void {
    if (
      status === QuotationStatus.APPROVED ||
      status === QuotationStatus.REJECTED
    ) {
      throw new ConflictException(
        `No se puede modificar una cotizacion en estado ${status}`,
      );
    }
  }

  /** Obtener cotizacion validando que pertenece al taller del admin */
  private async getQuotationForWorkshop(
    quotationId: string,
    workshopAdminId: string,
  ) {
    const workshop = await this.prisma.workshop.findUnique({
      where: { adminId: workshopAdminId },
    });

    if (!workshop) {
      throw new NotFoundException('No tienes un taller asociado');
    }

    const quotation = await this.prisma.quotation.findUnique({
      where: { id: quotationId },
    });

    if (!quotation) {
      throw new NotFoundException('Cotizacion no encontrada');
    }

    if (quotation.workshopId !== workshop.id) {
      throw new ForbiddenException('Esta cotizacion no pertenece a tu taller');
    }

    return quotation;
  }

  /** WX-054: Recalcular subtotal, tax (19%) y total */
  private async recalculateTotals(quotationId: string): Promise<void> {
    const items = await this.prisma.quotationItem.findMany({
      where: { quotationId },
    });

    let subtotal = new Prisma.Decimal(0);
    for (const item of items) {
      subtotal = subtotal.add(item.total);
    }

    const tax = subtotal.mul(new Prisma.Decimal('0.19'));
    const total = subtotal.add(tax);

    await this.prisma.quotation.update({
      where: { id: quotationId },
      data: { subtotal, tax, total },
    });
  }
}
