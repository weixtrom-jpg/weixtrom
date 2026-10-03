import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsOptional,
  MaxLength,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

const COLOMBIAN_PLATE_REGEX = /^[A-Z]{3}\d{2}[A-Z0-9]$/;
const CURRENT_YEAR = new Date().getFullYear();

export class CreateVehicleDto {
  @ApiProperty({
    example: 'ABC123',
    description: 'Placa colombiana: ABC123 (auto) o ABC12D (moto)',
  })
  @IsString({ message: 'La placa debe ser texto' })
  @IsNotEmpty({ message: 'La placa es obligatoria' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toUpperCase().replace(/[\s-]/g, '') : value,
  )
  @MaxLength(6, { message: 'La placa no puede exceder 6 caracteres' })
  @Matches(COLOMBIAN_PLATE_REGEX, {
    message:
      'Formato de placa inválido. Use ABC123 (auto) o ABC12D (moto).',
  })
  plate: string;

  @ApiProperty({ example: 'Chevrolet' })
  @IsString({ message: 'La marca debe ser texto' })
  @IsNotEmpty({ message: 'La marca es obligatoria' })
  @MaxLength(50, { message: 'La marca no puede exceder 50 caracteres' })
  brand: string;

  @ApiProperty({ example: 'Spark GT' })
  @IsString({ message: 'El modelo debe ser texto' })
  @IsNotEmpty({ message: 'El modelo es obligatorio' })
  @MaxLength(50, { message: 'El modelo no puede exceder 50 caracteres' })
  model: string;

  @ApiProperty({ example: 2020 })
  @IsInt({ message: 'El año debe ser un número entero' })
  @Min(1900, { message: 'El año mínimo es 1900' })
  @Max(CURRENT_YEAR + 1, { message: `El año máximo es ${CURRENT_YEAR + 1}` })
  year: number;

  @ApiProperty({ required: false, example: 'Rojo' })
  @IsOptional()
  @IsString({ message: 'El color debe ser texto' })
  @MaxLength(30, { message: 'El color no puede exceder 30 caracteres' })
  color?: string;
}
