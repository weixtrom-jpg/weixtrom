import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto, UpdateVehicleDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Vehicles')
@Controller('vehicles')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class VehiclesController {
  constructor(private vehicles: VehiclesService) {}

  @Post()
  @Roles(Role.CLIENT)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar un vehículo' })
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateVehicleDto,
  ) {
    return this.vehicles.create(userId, dto);
  }

  @Get()
  @Roles(Role.CLIENT)
  @ApiOperation({ summary: 'Listar mis vehículos' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: ['ACTIVE', 'INACTIVE', 'ALL'] })
  findAll(
    @CurrentUser('id') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.vehicles.findAll(userId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      status,
    });
  }

  @Get(':id')
  @Roles(Role.CLIENT)
  @ApiOperation({ summary: 'Detalle de un vehículo' })
  findOne(
    @CurrentUser('id') userId: string,
    @Param('id') vehicleId: string,
  ) {
    return this.vehicles.findOne(userId, vehicleId);
  }

  @Patch(':id')
  @Roles(Role.CLIENT)
  @ApiOperation({ summary: 'Actualizar un vehículo' })
  update(
    @CurrentUser('id') userId: string,
    @Param('id') vehicleId: string,
    @Body() dto: UpdateVehicleDto,
  ) {
    return this.vehicles.update(userId, vehicleId, dto);
  }

  @Patch(':id/inactivate')
  @Roles(Role.CLIENT)
  @ApiOperation({ summary: 'Inactivar un vehículo (soft delete)' })
  inactivate(
    @CurrentUser('id') userId: string,
    @Param('id') vehicleId: string,
  ) {
    return this.vehicles.inactivate(userId, vehicleId);
  }

  @Patch(':id/activate')
  @Roles(Role.CLIENT)
  @ApiOperation({ summary: 'Reactivar un vehículo' })
  activate(
    @CurrentUser('id') userId: string,
    @Param('id') vehicleId: string,
  ) {
    return this.vehicles.activate(userId, vehicleId);
  }
}
