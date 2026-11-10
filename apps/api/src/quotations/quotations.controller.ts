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
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { QuotationsService } from './quotations.service';
import {
  CreateQuotationDto,
  AddItemDto,
  UpdateItemDto,
  ListQuotationsQueryDto,
  AddCommentDto,
  RejectQuotationDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Quotations')
@Controller('quotations')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class QuotationsController {
  constructor(private quotations: QuotationsService) {}

  @Post()
  @Roles(Role.WORKSHOP_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear cotizacion vinculada a diagnosticRequestId' })
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateQuotationDto,
  ) {
    return this.quotations.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar cotizaciones segun rol' })
  findAll(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Query() query: ListQuotationsQueryDto,
  ) {
    return this.quotations.findAll(userId, role, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de cotizacion con items' })
  findOne(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Param('id') id: string,
  ) {
    return this.quotations.findOne(id, userId, role);
  }

  @Post(':id/items')
  @Roles(Role.WORKSHOP_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Agregar item a cotizacion' })
  addItem(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: AddItemDto,
  ) {
    return this.quotations.addItem(id, userId, dto);
  }

  @Patch(':id/items/:itemId')
  @Roles(Role.WORKSHOP_ADMIN)
  @ApiOperation({ summary: 'Editar item de cotizacion' })
  updateItem(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateItemDto,
  ) {
    return this.quotations.updateItem(id, itemId, userId, dto);
  }

  @Delete(':id/items/:itemId')
  @Roles(Role.WORKSHOP_ADMIN)
  @ApiOperation({ summary: 'Eliminar item de cotizacion' })
  removeItem(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
  ) {
    return this.quotations.removeItem(id, itemId, userId);
  }

  @Patch(':id/send')
  @Roles(Role.WORKSHOP_ADMIN)
  @ApiOperation({ summary: 'Enviar cotizacion al cliente' })
  send(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.quotations.send(id, userId);
  }

  @Patch(':id/approve')
  @Roles(Role.CLIENT)
  @ApiOperation({ summary: 'Aprobar cotizacion (genera WorkOrder)' })
  approve(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.quotations.approve(id, userId);
  }

  @Patch(':id/reject')
  @Roles(Role.CLIENT)
  @ApiOperation({ summary: 'Rechazar cotizacion' })
  reject(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: RejectQuotationDto,
  ) {
    return this.quotations.reject(id, userId, dto.rejectionReason);
  }

  @Post(':id/comment')
  @Roles(Role.CLIENT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Agregar comentario de ajuste' })
  addComment(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: AddCommentDto,
  ) {
    return this.quotations.addComment(id, userId, dto.comment);
  }
}
