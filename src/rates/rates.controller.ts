import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  RatesService,
  ExchangeRates,
  TARGET_CURRENCIES,
} from './rates.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Public } from '../common/decorators/public.decorator';

/**
 * RatesController - Exchange rates endpoints
 */
@Controller('rates')
@UseGuards(JwtAuthGuard)
export class RatesController {
  constructor(private readonly ratesService: RatesService) {}

  /**
   * Get exchange rates for a base currency
   * GET /rates?base=NGN
   *
   * Returns rates for: USD, KES, GHS, GBP, AUD, CAD
   */
  @Public() // Rates can be public, but you may want to protect this in production
  @Get()
  async getRates(
    @Query('base') baseCurrency: string = 'NGN',
  ): Promise<ExchangeRates> {
    return this.ratesService.getRates(baseCurrency);
  }

  /**
   * Get supported currencies
   * GET /rates/currencies
   */
  @Public()
  @Get('currencies')
  getSupportedCurrencies(): { currencies: string[] } {
    return { currencies: [...TARGET_CURRENCIES] };
  }

  /**
   * Convert amount between currencies
   * GET /rates/convert?amount=100&from=USD&to=NGN
   */
  @Get('convert')
  async convert(
    @Query('amount') amount: string,
    @Query('from') fromCurrency: string,
    @Query('to') toCurrency: string,
  ): Promise<{
    amount: number;
    from: string;
    to: string;
    convertedAmount: number;
    rate: number;
  }> {
    const numAmount = parseFloat(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
      throw new Error('Invalid amount');
    }

    const result = await this.ratesService.convert(
      numAmount,
      fromCurrency,
      toCurrency,
    );

    return {
      amount: numAmount,
      from: fromCurrency.toUpperCase(),
      to: toCurrency.toUpperCase(),
      convertedAmount: result.convertedAmount,
      rate: result.rate,
    };
  }
}
