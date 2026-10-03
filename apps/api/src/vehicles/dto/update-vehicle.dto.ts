import {
  IsString,
  IsInt,
  IsOptional,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const CURRENT_YEAR = new Date().getFullYear();

export class UpdateVehicleDto {
  @ApiProperty({ required: false, example: 'Chevrolet' })
  @IsOptional()
  @IsString({ message: 'La marca debe ser texto' })
  @MaxLength(50, { message: 'La marca no puede exceder 50 caracteres' })
  brand?: string;

  @ApiProperty({ required: false, example: 'Spark GT' })
  @IsOptional()
  @IsString({ message: 'El modelo debe ser texto' })
  @MaxLength(50, { message: 'El modelo no puede exceder 50 caracteres' })
  model?: string;

  @ApiProperty({ required: false, example: 2020 })
  @IsOptional()
  @IsInt({ message: 'El año debe ser un número entero' })
  @Min(1900, { message: 'El año mínimo es 1900' })
  @Max(CURRENT_YEAR + 1, { message: `El año máximo es ${CURRENT_YEAR + 1}` })
  year?: number;

  @ApiProperty({ required: false, example: 'Rojo' })
  @IsOptional()
  @IsString({ message: 'El color debe ser texto' })
  @MaxLength(30, { message: 'El color no puede exceder 30 caracteres' })
  color?: string;
}
