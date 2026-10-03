import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
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
}
