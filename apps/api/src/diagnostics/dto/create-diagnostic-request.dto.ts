import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDiagnosticRequestDto {
  @ApiProperty({
    example: 'clxyz123abc',
    description: 'ID del vehículo a diagnosticar',
  })
  @IsString({ message: 'El vehicleId debe ser texto' })
  @IsNotEmpty({ message: 'El vehicleId es obligatorio' })
  vehicleId: string;

  @ApiProperty({
    example: 'El motor hace un ruido extraño al acelerar',
    description: 'Descripción del problema o síntoma',
  })
  @IsString({ message: 'La descripción debe ser texto' })
  @IsNotEmpty({ message: 'La descripción es obligatoria' })
  @MaxLength(2000, { message: 'La descripción no puede exceder 2000 caracteres' })
  description: string;
}
