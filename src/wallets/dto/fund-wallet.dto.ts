import {
  IsNumber,
  IsPositive,
  IsString,
  IsOptional,
  IsObject,
  MaxLength,
} from 'class-validator';

/**
 * DTO for funding a wallet (credit operation)
 */
export class FundWalletDto {
  @IsNumber({ maxDecimalPlaces: 4 })
  @IsPositive({ message: 'Amount must be greater than 0' })
  amount: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  reference?: string; // Idempotency key - if not provided, one will be generated

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>; // Flexible JSON for additional data
}
