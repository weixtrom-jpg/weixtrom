import { IsEnum, IsNotEmpty, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { LegalObligationType } from '@prisma/client';

export class CreateLegalObligationDto {
  @ApiProperty({
    enum: LegalObligationType,
    example: 'SOAT',
    description: 'Tipo de obligacion legal: SOAT, RTM o INSURANCE',
  })
  @IsEnum(LegalObligationType, {
    message: 'El tipo debe ser SOAT, RTM o INSURANCE',
  })
  @IsNotEmpty({ message: 'El tipo es obligatorio' })
  type: LegalObligationType;

  @ApiProperty({
    example: '2027-06-15T00:00:00.000Z',
    description: 'Fecha de vencimiento (debe ser futura)',
  })
  @IsDateString({}, { message: 'La fecha de vencimiento debe ser una fecha ISO valida' })
  @IsNotEmpty({ message: 'La fecha de vencimiento es obligatoria' })
  expiryDate: string;
}
