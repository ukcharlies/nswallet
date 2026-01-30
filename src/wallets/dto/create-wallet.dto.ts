import { IsString, IsNotEmpty, Length, Matches } from 'class-validator';

/**
 * List of supported ISO 4217 currency codes
 * Extend this list based on your requirements
 */
export const SUPPORTED_CURRENCIES = [
  'NGN', // Nigerian Naira
  'USD', // US Dollar
  'EUR', // Euro
  'GBP', // British Pound
  'KES', // Kenyan Shilling
  'GHS', // Ghanaian Cedi
  'AUD', // Australian Dollar
  'CAD', // Canadian Dollar
  'ZAR', // South African Rand
] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

/**
 * DTO for creating a wallet
 */
export class CreateWalletDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  name: string;

  @IsString()
  @Length(3, 3)
  @Matches(/^[A-Z]{3}$/, {
    message: 'Currency must be a valid 3-letter ISO 4217 code (e.g., USD, NGN)',
  })
  currency: string;
}
