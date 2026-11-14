import {
  IsString,
  IsOptional,
  IsNumber,
  IsInt,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProductDto {
  @ApiProperty({
    example: 'Filtro de aceite 10W-40 Premium',
    description: 'Nombre del producto',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'El nombre debe ser texto' })
  @MaxLength(255, { message: 'El nombre no puede exceder 255 caracteres' })
  name?: string;

  @ApiProperty({
    example: 'Filtro compatible con motores 1.6L y 2.0L',
    description: 'Descripción del producto',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'La descripción debe ser texto' })
  @MaxLength(2000, { message: 'La descripción no puede exceder 2000 caracteres' })
  description?: string;

  @ApiProperty({
    example: 'Filtros',
    description: 'Categoría del producto',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'La categoría debe ser texto' })
  @MaxLength(100, { message: 'La categoría no puede exceder 100 caracteres' })
  category?: string;

  @ApiProperty({
    example: 28000,
    description: 'Precio unitario del producto',
    required: false,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El precio debe ser un número con máximo 2 decimales' })
  @Min(0, { message: 'El precio no puede ser negativo' })
  price?: number;

  @ApiProperty({
    example: 100,
    description: 'Stock del producto',
    required: false,
  })
  @IsOptional()
  @IsInt({ message: 'El stock debe ser un número entero' })
  @Min(0, { message: 'El stock no puede ser negativo' })
  stock?: number;

}
