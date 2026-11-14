import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RejectQuotationDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  rejectionReason?: string;
}
