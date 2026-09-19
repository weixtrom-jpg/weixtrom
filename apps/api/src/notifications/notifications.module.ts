import { Global, Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { NotificationService } from './notification.service';
import { NotificationsController } from './notifications.controller';

@Global()
@Module({
  controllers: [NotificationsController],
  providers: [MailService, NotificationService],
  exports: [NotificationService],
})
export class NotificationsModule {}
