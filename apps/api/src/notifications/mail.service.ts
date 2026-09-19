import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
}

@Injectable()
export class MailService {
  private transporter: Transporter;
  private from: string;
  private logger = new Logger(MailService.name);

  constructor(private config: ConfigService) {
    this.from = this.config.get<string>('MAIL_FROM') || 'noreply@weixtrom.com';

    const host = this.config.get<string>('MAIL_HOST');
    const port = this.config.get<number>('MAIL_PORT') || 587;
    const user = this.config.get<string>('MAIL_USER');
    const pass = this.config.get<string>('MAIL_PASS');

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
    } else {
      // En desarrollo sin SMTP, loguear a consola
      this.logger.warn('SMTP no configurado. Los correos se loguearan a consola.');
      this.transporter = nodemailer.createTransport({
        jsonTransport: true,
      });
    }
  }

  async send(options: SendMailOptions): Promise<boolean> {
    try {
      const result = await this.transporter.sendMail({
        from: `WEIXTROM <${this.from}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });

      if (result.message) {
        // jsonTransport: loguear en desarrollo
        this.logger.log(`[DEV] Correo para ${options.to}: ${options.subject}`);
        this.logger.debug(JSON.parse(result.message as string));
      }

      return true;
    } catch (error) {
      this.logger.error(`Error enviando correo a ${options.to}: ${error}`);
      return false;
    }
  }
}
