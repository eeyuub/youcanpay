import { IsNumber, IsString, IsOptional, Min, IsIn, IsUrl } from 'class-validator';

export class CreateCashPlusPaymentDto {
  @IsNumber()
  @Min(100, { message: 'Amount must be at least 100 centimes (1 MAD)' })
  amount!: number;

  @IsString()
  @IsIn(['MAD', 'USD', 'EUR'], { message: 'Currency must be MAD, USD, or EUR' })
  currency!: string;

  @IsUrl({ require_tld: false }, { message: 'Invalid success URL' })
  @IsOptional()
  successUrl?: string;

  @IsUrl({ require_tld: false }, { message: 'Invalid error URL' })
  @IsOptional()
  errorUrl?: string;
}
