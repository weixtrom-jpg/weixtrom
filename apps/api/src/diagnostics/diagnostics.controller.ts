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
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { DiagnosticsService } from './diagnostics.service';
import {
  CreateDiagnosticRequestDto,
  DiagnoseDto,
  ListDiagnosticsQueryDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Diagnostics')
@Controller('diagnostics')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class DiagnosticsController {
  constructor(private diagnostics: DiagnosticsService) {}

  @Post()
  @Roles(Role.CLIENT)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear solicitud de diagnóstico' })
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateDiagnosticRequestDto,
  ) {
    return this.diagnostics.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar solicitudes de diagnóstico según rol' })
  findAll(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Query() query: ListDiagnosticsQueryDto,
  ) {
    return this.diagnostics.findAll(userId, role, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de una solicitud de diagnóstico' })
  findOne(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Param('id') id: string,
  ) {
    return this.diagnostics.findOne(id, userId, role);
  }

  @Patch(':id/take')
  @Roles(Role.WORKSHOP_ADMIN)
  @ApiOperation({ summary: 'Taller toma una solicitud de diagnóstico' })
  take(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.diagnostics.take(id, userId);
  }

  @Patch(':id/diagnose')
  @Roles(Role.WORKSHOP_ADMIN)
  @ApiOperation({ summary: 'Registrar resultado del diagnóstico' })
  diagnose(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: DiagnoseDto,
  ) {
    return this.diagnostics.diagnose(id, userId, dto);
  }
}
