import { IsString, IsInt, Min, IsArray, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSupplierQuoteRequestDto {
  @ApiProperty({ description: 'Nombre del repuesto o pieza buscada' })
  @IsString()
  partName: string;

  @ApiProperty({ description: 'Cantidad requerida', default: 1 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({
    description: 'IDs de los proveedores a los que se envía la solicitud (máximo 5)',
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Debe seleccionar al menos un proveedor' })
  @ArrayMaxSize(5, { message: 'Máximo 5 proveedores por solicitud' })
  @IsString({ each: true })
  supplierIds: string[];
}
