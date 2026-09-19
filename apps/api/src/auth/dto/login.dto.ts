import { IsEmail, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'carlos@ejemplo.com' })
  @IsEmail({}, { message: 'El correo no tiene un formato válido' })
  email: string;

  @ApiProperty({ example: 'MiClave123!' })
  @IsString()
  password: string;
}
