import { IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { QuotationStatus } from '@prisma/client';

export class ListQuotationsQueryDto {
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
    enum: QuotationStatus,
    description: 'Filtrar por estado',
  })
  @IsOptional()
  @IsEnum(QuotationStatus, { message: 'Estado invalido' })
  status?: QuotationStatus;
}
