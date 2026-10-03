import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notifications/notification.service';

@Injectable()
export class LegalAlertsCronService {
  private readonly logger = new Logger(LegalAlertsCronService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationService,
  ) {}

  @Cron('0 7 * * *', { name: 'legal-alerts-check', timeZone: 'America/Bogota' })
  async handleLegalAlerts(): Promise<void> {
    this.logger.log('Starting legal alerts cron job...');

    // Query alerts where send date (expiryDate - daysBeforeDue) <= today
    // sentAt IS NULL and cancelled = false
    const pendingAlerts = await this.prisma.legalAlert.findMany({
      where: {
        sentAt: null,
        cancelled: false,
        obligation: {
          // The send date is: expiryDate - daysBeforeDue days
          // We need alerts where that computed date <= today
          // Since Prisma can't do computed fields in WHERE, we fetch candidates
          // and filter in code
        },
      },
      include: {
        obligation: {
          include: {
            vehicle: {
              include: {
                owner: {
                  select: {
                    id: true,
                    email: true,
                    firstName: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Filter: sendDate = obligation.expiryDate - daysBeforeDue <= today
    const alertsToSend = pendingAlerts.filter((alert) => {
      const sendDate = new Date(alert.obligation.expiryDate);
      sendDate.setDate(sendDate.getDate() - alert.daysBeforeDue);
      sendDate.setHours(0, 0, 0, 0);
      return sendDate <= today;
    });

    let sent = 0;
    let failed = 0;

    for (const alert of alertsToSend) {
      try {
        const obligation = alert.obligation;
        const vehicle = obligation.vehicle;
        const owner = vehicle.owner;

        const typeLabel = this.getTypeLabel(obligation.type);
        const daysLeft = this.getDaysUntilExpiry(obligation.expiryDate);
        const daysText = daysLeft <= 0
          ? 'ya esta vencido'
          : `vence en ${daysLeft} dia${daysLeft !== 1 ? 's' : ''}`;

        // 1. Notificacion in-app + marcar enviada
        await this.notifications.createInAppNotification({
          userId: owner.id,
          title: 'Alerta de vencimiento',
          body: `Tu ${typeLabel} del vehiculo ${vehicle.plate} ${daysText}.`,
          type: 'LEGAL_ALERT',
          entityId: obligation.id,
        });

        await this.prisma.legalAlert.update({
          where: { id: alert.id },
          data: { sentAt: new Date() },
        });

        // 2. Email (fallo no reintenta ni duplica in-app)
        try {
          await this.notifications.sendNotificationEmail(
            owner.email,
            'Alerta de vencimiento',
            owner.firstName,
            `<p>Tu <strong>${typeLabel}</strong> del vehiculo <strong>${vehicle.plate}</strong> (${vehicle.brand} ${vehicle.model}) ${daysText}.</p>
            <p>Te recomendamos renovarlo a la brevedad para evitar inconvenientes.</p>`,
          );
        } catch (emailError) {
          this.logger.warn(
            `Email failed for alert ${alert.id}: ${emailError instanceof Error ? emailError.message : String(emailError)}`,
          );
        }

        sent++;
      } catch (error) {
        failed++;
        this.logger.error(
          `Error processing alert ${alert.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    this.logger.log(
      `Legal alerts cron completed. Processed ${alertsToSend.length} alerts, ${sent} sent, ${failed} failed.`,
    );
  }

  private getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      SOAT: 'SOAT',
      RTM: 'Revision tecnico-mecanica',
      INSURANCE: 'Seguro',
    };
    return labels[type] || type;
  }

  private getDaysUntilExpiry(expiryDate: Date): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    const diffMs = expiry.getTime() - today.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }
}
