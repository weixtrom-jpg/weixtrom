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
import { ProductsService } from './products.service';
import {
  CreateProductDto,
  UpdateProductDto,
  ListProductsQueryDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Products')
@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ProductsController {
  constructor(private products: ProductsService) {}

  @Post()
  @Roles(Role.SUPPLIER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear producto en el catálogo del proveedor' })
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateProductDto,
  ) {
    return this.products.create(userId, dto);
  }

  @Get()
  @Roles(Role.SUPPLIER_ADMIN, Role.WORKSHOP_ADMIN)
  @ApiOperation({ summary: 'Listar productos con búsqueda, filtros y paginación' })
  findAll(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Query() query: ListProductsQueryDto,
  ) {
    return this.products.findAll(userId, role, query);
  }

  @Get(':id')
  @Roles(Role.SUPPLIER_ADMIN, Role.WORKSHOP_ADMIN)
  @ApiOperation({ summary: 'Detalle de un producto' })
  findOne(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: Role,
    @Param('id') id: string,
  ) {
    return this.products.findOne(id, userId, role);
  }

  @Patch(':id')
  @Roles(Role.SUPPLIER_ADMIN)
  @ApiOperation({ summary: 'Editar producto (incluye lógica automática de stock)' })
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.products.update(id, userId, dto);
  }

  @Delete(':id')
  @Roles(Role.SUPPLIER_ADMIN)
  @ApiOperation({ summary: 'Desactivar producto' })
  remove(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.products.remove(id, userId);
  }
}
