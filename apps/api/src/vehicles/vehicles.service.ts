import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, VehicleStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';

@Injectable()
export class VehiclesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async create(userId: string, dto: CreateVehicleDto) {
    const existing = await this.prisma.vehicle.findUnique({
      where: { ownerId_plate: { ownerId: userId, plate: dto.plate } },
    });

    if (existing) {
      throw new ConflictException(
        'Ya tienes un vehículo registrado con esta placa.',
      );
    }

    try {
      const vehicle = await this.prisma.vehicle.create({
        data: {
          plate: dto.plate,
          brand: dto.brand,
          model: dto.model,
          year: dto.year,
          color: dto.color,
          ownerId: userId,
        },
      });

      await this.audit.log({
        userId,
        action: 'CREATE_VEHICLE',
        entity: 'Vehicle',
        entityId: vehicle.id,
        newValue: { plate: dto.plate, brand: dto.brand, model: dto.model, year: dto.year, color: dto.color },
      });

      return vehicle;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Ya tienes un vehículo registrado con esta placa.',
        );
      }
      throw error;
    }
  }

  async findAll(
    userId: string,
    query: { page?: number; limit?: number; status?: string },
  ) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 10;

    const where: Prisma.VehicleWhereInput = { ownerId: userId };

    if (query.status === 'ALL') {
      // No filter on status
    } else if (query.status === 'INACTIVE') {
      where.status = VehicleStatus.INACTIVE;
    } else {
      // Default: only ACTIVE
      where.status = VehicleStatus.ACTIVE;
    }

    const [data, total] = await Promise.all([
      this.prisma.vehicle.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.vehicle.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(userId: string, vehicleId: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehículo no encontrado');
    }

    if (vehicle.ownerId !== userId) {
      throw new ForbiddenException('No tienes acceso a este vehículo');
    }

    return vehicle;
  }

  async update(userId: string, vehicleId: string, dto: UpdateVehicleDto) {
    const vehicle = await this.findOne(userId, vehicleId);

    const updated = await this.prisma.vehicle.update({
      where: { id: vehicleId },
      data: dto,
    });

    await this.audit.log({
      userId,
      action: 'UPDATE_VEHICLE',
      entity: 'Vehicle',
      entityId: vehicleId,
      oldValue: { brand: vehicle.brand, model: vehicle.model, year: vehicle.year, color: vehicle.color },
      newValue: dto,
    });

    return updated;
  }

  async inactivate(userId: string, vehicleId: string) {
    const vehicle = await this.findOne(userId, vehicleId);

    if (vehicle.status === VehicleStatus.INACTIVE) {
      throw new ConflictException('El vehículo ya está inactivo');
    }

    const updated = await this.prisma.vehicle.update({
      where: { id: vehicleId },
      data: { status: VehicleStatus.INACTIVE },
    });

    await this.audit.log({
      userId,
      action: 'INACTIVATE_VEHICLE',
      entity: 'Vehicle',
      entityId: vehicleId,
      oldValue: { status: VehicleStatus.ACTIVE },
      newValue: { status: VehicleStatus.INACTIVE },
    });

    return updated;
  }

  async activate(userId: string, vehicleId: string) {
    const vehicle = await this.findOne(userId, vehicleId);

    if (vehicle.status === VehicleStatus.ACTIVE) {
      throw new ConflictException('El vehículo ya está activo');
    }

    const updated = await this.prisma.vehicle.update({
      where: { id: vehicleId },
      data: { status: VehicleStatus.ACTIVE },
    });

    await this.audit.log({
      userId,
      action: 'ACTIVATE_VEHICLE',
      entity: 'Vehicle',
      entityId: vehicleId,
      oldValue: { status: VehicleStatus.INACTIVE },
      newValue: { status: VehicleStatus.ACTIVE },
    });

    return updated;
  }

  // ─── WX-035: Historial consolidado ────────────

  async getHistory(
    userId: string,
    vehicleId: string,
    query: {
      type?: 'diagnostic' | 'quotation' | 'workorder' | 'invoice';
      from?: string;
      to?: string;
      page?: number;
      limit?: number;
    },
  ) {
    // 1. Verificar propiedad
    await this.findOne(userId, vehicleId);

    // 2. Parsear filtros de fecha
    const fromDate = query.from ? this.parseDate(query.from) : undefined;
    const toDate = query.to ? this.parseEndOfDay(query.to) : undefined;

    // 3. Consultar en paralelo las tablas relevantes
    const types = query.type ? [query.type] : ['diagnostic', 'quotation', 'workorder', 'invoice'] as const;

    const promises: Promise<HistoryEvent[]>[] = [];

    if (types.includes('diagnostic')) {
      promises.push(this.getDiagnosticEvents(vehicleId, fromDate, toDate));
    }
    if (types.includes('quotation')) {
      promises.push(this.getQuotationEvents(vehicleId, fromDate, toDate));
    }
    if (types.includes('workorder')) {
      promises.push(this.getWorkOrderEvents(vehicleId, fromDate, toDate));
    }
    if (types.includes('invoice')) {
      promises.push(this.getInvoiceEvents(vehicleId, fromDate, toDate));
    }

    const results = await Promise.all(promises);
    const allEvents = results.flat();

    // 4. Ordenar por fecha descendente
    allEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // 5. Paginar
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 20;
    const total = allEvents.length;
    const data = allEvents.slice((page - 1) * limit, page * limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private parseDate(dateStr: string): Date {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      throw new BadRequestException(`Fecha inválida: ${dateStr}. Use formato YYYY-MM-DD.`);
    }
    return d;
  }

  private parseEndOfDay(dateStr: string): Date {
    const d = this.parseDate(dateStr);
    d.setHours(23, 59, 59, 999);
    return d;
  }

  private async getDiagnosticEvents(
    vehicleId: string,
    from?: Date,
    to?: Date,
  ): Promise<HistoryEvent[]> {
    const where: Prisma.DiagnosticRequestWhereInput = { vehicleId };
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = from;
      if (to) where.createdAt.lte = to;
    }

    const diagnostics = await this.prisma.diagnosticRequest.findMany({
      where,
      include: { photos: true, diagnosis: true },
      orderBy: { createdAt: 'desc' },
    });

    return diagnostics.map((d) => ({
      id: d.id,
      type: 'diagnostic' as const,
      title: `Solicitud de diagnóstico: ${d.description.substring(0, 80)}`,
      status: d.status,
      date: d.createdAt,
      data: d as unknown as Record<string, unknown>,
    }));
  }

  private async getQuotationEvents(
    vehicleId: string,
    from?: Date,
    to?: Date,
  ): Promise<HistoryEvent[]> {
    const where: Prisma.QuotationWhereInput = {
      diagnosticRequest: { vehicleId },
    };
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = from;
      if (to) where.createdAt.lte = to;
    }

    const quotations = await this.prisma.quotation.findMany({
      where,
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });

    return quotations.map((q) => ({
      id: q.id,
      type: 'quotation' as const,
      title: `Cotización — Total: $${q.total}`,
      status: q.status,
      date: q.createdAt,
      data: q as unknown as Record<string, unknown>,
    }));
  }

  private async getWorkOrderEvents(
    vehicleId: string,
    from?: Date,
    to?: Date,
  ): Promise<HistoryEvent[]> {
    const where: Prisma.WorkOrderWhereInput = {
      quotation: { diagnosticRequest: { vehicleId } },
    };
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = from;
      if (to) where.createdAt.lte = to;
    }

    const orders = await this.prisma.workOrder.findMany({
      where,
      include: { statusHistory: true },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((o) => ({
      id: o.id,
      type: 'workorder' as const,
      title: `Orden de trabajo${o.observations ? ': ' + o.observations.substring(0, 60) : ''}`,
      status: o.status,
      date: o.createdAt,
      data: o as unknown as Record<string, unknown>,
    }));
  }

  private async getInvoiceEvents(
    vehicleId: string,
    from?: Date,
    to?: Date,
  ): Promise<HistoryEvent[]> {
    const where: Prisma.InvoiceWhereInput = {
      workOrder: { quotation: { diagnosticRequest: { vehicleId } } },
    };
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = from;
      if (to) where.createdAt.lte = to;
    }

    const invoices = await this.prisma.invoice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return invoices.map((inv) => ({
      id: inv.id,
      type: 'invoice' as const,
      title: `Factura — Total: $${inv.total}`,
      status: inv.status,
      date: inv.issuedAt,
      data: inv as unknown as Record<string, unknown>,
    }));
  }
}

export interface HistoryEvent {
  id: string;
  type: 'diagnostic' | 'quotation' | 'workorder' | 'invoice';
  title: string;
  status: string;
  date: Date;
  data: Record<string, unknown>;
}
