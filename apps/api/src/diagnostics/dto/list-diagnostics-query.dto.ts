import { IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { DiagnosticRequestStatus } from '@prisma/client';

export class ListDiagnosticsQueryDto {
  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiProperty({ required: false, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiProperty({
    required: false,
    enum: DiagnosticRequestStatus,
    description: 'Filtrar por estado',
  })
  @IsOptional()
  @IsEnum(DiagnosticRequestStatus, { message: 'Estado inválido' })
  status?: DiagnosticRequestStatus;
}
