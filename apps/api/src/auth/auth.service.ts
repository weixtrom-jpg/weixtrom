import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto, ForgotPasswordDto, ResetPasswordDto } from './dto';
import { UserStatus } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  // WX-016: Registro de usuario
  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) {
      throw new ConflictException('Ya existe una cuenta con este correo');
    }

    // WX-021: Validar política de contraseñas
    this.validatePasswordPolicy(dto.password);

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role: dto.role,
        verificationToken,
      },
    });

    // TODO: Enviar correo de verificación (WX-024)

    return {
      message: 'Cuenta creada. Revisa tu correo para verificar tu cuenta.',
      userId: user.id,
    };
  }

  // WX-017: Verificación de correo
  async verifyEmail(token: string) {
    const user = await this.prisma.user.findFirst({
      where: { verificationToken: token },
    });

    if (!user) {
      throw new BadRequestException('Token de verificación inválido o expirado');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        status: UserStatus.ACTIVE,
        verificationToken: null,
      },
    });

    return { message: 'Correo verificado exitosamente. Ya puedes iniciar sesión.' };
  }

  // WX-017: Reenviar correo de verificación
  async resendVerification(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.emailVerified) {
      return { message: 'Si el correo existe y no está verificado, se envió un nuevo enlace.' };
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    await this.prisma.user.update({
      where: { id: user.id },
      data: { verificationToken },
    });

    // TODO: Enviar correo (WX-024)

    return { message: 'Si el correo existe y no está verificado, se envió un nuevo enlace.' };
  }

  // WX-018: Login con JWT
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    if (!user) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    // WX-019: Verificar bloqueo
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      throw new ForbiddenException(
        `Cuenta bloqueada. Intenta de nuevo en ${minutes} minutos.`,
      );
    }

    if (!user.emailVerified) {
      throw new ForbiddenException('Debes verificar tu correo antes de iniciar sesión');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new ForbiddenException('Tu cuenta está suspendida. Contacta al administrador.');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!passwordValid) {
      // WX-019: Incrementar intentos fallidos
      const newAttempts = user.failedAttempts + 1;
      const updateData: Record<string, unknown> = { failedAttempts: newAttempts };

      if (newAttempts >= 5) {
        updateData.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutos
        updateData.status = UserStatus.BLOCKED;
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });

      throw new UnauthorizedException('Credenciales incorrectas');
    }

    // Reset intentos fallidos y actualizar último login
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedAttempts: 0,
        lockedUntil: null,
        status: user.status === UserStatus.BLOCKED ? UserStatus.ACTIVE : user.status,
        lastLoginAt: new Date(),
      },
    });

    // WX-018: Generar tokens
    const tokens = await this.generateTokens(user.id, user.email, user.role);

    // Guardar refresh token
    await this.prisma.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días
      },
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  // WX-018: Refresh token
  async refreshTokens(refreshToken: string) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!stored || stored.expiresAt < new Date()) {
      if (stored) {
        await this.prisma.refreshToken.delete({ where: { id: stored.id } });
      }
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    // Rotar el refresh token
    await this.prisma.refreshToken.delete({ where: { id: stored.id } });

    const tokens = await this.generateTokens(
      stored.user.id,
      stored.user.email,
      stored.user.role,
    );

    await this.prisma.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: stored.user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return tokens;
  }

  // WX-020: Recuperación de contraseña
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    // Siempre responder igual (no revelar si el correo existe)
    const message = 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.';

    if (!user) return { message };

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30 min

    await this.prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiry },
    });

    // TODO: Enviar correo con enlace (WX-024)

    return { message };
  }

  // WX-020: Reset de contraseña
  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        resetToken: dto.token,
        resetTokenExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      throw new BadRequestException('Token inválido o expirado');
    }

    this.validatePasswordPolicy(dto.newPassword);

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null,
        failedAttempts: 0,
        lockedUntil: null,
        status: user.status === UserStatus.BLOCKED ? UserStatus.ACTIVE : user.status,
      },
    });

    // Invalidar todos los refresh tokens
    await this.prisma.refreshToken.deleteMany({ where: { userId: user.id } });

    return { message: 'Contraseña actualizada exitosamente.' };
  }

  // Logout
  async logout(refreshToken: string) {
    await this.prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    return { message: 'Sesión cerrada.' };
  }

  // WX-021: Validar política de contraseñas
  private validatePasswordPolicy(password: string) {
    if (password.length < 8) {
      throw new BadRequestException('La contraseña debe tener al menos 8 caracteres');
    }
    if (!/[A-Z]/.test(password)) {
      throw new BadRequestException('La contraseña debe contener al menos una mayúscula');
    }
    if (!/[a-z]/.test(password)) {
      throw new BadRequestException('La contraseña debe contener al menos una minúscula');
    }
    if (!/\d/.test(password)) {
      throw new BadRequestException('La contraseña debe contener al menos un número');
    }
  }

  private async generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.get('JWT_SECRET'),
        expiresIn: '15m',
      }),
      this.jwt.signAsync(payload, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }
}
