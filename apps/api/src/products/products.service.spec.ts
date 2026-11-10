import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ProductStatus, Role } from '@prisma/client';
import { ProductsService } from './products.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { createMockPrismaService } from '../test/prisma.mock';

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let audit: Record<string, jest.Mock>;

  beforeEach(async () => {
    prisma = createMockPrismaService();
    audit = { log: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  const supplierId = 'sup-1';
  const userId = 'user-1';
  const supplier = { id: supplierId, adminId: userId, name: 'Repuestos XYZ' };

  // ─── create ────────────

  describe('create', () => {
    const dto = { name: 'Filtro de aceite', price: 25000, stock: 50 };

    it('debe crear un producto con status ACTIVE cuando stock > 0', async () => {
      prisma.supplier.findUnique.mockResolvedValue(supplier);
      const created = {
        id: 'prod-1',
        supplierId,
        ...dto,
        status: ProductStatus.ACTIVE,
        category: null,
      };
      prisma.product.create.mockResolvedValue(created);

      const result = await service.create(userId, dto);

      expect(result.id).toBe('prod-1');
      expect(result.status).toBe(ProductStatus.ACTIVE);
      expect(prisma.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            supplierId,
            name: 'Filtro de aceite',
            stock: 50,
            status: ProductStatus.ACTIVE,
          }),
        }),
      );
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CREATE_PRODUCT' }),
      );
    });

    it('debe crear producto con status OUT_OF_STOCK cuando stock es 0', async () => {
      prisma.supplier.findUnique.mockResolvedValue(supplier);
      prisma.product.create.mockResolvedValue({
        id: 'prod-2',
        supplierId,
        name: 'Sin stock',
        price: 10000,
        stock: 0,
        status: ProductStatus.OUT_OF_STOCK,
      });

      await service.create(userId, { name: 'Sin stock', price: 10000, stock: 0 });

      expect(prisma.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            stock: 0,
            status: ProductStatus.OUT_OF_STOCK,
          }),
        }),
      );
    });

    it('debe lanzar NotFoundException si el usuario no tiene proveedor', async () => {
      prisma.supplier.findUnique.mockResolvedValue(null);

      await expect(service.create(userId, dto)).rejects.toThrow(NotFoundException);
      expect(prisma.product.create).not.toHaveBeenCalled();
    });
  });

  // ─── findAll ────────────

  describe('findAll', () => {
    it('SUPPLIER_ADMIN: solo ve sus productos', async () => {
      prisma.supplier.findUnique.mockResolvedValue(supplier);
      prisma.product.findMany.mockResolvedValue([]);
      prisma.product.count.mockResolvedValue(0);

      await service.findAll(userId, Role.SUPPLIER_ADMIN, {});

      const findCall = prisma.product.findMany.mock.calls[0][0];
      expect(findCall.where.supplierId).toBe(supplierId);
    });

    it('WORKSHOP_ADMIN: solo ve productos ACTIVE', async () => {
      prisma.product.findMany.mockResolvedValue([]);
      prisma.product.count.mockResolvedValue(0);

      await service.findAll('wa-1', Role.WORKSHOP_ADMIN, {});

      const findCall = prisma.product.findMany.mock.calls[0][0];
      expect(findCall.where.status).toBe(ProductStatus.ACTIVE);
    });

    it('debe aplicar búsqueda por nombre (insensitive)', async () => {
      prisma.supplier.findUnique.mockResolvedValue(supplier);
      prisma.product.findMany.mockResolvedValue([]);
      prisma.product.count.mockResolvedValue(0);

      await service.findAll(userId, Role.SUPPLIER_ADMIN, { search: 'filtro' });

      const findCall = prisma.product.findMany.mock.calls[0][0];
      expect(findCall.where.name).toEqual({
        contains: 'filtro',
        mode: 'insensitive',
      });
    });

    it('debe aplicar filtro por categoría exacta', async () => {
      prisma.supplier.findUnique.mockResolvedValue(supplier);
      prisma.product.findMany.mockResolvedValue([]);
      prisma.product.count.mockResolvedValue(0);

      await service.findAll(userId, Role.SUPPLIER_ADMIN, { category: 'Filtros' });

      const findCall = prisma.product.findMany.mock.calls[0][0];
      expect(findCall.where.category).toBe('Filtros');
    });

    it('debe paginar correctamente', async () => {
      prisma.supplier.findUnique.mockResolvedValue(supplier);
      prisma.product.findMany.mockResolvedValue([]);
      prisma.product.count.mockResolvedValue(50);

      const result = await service.findAll(userId, Role.SUPPLIER_ADMIN, {
        page: 2,
        limit: 10,
      });

      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(5);
      const findCall = prisma.product.findMany.mock.calls[0][0];
      expect(findCall.skip).toBe(10);
      expect(findCall.take).toBe(10);
    });
  });

  // ─── findOne ────────────

  describe('findOne', () => {
    const product = {
      id: 'prod-1',
      supplierId,
      name: 'Filtro',
      price: 25000,
      stock: 50,
      status: ProductStatus.ACTIVE,
      supplier,
    };

    it('SUPPLIER_ADMIN: debe devolver su propio producto', async () => {
      prisma.product.findUnique.mockResolvedValue(product);
      prisma.supplier.findUnique.mockResolvedValue(supplier);

      const result = await service.findOne('prod-1', userId, Role.SUPPLIER_ADMIN);

      expect(result.id).toBe('prod-1');
    });

    it('SUPPLIER_ADMIN: debe lanzar Forbidden si no es dueño', async () => {
      prisma.product.findUnique.mockResolvedValue({
        ...product,
        supplierId: 'otro-sup',
      });
      prisma.supplier.findUnique.mockResolvedValue(supplier);

      await expect(
        service.findOne('prod-1', userId, Role.SUPPLIER_ADMIN),
      ).rejects.toThrow(ForbiddenException);
    });

    it('WORKSHOP_ADMIN: debe lanzar NotFound para productos no ACTIVE', async () => {
      prisma.product.findUnique.mockResolvedValue({
        ...product,
        status: ProductStatus.OUT_OF_STOCK,
      });

      await expect(
        service.findOne('prod-1', 'wa-1', Role.WORKSHOP_ADMIN),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe lanzar NotFoundException si el producto no existe', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(
        service.findOne('nonexistent', userId, Role.SUPPLIER_ADMIN),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── update (incluye WX-059 marcado automático de stock) ────────────

  describe('update', () => {
    const existingProduct = {
      id: 'prod-1',
      supplierId,
      name: 'Filtro',
      price: 25000,
      stock: 50,
      status: ProductStatus.ACTIVE,
    };

    it('debe actualizar campos del producto', async () => {
      prisma.supplier.findUnique.mockResolvedValue(supplier);
      prisma.product.findUnique.mockResolvedValue(existingProduct);
      prisma.product.update.mockResolvedValue({
        ...existingProduct,
        name: 'Filtro Premium',
      });

      const result = await service.update('prod-1', userId, { name: 'Filtro Premium' });

      expect(result.name).toBe('Filtro Premium');
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'UPDATE_PRODUCT' }),
      );
    });

    it('WX-059: stock a 0 debe cambiar status a OUT_OF_STOCK automáticamente', async () => {
      prisma.supplier.findUnique.mockResolvedValue(supplier);
      prisma.product.findUnique.mockResolvedValue(existingProduct);
      prisma.product.update.mockResolvedValue({
        ...existingProduct,
        stock: 0,
        status: ProductStatus.OUT_OF_STOCK,
      });

      await service.update('prod-1', userId, { stock: 0 });

      expect(prisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            stock: 0,
            status: ProductStatus.OUT_OF_STOCK,
          }),
        }),
      );
    });

    it('WX-059: reposición de stock debe cambiar OUT_OF_STOCK a ACTIVE', async () => {
      const outOfStockProduct = {
        ...existingProduct,
        stock: 0,
        status: ProductStatus.OUT_OF_STOCK,
      };
      prisma.supplier.findUnique.mockResolvedValue(supplier);
      prisma.product.findUnique.mockResolvedValue(outOfStockProduct);
      prisma.product.update.mockResolvedValue({
        ...outOfStockProduct,
        stock: 5,
        status: ProductStatus.ACTIVE,
      });

      await service.update('prod-1', userId, { stock: 5 });

      expect(prisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            stock: 5,
            status: ProductStatus.ACTIVE,
          }),
        }),
      );
    });

    it('WX-059: status no puede ser forzado manualmente (no está en el DTO)', async () => {
      prisma.supplier.findUnique.mockResolvedValue(supplier);
      prisma.product.findUnique.mockResolvedValue({
        ...existingProduct,
        stock: 0,
        status: ProductStatus.OUT_OF_STOCK,
      });
      prisma.product.update.mockResolvedValue({
        ...existingProduct,
        stock: 0,
        status: ProductStatus.OUT_OF_STOCK,
      });

      // Enviar un DTO que solo tiene name (status ya no existe en UpdateProductDto)
      await service.update('prod-1', userId, { name: 'Renombrado' });

      // Verificar que el update NO incluye status (porque no se envió stock)
      const updateCall = prisma.product.update.mock.calls[0][0];
      expect(updateCall.data.status).toBeUndefined();
      expect(updateCall.data.name).toBe('Renombrado');
    });

    it('WX-059: stock=0 siempre marca OUT_OF_STOCK sin importar otros campos', async () => {
      prisma.supplier.findUnique.mockResolvedValue(supplier);
      prisma.product.findUnique.mockResolvedValue(existingProduct);
      prisma.product.update.mockResolvedValue({
        ...existingProduct,
        stock: 0,
        name: 'Editado',
        status: ProductStatus.OUT_OF_STOCK,
      });

      await service.update('prod-1', userId, { stock: 0, name: 'Editado' });

      const updateCall = prisma.product.update.mock.calls[0][0];
      expect(updateCall.data.stock).toBe(0);
      expect(updateCall.data.status).toBe(ProductStatus.OUT_OF_STOCK);
    });

    it('debe lanzar ForbiddenException si no es dueño del producto', async () => {
      prisma.supplier.findUnique.mockResolvedValue(supplier);
      prisma.product.findUnique.mockResolvedValue({
        ...existingProduct,
        supplierId: 'otro-sup',
      });

      await expect(
        service.update('prod-1', userId, { name: 'Hack' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debe lanzar NotFoundException si el producto no existe', async () => {
      prisma.supplier.findUnique.mockResolvedValue(supplier);
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(
        service.update('nonexistent', userId, { name: 'Nada' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── remove ────────────

  describe('remove', () => {
    const existingProduct = {
      id: 'prod-1',
      supplierId,
      name: 'Filtro',
      price: 25000,
      stock: 50,
      status: ProductStatus.ACTIVE,
    };

    it('debe desactivar el producto (soft-delete)', async () => {
      prisma.supplier.findUnique.mockResolvedValue(supplier);
      prisma.product.findUnique.mockResolvedValue(existingProduct);
      prisma.product.update.mockResolvedValue({
        ...existingProduct,
        status: ProductStatus.INACTIVE,
      });

      const result = await service.remove('prod-1', userId);

      expect(result.status).toBe(ProductStatus.INACTIVE);
      expect(prisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: ProductStatus.INACTIVE },
        }),
      );
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'DEACTIVATE_PRODUCT' }),
      );
    });

    it('debe lanzar ForbiddenException si no es dueño', async () => {
      prisma.supplier.findUnique.mockResolvedValue(supplier);
      prisma.product.findUnique.mockResolvedValue({
        ...existingProduct,
        supplierId: 'otro-sup',
      });

      await expect(service.remove('prod-1', userId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('debe lanzar NotFoundException si el producto no existe', async () => {
      prisma.supplier.findUnique.mockResolvedValue(supplier);
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(service.remove('nonexistent', userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
