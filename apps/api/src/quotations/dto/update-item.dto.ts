import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsNumber,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { QuotationItemType } from '@prisma/client';

export class UpdateItemDto {
  @ApiProperty({ required: false, enum: QuotationItemType })
  @IsOptional()
  @IsEnum(QuotationItemType, { message: 'El tipo debe ser SERVICE o PART' })
  type?: QuotationItemType;

  @ApiProperty({ required: false, example: 'Cambio de aceite sintetico' })
  @IsOptional()
  @IsString({ message: 'La descripcion debe ser texto' })
  @MaxLength(500, { message: 'La descripcion no puede exceder 500 caracteres' })
  description?: string;

  @ApiProperty({ required: false, example: 2 })
  @IsOptional()
  @IsInt({ message: 'La cantidad debe ser un entero' })
  @Min(1, { message: 'La cantidad minima es 1' })
  quantity?: number;

  @ApiProperty({ required: false, example: 55000 })
  @IsOptional()
  @IsNumber({}, { message: 'El precio unitario debe ser un numero' })
  @Min(0, { message: 'El precio unitario no puede ser negativo' })
  unitPrice?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString({ message: 'El productId debe ser texto' })
  productId?: string;
}
