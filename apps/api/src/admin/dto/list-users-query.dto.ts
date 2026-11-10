import { IsOptional, IsString, IsEnum, IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { Role, UserStatus } from '@prisma/client';

export class ListUsersQueryDto {
  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role, { message: 'Rol inválido' })
  role?: Role;

  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus, { message: 'Estado inválido' })
  status?: UserStatus;

  @ApiPropertyOptional({ description: 'Buscar por nombre o email' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
