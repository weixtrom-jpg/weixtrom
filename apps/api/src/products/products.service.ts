import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma, ProductStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  // ─── Resolver supplierId del usuario autenticado ────────────

  private async getSupplierForUser(userId: string) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { adminId: userId },
    });

    if (!supplier) {
      throw new NotFoundException('No tienes un proveedor asociado');
    }

    return supplier;
  }

  // ─── WX-058: Crear producto ────────────

  async create(userId: string, dto: CreateProductDto) {
    const supplier = await this.getSupplierForUser(userId);

    const stock = dto.stock ?? 0;
    const status = stock > 0 ? ProductStatus.ACTIVE : ProductStatus.OUT_OF_STOCK;

    const product = await this.prisma.product.create({
      data: {
        supplierId: supplier.id,
        name: dto.name,
        category: dto.category,
        price: dto.price,
        stock,
        status,
      },
    });

    await this.audit.log({
      userId,
      action: 'CREATE_PRODUCT',
      entity: 'Product',
      entityId: product.id,
      newValue: { name: dto.name, price: dto.price, stock, status },
    });

    return product;
  }

  // ─── WX-058: Listar productos con búsqueda, filtros y paginación ────────────

  async findAll(
    userId: string,
    role: Role,
    query: { page?: number; limit?: number; search?: string; category?: string; status?: string },
  ) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 20;

    const where: Prisma.ProductWhereInput = {};

    if (role === Role.SUPPLIER_ADMIN) {
      // Solo ve sus propios productos (incluidos agotados e inactivos)
      const supplier = await this.getSupplierForUser(userId);
      where.supplierId = supplier.id;
    } else if (role === Role.WORKSHOP_ADMIN) {
      // Excluir OUT_OF_STOCK e INACTIVE
      where.status = ProductStatus.ACTIVE;
    }

    if (query.status && role === Role.SUPPLIER_ADMIN) {
      where.status = query.status as ProductStatus;
    }

    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }

    // Filtro exacto por categoría
    if (query.category) {
      where.category = query.category;
    }

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ─── WX-058: Detalle de un producto ────────────

  async findOne(id: string, userId: string, role: Role) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { supplier: true },
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    if (role === Role.SUPPLIER_ADMIN) {
      const supplier = await this.getSupplierForUser(userId);
      if (product.supplierId !== supplier.id) {
        throw new ForbiddenException('No tienes acceso a este producto');
      }
    } else if (role === Role.WORKSHOP_ADMIN) {
      // No mostrar productos inactivos o agotados al taller
      if (product.status !== ProductStatus.ACTIVE) {
        throw new NotFoundException('Producto no encontrado');
      }
    }

    return product;
  }

  // ─── WX-058 + WX-059: Editar producto (incluye lógica de stock automático) ──

  async update(id: string, userId: string, dto: UpdateProductDto) {
    const supplier = await this.getSupplierForUser(userId);

    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    if (product.supplierId !== supplier.id) {
      throw new ForbiddenException('No tienes permiso para editar este producto');
    }

    // Construir data de actualización
    const data: Prisma.ProductUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.price !== undefined) data.price = dto.price;
    if (dto.stock !== undefined) data.stock = dto.stock;

    // WX-059: Marcado automático de agotado / reposición
    if (dto.stock !== undefined) {
      if (dto.stock === 0) {
        data.status = ProductStatus.OUT_OF_STOCK;
      } else if (dto.stock > 0 && product.status === ProductStatus.OUT_OF_STOCK) {
        data.status = ProductStatus.ACTIVE;
      }
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data,
    });

    await this.audit.log({
      userId,
      action: 'UPDATE_PRODUCT',
      entity: 'Product',
      entityId: id,
      oldValue: { name: product.name, price: product.price, stock: product.stock, status: product.status },
      newValue: dto,
    });

    return updated;
  }

  // ─── WX-058: Desactivar/eliminar producto ────────────

  async remove(id: string, userId: string) {
    const supplier = await this.getSupplierForUser(userId);

    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    if (product.supplierId !== supplier.id) {
      throw new ForbiddenException('No tienes permiso para eliminar este producto');
    }

    // Soft-delete: marcar como INACTIVE en vez de borrar
    const updated = await this.prisma.product.update({
      where: { id },
      data: { status: ProductStatus.INACTIVE },
    });

    await this.audit.log({
      userId,
      action: 'DEACTIVATE_PRODUCT',
      entity: 'Product',
      entityId: id,
      oldValue: { status: product.status },
      newValue: { status: ProductStatus.INACTIVE },
    });

    return updated;
  }
}
