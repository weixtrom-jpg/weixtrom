import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { SupplierQuotesService } from './supplier-quotes.service';
import {
  CreateSupplierQuoteRequestDto,
  RespondSupplierQuoteDto,
  ListSupplierQuotesQueryDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Supplier Quotes')
@Controller('supplier-quotes')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SupplierQuotesController {
  constructor(private supplierQuotes: SupplierQuotesService) {}

  @Post('requests')
  @Roles(Role.WORKSHOP_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear solicitud de cotización a proveedores' })
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateSupplierQuoteRequestDto,
  ) {
    return this.supplierQuotes.create(userId, dto);
  }

  @Get('requests')
  @Roles(Role.WORKSHOP_ADMIN, Role.SUPPLIER_ADMIN)
  @ApiOperation({ summary: 'Listar solicitudes de cotización' })
  findAll(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Query() query: ListSupplierQuotesQueryDto,
  ) {
    return this.supplierQuotes.findAll(userId, role, query);
  }

  @Get('requests/:id')
  @Roles(Role.WORKSHOP_ADMIN, Role.SUPPLIER_ADMIN)
  @ApiOperation({ summary: 'Detalle de solicitud con respuestas' })
  findOne(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Param('id') id: string,
  ) {
    return this.supplierQuotes.findOne(id, userId, role);
  }

  @Post('requests/:id/respond')
  @Roles(Role.SUPPLIER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Responder solicitud de cotización' })
  respond(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: RespondSupplierQuoteDto,
  ) {
    return this.supplierQuotes.respond(id, userId, dto);
  }
}
