import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

const stripHtml = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.replace(/<[^>]*>/g, '').trim() : value;

export class DiagnoseDto {
  @ApiProperty({
    example: 'Se detectó desgaste en las balatas y disco de freno delantero izquierdo.',
    description: 'Hallazgos del diagnóstico',
  })
  @Transform(stripHtml)
  @IsString({ message: 'Los hallazgos deben ser texto' })
  @IsNotEmpty({ message: 'Los hallazgos son obligatorios' })
  @MaxLength(5000, { message: 'Los hallazgos no pueden exceder 5000 caracteres' })
  findings: string;

  @ApiProperty({
    required: false,
    example: 'Reemplazar balatas y rectificar disco.',
    description: 'Recomendación del taller',
  })
  @IsOptional()
  @Transform(stripHtml)
  @IsString({ message: 'La recomendación debe ser texto' })
  @MaxLength(2000, { message: 'La recomendación no puede exceder 2000 caracteres' })
  recommendation?: string;
}
