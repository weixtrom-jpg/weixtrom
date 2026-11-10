import { IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { SupplierQuoteRequestStatus } from '@prisma/client';

export class ListSupplierQuotesQueryDto {
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
    enum: SupplierQuoteRequestStatus,
    description: 'Filtrar por estado',
  })
  @IsOptional()
  @IsEnum(SupplierQuoteRequestStatus, { message: 'Estado inválido' })
  status?: SupplierQuoteRequestStatus;
}
