import { IsDecimal, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RespondSupplierQuoteDto {
  @ApiProperty({ description: 'Precio ofrecido', example: '150000.00' })
  @IsDecimal({ decimal_digits: '0,2' }, { message: 'El precio debe tener máximo 2 decimales' })
  price: string;

  @ApiProperty({ description: 'Días estimados de entrega', required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  deliveryDays?: number;

  @ApiProperty({ description: 'ID del producto del catálogo (opcional)', required: false })
  @IsOptional()
  @IsString()
  productId?: string;
}
