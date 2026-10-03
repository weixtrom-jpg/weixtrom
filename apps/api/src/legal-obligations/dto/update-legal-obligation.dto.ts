import { IsDateString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateLegalObligationDto {
  @ApiProperty({
    required: false,
    example: '2028-06-15T00:00:00.000Z',
    description: 'Nueva fecha de vencimiento (renovacion, debe ser futura)',
  })
  @IsOptional()
  @IsDateString({}, { message: 'La fecha de vencimiento debe ser una fecha ISO valida' })
  expiryDate?: string;
}
