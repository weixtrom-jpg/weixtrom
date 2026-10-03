import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { LegalObligationsService } from './legal-obligations.service';
import { CreateLegalObligationDto, UpdateLegalObligationDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Legal Obligations')
@Controller('vehicles/:vehicleId/legal-obligations')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class LegalObligationsController {
  constructor(private legalObligations: LegalObligationsService) {}

  @Post()
  @Roles(Role.CLIENT)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear obligacion legal para un vehiculo' })
  @ApiParam({ name: 'vehicleId', description: 'ID del vehiculo' })
  create(
    @CurrentUser('id') userId: string,
    @Param('vehicleId') vehicleId: string,
    @Body() dto: CreateLegalObligationDto,
  ) {
    return this.legalObligations.create(userId, vehicleId, dto);
  }

  @Get()
  @Roles(Role.CLIENT)
  @ApiOperation({ summary: 'Listar obligaciones legales de un vehiculo' })
  @ApiParam({ name: 'vehicleId', description: 'ID del vehiculo' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @CurrentUser('id') userId: string,
    @Param('vehicleId') vehicleId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.legalObligations.findAll(userId, vehicleId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':id')
  @Roles(Role.CLIENT)
  @ApiOperation({ summary: 'Detalle de una obligacion legal con sus alertas' })
  @ApiParam({ name: 'vehicleId', description: 'ID del vehiculo' })
  @ApiParam({ name: 'id', description: 'ID de la obligacion legal' })
  findOne(
    @CurrentUser('id') userId: string,
    @Param('vehicleId') vehicleId: string,
    @Param('id') id: string,
  ) {
    return this.legalObligations.findOne(userId, vehicleId, id);
  }

  @Patch(':id')
  @Roles(Role.CLIENT)
  @ApiOperation({ summary: 'Renovar obligacion legal (actualizar fecha de vencimiento)' })
  @ApiParam({ name: 'vehicleId', description: 'ID del vehiculo' })
  @ApiParam({ name: 'id', description: 'ID de la obligacion legal' })
  update(
    @CurrentUser('id') userId: string,
    @Param('vehicleId') vehicleId: string,
    @Param('id') id: string,
    @Body() dto: UpdateLegalObligationDto,
  ) {
    return this.legalObligations.update(userId, vehicleId, id, dto);
  }

  @Delete(':id')
  @Roles(Role.CLIENT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar obligacion legal' })
  @ApiParam({ name: 'vehicleId', description: 'ID del vehiculo' })
  @ApiParam({ name: 'id', description: 'ID de la obligacion legal' })
  remove(
    @CurrentUser('id') userId: string,
    @Param('vehicleId') vehicleId: string,
    @Param('id') id: string,
  ) {
    return this.legalObligations.remove(userId, vehicleId, id);
  }
}
