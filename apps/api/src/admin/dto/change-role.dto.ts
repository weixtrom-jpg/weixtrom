import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class ChangeRoleDto {
  @ApiProperty({ enum: Role, description: 'Nuevo rol a asignar' })
  @IsEnum(Role, { message: 'Rol inválido' })
  role: Role;
}
