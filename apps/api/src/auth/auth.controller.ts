import { Controller, Post, Body, Param, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import {
  RegisterDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  RefreshTokenDto,
  ResendVerificationDto,
} from './dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  // S1: Rate limit estricto para endpoints de auth — 5 req/min
  @Post('register')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Registrar nueva cuenta' })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Get('verify/:token')
  @SkipThrottle()
  @ApiOperation({ summary: 'Verificar correo electrónico' })
  verifyEmail(@Param('token') token: string) {
    return this.auth.verifyEmail(token);
  }

  @Post('resend-verification')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Reenviar correo de verificación' })
  resendVerification(@Body() dto: ResendVerificationDto) {
    return this.auth.resendVerification(dto.email);
  }

  @Post('login')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Iniciar sesión' })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Renovar tokens' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.auth.refreshTokens(dto.refreshToken);
  }

  @Post('forgot-password')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Solicitar restablecimiento de contraseña' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto);
  }

  @Post('reset-password')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Restablecer contraseña con token' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cerrar sesión' })
  logout(@Body() dto: RefreshTokenDto) {
    return this.auth.logout(dto.refreshToken);
  }

  @Get('me')
  @SkipThrottle()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener usuario actual' })
  getMe(
    @CurrentUser() user: { id: string; email: string; firstName: string; lastName: string; role: string },
  ) {
    return user;
  }
}
