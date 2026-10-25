import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotificationService } from './notification.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from './mail.service';
import { createMockPrismaService } from '../test/prisma.mock';

describe('NotificationService', () => {
  let service: NotificationService;
  let mail: { send: jest.Mock };

  beforeEach(async () => {
    mail = { send: jest.fn().mockResolvedValue(true) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: PrismaService, useValue: createMockPrismaService() },
        { provide: MailService, useValue: mail },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('http://localhost:5173') } },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  describe('S3: XSS prevention in email templates', () => {
    it('debe escapar HTML en firstName para sendVerificationEmail', async () => {
      const maliciousName = '<script>alert("xss")</script>';

      await service.sendVerificationEmail('test@test.com', 'token123', maliciousName);

      const htmlSent = mail.send.mock.calls[0][0].html;
      expect(htmlSent).not.toContain('<script>');
      expect(htmlSent).toContain('&lt;script&gt;');
    });

    it('debe escapar HTML en firstName para sendPasswordResetEmail', async () => {
      const maliciousName = '<img src=x onerror=alert(1)>';

      await service.sendPasswordResetEmail('test@test.com', 'token123', maliciousName);

      const htmlSent = mail.send.mock.calls[0][0].html;
      expect(htmlSent).not.toContain('<img src=x');
      expect(htmlSent).toContain('&lt;img');
    });

    it('debe escapar HTML en firstName para sendAccountExistsEmail', async () => {
      const maliciousName = '"><script>steal()</script>';

      await service.sendAccountExistsEmail('test@test.com', maliciousName);

      const htmlSent = mail.send.mock.calls[0][0].html;
      expect(htmlSent).not.toContain('"><script>');
      expect(htmlSent).toContain('&quot;&gt;&lt;script&gt;');
    });

    it('debe escapar HTML en firstName para sendNotificationEmail', async () => {
      const maliciousName = "O'Brien<b>bold</b>";

      await service.sendNotificationEmail('test@test.com', 'Test', maliciousName, '<p>body</p>');

      const htmlSent = mail.send.mock.calls[0][0].html;
      expect(htmlSent).not.toContain("O'Brien<b>");
      expect(htmlSent).toContain('&#39;');
      expect(htmlSent).toContain('&lt;b&gt;');
    });

    it('nombres normales se muestran correctamente', async () => {
      await service.sendVerificationEmail('test@test.com', 'token', 'María José');

      const htmlSent = mail.send.mock.calls[0][0].html;
      expect(htmlSent).toContain('María José');
    });
  });

  describe('sendVerificationEmail', () => {
    it('debe enviar email con enlace de verificación', async () => {
      await service.sendVerificationEmail('user@test.com', 'abc123', 'Carlos');

      expect(mail.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@test.com',
          subject: 'Verifica tu cuenta en WEIXTROM',
        }),
      );
      const html = mail.send.mock.calls[0][0].html;
      expect(html).toContain('abc123');
      expect(html).toContain('Carlos');
    });
  });

  describe('sendAccountExistsEmail', () => {
    it('debe enviar email notificando que la cuenta ya existe', async () => {
      await service.sendAccountExistsEmail('user@test.com', 'Laura');

      expect(mail.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@test.com',
          subject: 'Intento de registro en WEIXTROM',
        }),
      );
      const html = mail.send.mock.calls[0][0].html;
      expect(html).toContain('Laura');
      expect(html).toContain('Iniciar sesion');
    });
  });
});
