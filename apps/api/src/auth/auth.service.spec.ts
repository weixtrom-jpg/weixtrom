import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException, BadRequestException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notifications/notification.service';
import { AuditService } from '../audit/audit.service';
import { createMockPrismaService } from '../test/prisma.mock';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: ReturnType<typeof createMockPrismaService>;
  let notifications: Record<string, jest.Mock>;
  let audit: Record<string, jest.Mock>;
  let jwt: Record<string, jest.Mock>;

  beforeEach(async () => {
    prisma = createMockPrismaService();
    notifications = {
      sendVerificationEmail: jest.fn().mockResolvedValue(true),
      sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
      sendAccountExistsEmail: jest.fn().mockResolvedValue(true),
    };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    jwt = { sign: jest.fn().mockReturnValue('mock-jwt-token') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationService, useValue: notifications },
        { provide: AuditService, useValue: audit },
        { provide: JwtService, useValue: jwt },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('test-secret') } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    const dto = {
      email: 'test@example.com',
      password: 'SecurePass123!',
      firstName: 'Juan',
      lastName: 'Perez',
      phone: '3001234567',
      role: 'CLIENT' as const,
    };

    it('debe registrar un usuario nuevo y devolver respuesta genérica', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ id: 'user-1', ...dto, passwordHash: 'hashed' });

      const result = await service.register(dto);

      expect(result.message).toBe('Revisa tu correo para verificar tu cuenta.');
      expect(prisma.user.create).toHaveBeenCalled();
      expect(notifications.sendVerificationEmail).toHaveBeenCalled();
    });

    it('S4: si el email ya existe, devuelve la MISMA respuesta genérica (no revela existencia)', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing', email: dto.email, firstName: 'Existing' });

      const result = await service.register(dto);

      expect(result.message).toBe('Revisa tu correo para verificar tu cuenta.');
      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(notifications.sendAccountExistsEmail).toHaveBeenCalledWith(dto.email, 'Existing');
    });

    it('S2: debe almacenar el verification token hasheado, no el original', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockImplementation(async ({ data }: any) => ({
        id: 'user-1',
        ...data,
      }));

      await service.register(dto);

      const createCall = prisma.user.create.mock.calls[0][0];
      const storedToken = createCall.data.verificationToken;
      expect(storedToken).toHaveLength(64);
      expect(storedToken).toMatch(/^[a-f0-9]{64}$/);

      const emailCall = notifications.sendVerificationEmail.mock.calls[0];
      const emailToken = emailCall[1];
      expect(emailToken).toHaveLength(64);
      const expectedHash = crypto.createHash('sha256').update(emailToken).digest('hex');
      expect(storedToken).toBe(expectedHash);
    });
  });

  describe('verifyEmail', () => {
    it('S2: debe hashear el token recibido para buscar en BD', async () => {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

      prisma.user.findFirst.mockResolvedValue({
        id: 'user-1',
        verificationToken: hashedToken,
        verificationTokenExpiry: new Date(Date.now() + 3600000),
      });
      prisma.user.update.mockResolvedValue({});

      const result = await service.verifyEmail(rawToken);

      expect(result.message).toContain('verificado');
      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { verificationToken: hashedToken },
      });
    });

    it('debe lanzar BadRequestException con token inválido', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(service.verifyEmail('invalid-token')).rejects.toThrow(BadRequestException);
    });

    it('debe lanzar BadRequestException con token expirado', async () => {
      prisma.user.findFirst.mockResolvedValue({
        id: 'user-1',
        verificationToken: 'hash',
        verificationTokenExpiry: new Date(Date.now() - 3600000),
      });

      await expect(service.verifyEmail('some-token')).rejects.toThrow(BadRequestException);
    });
  });

  describe('resendVerification', () => {
    it('S2: debe hashear el nuevo token antes de almacenarlo', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'Juan',
        emailVerified: false,
      });
      prisma.user.update.mockResolvedValue({});

      await service.resendVerification('test@example.com');

      const updateCall = prisma.user.update.mock.calls[0][0];
      const storedToken = updateCall.data.verificationToken;
      expect(storedToken).toMatch(/^[a-f0-9]{64}$/);

      const emailToken = notifications.sendVerificationEmail.mock.calls[0][1];
      const expectedHash = crypto.createHash('sha256').update(emailToken).digest('hex');
      expect(storedToken).toBe(expectedHash);
    });

    it('no debe revelar si el correo no existe', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.resendVerification('nonexistent@test.com');

      expect(result.message).toContain('Si el correo existe');
      expect(notifications.sendVerificationEmail).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('debe lanzar UnauthorizedException con email inexistente', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'noexiste@test.com', password: 'pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('debe lanzar ForbiddenException si la cuenta está bloqueada', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        lockedUntil: new Date(Date.now() + 600000),
      });

      await expect(
        service.login({ email: 'test@test.com', password: 'pass' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
