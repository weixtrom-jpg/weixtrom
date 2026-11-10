import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { QuotationItemType } from '@prisma/client';

export class AddItemDto {
  @ApiProperty({ enum: QuotationItemType, description: 'Tipo de item: SERVICE o PART' })
  @IsEnum(QuotationItemType, { message: 'El tipo debe ser SERVICE o PART' })
  type: QuotationItemType;

  @ApiProperty({ example: 'Cambio de aceite', description: 'Descripcion del item' })
  @IsString({ message: 'La descripcion debe ser texto' })
  @IsNotEmpty({ message: 'La descripcion es obligatoria' })
  @MaxLength(500, { message: 'La descripcion no puede exceder 500 caracteres' })
  description: string;

  @ApiProperty({ example: 1, description: 'Cantidad' })
  @IsInt({ message: 'La cantidad debe ser un entero' })
  @Min(1, { message: 'La cantidad minima es 1' })
  quantity: number;

  @ApiProperty({ example: 50000, description: 'Precio unitario' })
  @IsNumber({}, { message: 'El precio unitario debe ser un numero' })
  @Min(0, { message: 'El precio unitario no puede ser negativo' })
  unitPrice: number;

  @ApiProperty({ required: false, description: 'ID del producto (solo para PART)' })
  @IsOptional()
  @IsString({ message: 'El productId debe ser texto' })
  productId?: string;
}
