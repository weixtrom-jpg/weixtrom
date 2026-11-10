import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma, DiagnosticRequestStatus, Role, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationService } from '../notifications/notification.service';
import { CreateDiagnosticRequestDto } from './dto/create-diagnostic-request.dto';
import { DiagnoseDto } from './dto/diagnose.dto';

@Injectable()
export class DiagnosticsService {
  private logger = new Logger(DiagnosticsService.name);

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private notifications: NotificationService,
  ) {}

  // ─── WX-044 / RF-014: Crear solicitud de diagnóstico ────────────

  async create(clientId: string, dto: CreateDiagnosticRequestDto) {
    // Validar que el vehículo existe y pertenece al cliente
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: dto.vehicleId },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehículo no encontrado');
    }

    if (vehicle.ownerId !== clientId) {
      throw new ForbiddenException('No puedes solicitar diagnóstico para un vehículo que no te pertenece');
    }

    const request = await this.prisma.diagnosticRequest.create({
      data: {
        vehicleId: dto.vehicleId,
        clientId,
        description: dto.description,
        status: DiagnosticRequestStatus.PENDING,
      },
      include: { vehicle: true },
    });

    await this.audit.log({
      userId: clientId,
      action: 'CREATE_DIAGNOSTIC_REQUEST',
      entity: 'DiagnosticRequest',
      entityId: request.id,
      newValue: { vehicleId: dto.vehicleId, description: dto.description },
    });

    // WX-045: Notificar a talleres verificados y activos (fire-and-forget)
    this.notifyVerifiedWorkshops(dto.description).catch(() => {});

    return request;
  }

  // ─── HU-08 / HU-09: Listar solicitudes según rol ────────────

  async findAll(
    userId: string,
    role: Role,
    query: { page?: number; limit?: number; status?: DiagnosticRequestStatus },
  ) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 10;

    const where: Prisma.DiagnosticRequestWhereInput = {};

    // Filtro por rol
    if (role === Role.CLIENT) {
      where.clientId = userId;
    } else if (role === Role.WORKSHOP_ADMIN) {
      // Obtener el taller del admin
      const workshop = await this.prisma.workshop.findUnique({
        where: { adminId: userId },
      });

      if (!workshop) {
        throw new NotFoundException('No tienes un taller asociado');
      }

      // Ver las PENDING (disponibles) + las que su taller ya tomó
      where.OR = [
        { status: DiagnosticRequestStatus.PENDING },
        { workshopId: workshop.id },
      ];
    } else if (role !== Role.SUPER_ADMIN) {
      // Roles no contemplados no ven nada
      throw new ForbiddenException('No tienes permisos para listar solicitudes de diagnóstico');
    }
    // SUPER_ADMIN: sin filtro, ve todas

    // Filtro por status (se aplica sobre el filtro de rol)
    if (query.status) {
      if (where.OR) {
        // Para WORKSHOP_ADMIN con filtro de status, ajustar la lógica
        where.AND = [
          { OR: where.OR },
          { status: query.status },
        ];
        delete where.OR;
      } else {
        where.status = query.status;
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.diagnosticRequest.findMany({
        where,
        include: {
          vehicle: true,
          diagnosis: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.diagnosticRequest.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ─── Detalle de solicitud ────────────

  async findOne(id: string, userId: string, role: Role) {
    const request = await this.prisma.diagnosticRequest.findUnique({
      where: { id },
      include: {
        vehicle: true,
        photos: true,
        diagnosis: true,
      },
    });

    if (!request) {
      throw new NotFoundException('Solicitud de diagnóstico no encontrada');
    }

    // Validar acceso por rol
    if (role === Role.CLIENT && request.clientId !== userId) {
      throw new ForbiddenException('No tienes acceso a esta solicitud');
    }

    if (role === Role.WORKSHOP_ADMIN) {
      const workshop = await this.prisma.workshop.findUnique({
        where: { adminId: userId },
      });

      // El taller puede ver solicitudes PENDING (potenciales) o las que ya tomó
      const isAssigned = workshop && request.workshopId === workshop.id;
      const isPending = request.status === DiagnosticRequestStatus.PENDING;

      if (!isPending && !isAssigned) {
        throw new ForbiddenException('No tienes acceso a esta solicitud');
      }
    } else if (role !== Role.CLIENT && role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('No tienes acceso a esta solicitud');
    }

    return request;
  }

  // ─── WX-046 / RF-016: Taller toma solicitud ────────────

  async take(requestId: string, workshopAdminId: string) {
    // Buscar el taller del admin
    const workshop = await this.prisma.workshop.findUnique({
      where: { adminId: workshopAdminId },
    });

    if (!workshop) {
      throw new NotFoundException('No tienes un taller asociado');
    }

    // CRITICO: Control de concurrencia atómico.
    // updateMany con condición status=PENDING y workshopId=null.
    // Si otro taller ya la tomó, count será 0.
    const result = await this.prisma.diagnosticRequest.updateMany({
      where: {
        id: requestId,
        status: DiagnosticRequestStatus.PENDING,
        workshopId: null,
      },
      data: {
        workshopId: workshop.id,
        status: DiagnosticRequestStatus.TAKEN,
        takenAt: new Date(),
      },
    });

    if (result.count === 0) {
      // Verificar si existe para dar un mensaje apropiado
      const existing = await this.prisma.diagnosticRequest.findUnique({
        where: { id: requestId },
      });

      if (!existing) {
        throw new NotFoundException('Solicitud de diagnóstico no encontrada');
      }

      throw new ConflictException(
        'Esta solicitud ya fue tomada por otro taller o no está disponible',
      );
    }

    // Recuperar el registro actualizado para retornarlo
    const updated = await this.prisma.diagnosticRequest.findUnique({
      where: { id: requestId },
      include: { vehicle: true, workshop: true },
    });

    await this.audit.log({
      userId: workshopAdminId,
      action: 'TAKE_DIAGNOSTIC_REQUEST',
      entity: 'DiagnosticRequest',
      entityId: requestId,
      newValue: { workshopId: workshop.id, status: DiagnosticRequestStatus.TAKEN },
    });

    return updated;
  }

  // ─── WX-047 / RF-017: Registrar resultado del diagnóstico ────────────

  async diagnose(requestId: string, workshopAdminId: string, dto: DiagnoseDto) {
    // Buscar el taller del admin
    const workshop = await this.prisma.workshop.findUnique({
      where: { adminId: workshopAdminId },
    });

    if (!workshop) {
      throw new NotFoundException('No tienes un taller asociado');
    }

    // Validar que la solicitud existe, está en TAKEN y pertenece al taller del admin
    const request = await this.prisma.diagnosticRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Solicitud de diagnóstico no encontrada');
    }

    if (request.status !== DiagnosticRequestStatus.TAKEN) {
      throw new BadRequestException(
        `No se puede diagnosticar una solicitud en estado ${request.status}. Debe estar en TAKEN.`,
      );
    }

    if (request.workshopId !== workshop.id) {
      throw new ForbiddenException('Esta solicitud no pertenece a tu taller');
    }

    // Crear el diagnóstico y actualizar el estado en una transacción
    const [diagnosis] = await this.prisma.$transaction([
      this.prisma.diagnosis.create({
        data: {
          diagnosticRequestId: requestId,
          findings: dto.findings,
          recommendation: dto.recommendation,
        },
      }),
      this.prisma.diagnosticRequest.update({
        where: { id: requestId },
        data: {
          status: DiagnosticRequestStatus.DIAGNOSED,
          diagnosedAt: new Date(),
        },
      }),
    ]);

    await this.audit.log({
      userId: workshopAdminId,
      action: 'DIAGNOSE_REQUEST',
      entity: 'DiagnosticRequest',
      entityId: requestId,
      newValue: { findings: dto.findings, recommendation: dto.recommendation },
    });

    // Retornar la solicitud completa con el diagnóstico
    return this.prisma.diagnosticRequest.findUnique({
      where: { id: requestId },
      include: { vehicle: true, diagnosis: true, photos: true },
    });
  }

  // ─── WX-045: Notificar talleres verificados y activos ────────────

  async notifyVerifiedWorkshops(description: string) {
    try {
      const workshops = await this.prisma.workshop.findMany({
        where: {
          isVerified: true,
          isActive: true,
          admin: { status: UserStatus.ACTIVE },
        },
        include: { admin: { select: { email: true, firstName: true, status: true } } },
      });

      const results = await Promise.allSettled(
        workshops.map((ws) =>
          this.notifications.sendNewDiagnosticRequestEmail(
            ws.admin.email,
            ws.name,
            description,
          ),
        ),
      );

      const failed = results.filter((r) => r.status === 'rejected').length;
      if (failed > 0) {
        this.logger.warn(
          `WX-045: ${failed}/${workshops.length} notificaciones a talleres fallaron`,
        );
      }
    } catch (error) {
      // No bloquear la creación de la solicitud si falla la notificación
      this.logger.error('WX-045: Error al notificar talleres', error);
    }
  }

  // ─── WX-048: Reenvío de notificación tras 24h sin respuesta ────────────

  @Cron(CronExpression.EVERY_HOUR)
  async handleResendNotifications() {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Buscar solicitudes PENDING creadas hace >24h que no han sido reenviadas
    const staleRequests = await this.prisma.diagnosticRequest.findMany({
      where: {
        status: DiagnosticRequestStatus.PENDING,
        createdAt: { lt: twentyFourHoursAgo },
        lastResendAt: null,
      },
    });

    if (staleRequests.length === 0) return;

    this.logger.log(`WX-048: ${staleRequests.length} solicitudes pendientes >24h, reenviando notificaciones`);

    for (const request of staleRequests) {
      try {
        await this.notifyVerifiedWorkshops(request.description);

        await this.prisma.diagnosticRequest.update({
          where: { id: request.id },
          data: {
            resendCount: { increment: 1 },
            lastResendAt: new Date(),
          },
        });
      } catch (error) {
        this.logger.error(`WX-048: Error al reenviar notificación para solicitud ${request.id}`, error);
      }
    }
  }
}
