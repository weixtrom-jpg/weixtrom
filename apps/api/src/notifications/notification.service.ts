import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from './mail.service';
import { baseTemplate } from './templates/base.template';

@Injectable()
export class NotificationService {
  private appUrl: string;
  private logger = new Logger(NotificationService.name);

  constructor(
    private prisma: PrismaService,
    private mail: MailService,
    private config: ConfigService,
  ) {
    this.appUrl = this.config.get<string>('APP_URL') || 'http://localhost:5173';
  }

  // WX-017: Correo de verificacion
  async sendVerificationEmail(email: string, token: string, firstName: string) {
    const verifyUrl = `${this.appUrl}/verify?token=${token}`;

    const sent = await this.mail.send({
      to: email,
      subject: 'Verifica tu cuenta en WEIXTROM',
      html: baseTemplate(`
        <h2 style="color: #1F3864; margin: 0 0 16px;">Hola ${firstName},</h2>
        <p>Gracias por registrarte en WEIXTROM. Para activar tu cuenta, haz clic en el siguiente boton:</p>
        <div style="text-align: center;">
          <a href="${verifyUrl}" class="btn">Verificar mi correo</a>
        </div>
        <p class="muted">Si el boton no funciona, copia y pega este enlace en tu navegador:</p>
        <p class="muted" style="word-break: break-all;">${verifyUrl}</p>
        <p class="muted">Este enlace expira en 24 horas.</p>
      `),
    });

    await this.logNotification(email, 'VERIFICATION_EMAIL', sent);
    return sent;
  }

  // WX-020: Correo de recuperacion de contrasena
  async sendPasswordResetEmail(email: string, token: string, firstName: string) {
    const resetUrl = `${this.appUrl}/reset-password?token=${token}`;

    const sent = await this.mail.send({
      to: email,
      subject: 'Restablecer tu contrasena - WEIXTROM',
      html: baseTemplate(`
        <h2 style="color: #1F3864; margin: 0 0 16px;">Hola ${firstName},</h2>
        <p>Recibimos una solicitud para restablecer la contrasena de tu cuenta.</p>
        <div style="text-align: center;">
          <a href="${resetUrl}" class="btn">Restablecer contrasena</a>
        </div>
        <p class="muted">Si el boton no funciona, copia y pega este enlace:</p>
        <p class="muted" style="word-break: break-all;">${resetUrl}</p>
        <p class="muted">Este enlace expira en 30 minutos. Si no solicitaste este cambio, ignora este correo.</p>
      `),
    });

    await this.logNotification(email, 'PASSWORD_RESET_EMAIL', sent);
    return sent;
  }

  // Notificacion generica (cambios de estado, alertas, etc.)
  async sendNotificationEmail(
    email: string,
    subject: string,
    firstName: string,
    bodyHtml: string,
  ) {
    const sent = await this.mail.send({
      to: email,
      subject: `${subject} - WEIXTROM`,
      html: baseTemplate(`
        <h2 style="color: #1F3864; margin: 0 0 16px;">Hola ${firstName},</h2>
        ${bodyHtml}
        <div style="text-align: center; margin-top: 24px;">
          <a href="${this.appUrl}" class="btn">Ir a WEIXTROM</a>
        </div>
      `),
    });

    await this.logNotification(email, subject, sent);
    return sent;
  }

  // Guardar notificacion in-app
  async createInAppNotification(params: {
    userId: string;
    title: string;
    body: string;
    type: string;
    entityId?: string;
  }) {
    return this.prisma.notification.create({ data: params });
  }

  // Obtener notificaciones del usuario
  async getUserNotifications(userId: string, page = 1, pageSize = 20) {
    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);

    const unread = await this.prisma.notification.count({
      where: { userId, read: false },
    });

    return { data, total, unread, page, pageSize };
  }

  // Marcar como leida
  async markAsRead(notificationId: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { read: true, readAt: new Date() },
    });
  }

  // Marcar todas como leidas
  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true, readAt: new Date() },
    });
  }

  private async logNotification(to: string, type: string, success: boolean) {
    this.logger.log(`[${success ? 'OK' : 'FAIL'}] ${type} -> ${to}`);
  }
}
