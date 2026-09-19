import { Controller, Get, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { NotificationService } from './notification.service';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private notifications: NotificationService) {}

  @Get()
  @ApiOperation({ summary: 'Mis notificaciones' })
  getMyNotifications(
    @CurrentUser('id') userId: string,
    @Query('page') page?: string,
  ) {
    return this.notifications.getUserNotifications(userId, Number(page) || 1);
  }

  // read-all ANTES de :id/read para evitar conflicto de rutas
  @Patch('read-all')
  @ApiOperation({ summary: 'Marcar todas como leidas' })
  markAllAsRead(@CurrentUser('id') userId: string) {
    return this.notifications.markAllAsRead(userId);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Marcar notificacion como leida' })
  markAsRead(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.notifications.markAsRead(id, userId);
  }
}
