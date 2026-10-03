import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

const SELF_REGISTER_ROLES = [
  Role.CLIENT,
  Role.WORKSHOP_ADMIN,
  Role.SUPPLIER_ADMIN,
  Role.TECHNICIAN,
] as const;

export class RegisterDto {
  @ApiProperty({ example: 'carlos@ejemplo.com' })
  @IsEmail({}, { message: 'El correo no tiene un formato válido' })
  @MaxLength(255, { message: 'El correo no puede exceder 255 caracteres' })
  email: string;

  @ApiProperty({ example: 'MiClave123!' })
  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(128, { message: 'La contraseña no puede exceder 128 caracteres' })
  password: string;

  @ApiProperty({ example: 'Carlos' })
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres' })
  firstName: string;

  @ApiProperty({ example: 'Gomez' })
  @IsString()
  @IsNotEmpty({ message: 'El apellido es obligatorio' })
  @MaxLength(100, { message: 'El apellido no puede exceder 100 caracteres' })
  lastName: string;

  @ApiProperty({ example: '3001234567', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'El teléfono no puede exceder 20 caracteres' })
  phone?: string;

  @ApiProperty({ enum: SELF_REGISTER_ROLES, example: Role.CLIENT })
  @IsIn(SELF_REGISTER_ROLES, { message: 'Rol no permitido para auto-registro' })
  role: Role;
}
