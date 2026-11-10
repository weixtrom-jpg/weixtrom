import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateQuotationDto {
  @ApiProperty({
    example: 'clxyz123abc',
    description: 'ID de la solicitud de diagnóstico asociada',
  })
  @IsString({ message: 'El diagnosticRequestId debe ser texto' })
  @IsNotEmpty({ message: 'El diagnosticRequestId es obligatorio' })
  diagnosticRequestId: string;
}
