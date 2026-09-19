import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'carlos@ejemplo.com' })
  @IsEmail({}, { message: 'El correo no tiene un formato válido' })
  email: string;
}
