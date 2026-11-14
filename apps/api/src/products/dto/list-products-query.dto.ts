import { IsOptional, IsString, IsInt, IsIn, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ListProductsQueryDto {
  @ApiProperty({
    required: false,
    enum: ['ACTIVE', 'OUT_OF_STOCK', 'INACTIVE'],
    description: 'Filtro por estado del producto',
  })
  @IsOptional()
  @IsString()
  @IsIn(['ACTIVE', 'OUT_OF_STOCK', 'INACTIVE'])
  status?: string;
  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiProperty({ required: false, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiProperty({
    required: false,
    description: 'Búsqueda por nombre (ILIKE/contains insensitive)',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    required: false,
    description: 'Filtro exacto por categoría',
  })
  @IsOptional()
  @IsString()
  category?: string;
}
