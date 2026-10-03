import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { VehiclesService } from '../vehicles/vehicles.service';
import { CreateLegalObligationDto } from './dto/create-legal-obligation.dto';
import { UpdateLegalObligationDto } from './dto/update-legal-obligation.dto';

@Injectable()
export class LegalObligationsService {
  private readonly logger = new Logger(LegalObligationsService.name);
  private readonly alertDays: number[];

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private vehicles: VehiclesService,
    private config: ConfigService,
  ) {
    this.alertDays = this.parseAlertDays(
      this.config.get<string>('LEGAL_ALERT_DAYS'),
    );
    this.logger.log(`Alert days configured: [${this.alertDays.join(', ')}]`);
  }

  // ─── WX-091: Parsear configuracion de dias de alerta ────────

  private parseAlertDays(raw?: string): number[] {
    const DEFAULT_DAYS = [30, 15, 5];

    if (!raw || raw.trim() === '') {
      return DEFAULT_DAYS;
    }

    const parsed = raw
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && n > 0);

    if (parsed.length === 0) {
      this.logger.warn(
        `LEGAL_ALERT_DAYS invalido: "${raw}". Usando default [${DEFAULT_DAYS.join(', ')}]`,
      );
      return DEFAULT_DAYS;
    }

    return parsed.sort((a, b) => b - a); // mayor a menor
  }

  // ─── WX-036: CRUD de obligaciones legales ────────

  async create(userId: string, vehicleId: string, dto: CreateLegalObligationDto) {
    // 1. Verificar ownership
    await this.vehicles.findOne(userId, vehicleId);

    // 2. Validar fecha futura
    const expiryDate = new Date(dto.expiryDate);
    this.validateFutureDate(expiryDate);

    // 3. Verificar unique constraint
    const existing = await this.prisma.legalObligation.findUnique({
      where: { vehicleId_type: { vehicleId, type: dto.type } },
    });

    if (existing) {
      throw new ConflictException(
        `Ya existe una obligacion ${dto.type} para este vehiculo.`,
      );
    }

    // 4. Crear obligacion
    try {
      const obligation = await this.prisma.legalObligation.create({
        data: {
          vehicleId,
          type: dto.type,
          expiryDate,
        },
      });

      // 5. Generar hitos de alerta (WX-037)
      await this.generateAlertMilestones(obligation.id, expiryDate);

      // 6. Auditar
      await this.audit.log({
        userId,
        action: 'CREATE_LEGAL_OBLIGATION',
        entity: 'LegalObligation',
        entityId: obligation.id,
        newValue: { type: dto.type, expiryDate: dto.expiryDate, vehicleId },
      });

      // 7. Devolver con alertas
      return this.prisma.legalObligation.findUnique({
        where: { id: obligation.id },
        include: { alerts: { orderBy: { daysBeforeDue: 'desc' } } },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `Ya existe una obligacion ${dto.type} para este vehiculo.`,
        );
      }
      throw error;
    }
  }

  async findAll(
    userId: string,
    vehicleId: string,
    query: { page?: number; limit?: number },
  ) {
    // Verificar ownership
    await this.vehicles.findOne(userId, vehicleId);

    const page = query.page && query.page > 0 ? query.page : 1;
    const limit =
      query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 10;

    const where: Prisma.LegalObligationWhereInput = { vehicleId };

    const [data, total] = await Promise.all([
      this.prisma.legalObligation.findMany({
        where,
        include: {
          alerts: { orderBy: { daysBeforeDue: 'desc' } },
        },
        orderBy: { expiryDate: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.legalObligation.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(userId: string, vehicleId: string, id: string) {
    // Verificar ownership
    await this.vehicles.findOne(userId, vehicleId);

    const obligation = await this.prisma.legalObligation.findUnique({
      where: { id },
      include: {
        alerts: { orderBy: { daysBeforeDue: 'desc' } },
        vehicle: { select: { id: true, plate: true, brand: true, model: true } },
      },
    });

    if (!obligation) {
      throw new NotFoundException('Obligacion legal no encontrada');
    }

    if (obligation.vehicleId !== vehicleId) {
      throw new NotFoundException('Obligacion legal no encontrada');
    }

    return obligation;
  }

  // ─── WX-039: Actualizar (renovar) ────────

  async update(
    userId: string,
    vehicleId: string,
    id: string,
    dto: UpdateLegalObligationDto,
  ) {
    // Verificar ownership y existencia
    const obligation = await this.findOne(userId, vehicleId, id);

    if (!dto.expiryDate) {
      throw new BadRequestException('Debe enviar la nueva fecha de vencimiento');
    }

    const newExpiryDate = new Date(dto.expiryDate);
    this.validateFutureDate(newExpiryDate);

    const oldExpiryDate = obligation.expiryDate;

    // 1. Actualizar la obligacion
    const updated = await this.prisma.legalObligation.update({
      where: { id },
      data: { expiryDate: newExpiryDate },
    });

    // 2. Eliminar TODAS las alertas para liberar el unique constraint
    await this.prisma.legalAlert.deleteMany({
      where: { obligationId: id },
    });

    // 3. Regenerar hitos con la nueva fecha
    await this.generateAlertMilestones(id, newExpiryDate);

    // 4. Auditar
    await this.audit.log({
      userId,
      action: 'RENEW_LEGAL_OBLIGATION',
      entity: 'LegalObligation',
      entityId: id,
      oldValue: { expiryDate: oldExpiryDate.toISOString() },
      newValue: { expiryDate: dto.expiryDate },
    });

    // 5. Devolver actualizado con alertas
    return this.prisma.legalObligation.findUnique({
      where: { id },
      include: { alerts: { where: { cancelled: false }, orderBy: { daysBeforeDue: 'desc' } } },
    });
  }

  async remove(userId: string, vehicleId: string, id: string) {
    // Verificar ownership y existencia
    const obligation = await this.findOne(userId, vehicleId, id);

    // Cancelar alertas pendientes antes del cascade delete
    await this.prisma.legalAlert.updateMany({
      where: {
        obligationId: id,
        sentAt: null,
        cancelled: false,
      },
      data: { cancelled: true },
    });

    // Eliminar (cascade elimina las alertas por onDelete: Cascade en schema)
    await this.prisma.legalObligation.delete({ where: { id } });

    // Auditar
    await this.audit.log({
      userId,
      action: 'DELETE_LEGAL_OBLIGATION',
      entity: 'LegalObligation',
      entityId: id,
      oldValue: {
        type: obligation.type,
        expiryDate: obligation.expiryDate.toISOString(),
        vehicleId,
      },
    });

    return { message: 'Obligacion legal eliminada correctamente' };
  }

  // ─── WX-037: Generacion de hitos de alerta ────────

  private async generateAlertMilestones(
    obligationId: string,
    expiryDate: Date,
  ): Promise<void> {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const alertsToCreate: { obligationId: string; daysBeforeDue: number }[] = [];

    for (const days of this.alertDays) {
      const sendDate = new Date(expiryDate);
      sendDate.setDate(sendDate.getDate() - days);
      sendDate.setHours(0, 0, 0, 0);

      // Solo crear si la fecha de envio no ha pasado
      if (sendDate >= now) {
        alertsToCreate.push({ obligationId, daysBeforeDue: days });
      }
    }

    if (alertsToCreate.length > 0) {
      await this.prisma.legalAlert.createMany({
        data: alertsToCreate,
        skipDuplicates: true,
      });
    }

    this.logger.log(
      `Generated ${alertsToCreate.length} alert milestones for obligation ${obligationId}`,
    );
  }

  // ─── Utilidades ────────

  private validateFutureDate(date: Date): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (date <= today) {
      throw new BadRequestException(
        'La fecha de vencimiento debe ser una fecha futura',
      );
    }
  }
}
