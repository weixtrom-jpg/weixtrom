import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsInt,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({
    example: 'Filtro de aceite 10W-40',
    description: 'Nombre del producto',
  })
  @IsString({ message: 'El nombre debe ser texto' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MaxLength(255, { message: 'El nombre no puede exceder 255 caracteres' })
  name: string;

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
    example: 25000,
    description: 'Precio unitario del producto',
  })
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El precio debe ser un número con máximo 2 decimales' })
  @Min(0, { message: 'El precio no puede ser negativo' })
  price: number;

  @ApiProperty({
    example: 50,
    description: 'Stock inicial del producto',
    required: false,
    default: 0,
  })
  @IsOptional()
  @IsInt({ message: 'El stock debe ser un número entero' })
  @Min(0, { message: 'El stock no puede ser negativo' })
  stock?: number;
}
