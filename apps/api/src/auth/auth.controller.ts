import { Controller, Post, Body, Param, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, ForgotPasswordDto, ResetPasswordDto } from './dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Registrar nueva cuenta' })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Get('verify/:token')
  @ApiOperation({ summary: 'Verificar correo electrónico' })
  verifyEmail(@Param('token') token: string) {
    return this.auth.verifyEmail(token);
  }

  @Post('resend-verification')
  @ApiOperation({ summary: 'Reenviar correo de verificación' })
  resendVerification(@Body('email') email: string) {
    return this.auth.resendVerification(email);
  }

  @Post('login')
  @ApiOperation({ summary: 'Iniciar sesión' })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Renovar tokens' })
  refresh(@Body('refreshToken') refreshToken: string) {
    return this.auth.refreshTokens(refreshToken);
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Solicitar restablecimiento de contraseña' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Restablecer contraseña con token' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cerrar sesión' })
  logout(@Body('refreshToken') refreshToken: string) {
    return this.auth.logout(refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener usuario actual' })
  getMe(@CurrentUser() user: any) {
    return user;
  }
}
