import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AdminService } from './admin.service';
import {
  ListUsersQueryDto,
  ChangeRoleDto,
  ListWorkshopsQueryDto,
  ListSuppliersQueryDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
@ApiBearerAuth()
export class AdminController {
  constructor(private admin: AdminService) {}

  // ─── WX-088: Gestión de usuarios ────────────

  @Get('users')
  @ApiOperation({ summary: 'Listar usuarios con filtros (SuperAdmin)' })
  listUsers(@Query() query: ListUsersQueryDto) {
    return this.admin.listUsers(query);
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Detalle de un usuario (SuperAdmin)' })
  getUserDetail(@Param('id') id: string) {
    return this.admin.getUserDetail(id);
  }

  @Patch('users/:id/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activar usuario (SuperAdmin)' })
  activateUser(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.admin.activateUser(id, adminId);
  }

  @Patch('users/:id/suspend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suspender usuario (SuperAdmin)' })
  suspendUser(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.admin.suspendUser(id, adminId);
  }

  @Delete('users/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar usuario — soft delete (SuperAdmin)' })
  deleteUser(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.admin.deleteUser(id, adminId);
  }

  // ─── WX-089: Reasignación de rol ────────────

  @Patch('users/:id/role')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cambiar rol de usuario (SuperAdmin)' })
  changeRole(
    @Param('id') id: string,
    @Body() dto: ChangeRoleDto,
    @CurrentUser('id') adminId: string,
  ) {
    return this.admin.changeUserRole(id, dto.role, adminId);
  }

  // ─── WX-090: Talleres ────────────

  @Get('workshops')
  @ApiOperation({ summary: 'Listar talleres con filtros (SuperAdmin)' })
  listWorkshops(@Query() query: ListWorkshopsQueryDto) {
    return this.admin.listWorkshops(query);
  }

  @Patch('workshops/:id/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verificar taller (SuperAdmin)' })
  verifyWorkshop(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.admin.verifyWorkshop(id, adminId);
  }

  @Patch('workshops/:id/suspend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suspender taller (SuperAdmin)' })
  suspendWorkshop(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.admin.suspendWorkshop(id, adminId);
  }

  // ─── WX-090: Proveedores ────────────

  @Get('suppliers')
  @ApiOperation({ summary: 'Listar proveedores con filtros (SuperAdmin)' })
  listSuppliers(@Query() query: ListSuppliersQueryDto) {
    return this.admin.listSuppliers(query);
  }

  @Patch('suppliers/:id/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verificar proveedor (SuperAdmin)' })
  verifySupplier(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.admin.verifySupplier(id, adminId);
  }

  @Patch('suppliers/:id/suspend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suspender proveedor (SuperAdmin)' })
  suspendSupplier(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.admin.suspendSupplier(id, adminId);
  }
}
