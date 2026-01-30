import {
  Injectable,
  Logger,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { firstValueFrom, timeout, catchError } from 'rxjs';
import { AxiosError } from 'axios';

/**
 * Exchange rate response structure
 */
export interface ExchangeRates {
  base: string;
  date: string;
  rates: Record<string, number>;
  timestamp: number;
}

/**
 * Supported target currencies for rate queries
 */
export const TARGET_CURRENCIES = [
  'USD',
  'KES',
  'GHS',
  'GBP',
  'AUD',
  'CAD',
  'EUR',
  'NGN',
] as const;

/**
 * RatesService - External exchange rates provider
 *
 * Features:
 * - Fetches rates from configurable external API
 * - Caches results with configurable TTL
 * - Filters to supported currencies only
 * - Graceful error handling
 */
@Injectable()
export class RatesService {
  private readonly logger = new Logger(RatesService.name);
  private readonly apiUrl: string;
  private readonly apiKey: string | undefined;
  private readonly cacheTtl: number;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {
    this.apiUrl = this.configService.get<string>(
      'RATES_API_URL',
      'https://api.exchangerate-api.com/v4/latest',
    );
    this.apiKey = this.configService.get<string>('RATES_API_KEY');
    this.cacheTtl =
      this.configService.get<number>('RATES_CACHE_TTL', 60) * 1000;
  }

  /**
   * Get exchange rates for a base currency
   * Returns cached result if available
   *
   * @param baseCurrency - Base currency code (e.g., 'NGN', 'USD')
   */
  async getRates(baseCurrency: string): Promise<ExchangeRates> {
    const cacheKey = `rates:${baseCurrency.toUpperCase()}`;

    // Try to get from cache
    const cached = await this.cacheManager.get<ExchangeRates>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for ${cacheKey}`);
      return cached;
    }

    this.logger.debug(`Cache miss for ${cacheKey}, fetching from API`);

    try {
      // Fetch from external API
      const rates = await this.fetchFromProvider(baseCurrency);

      // Filter to supported currencies only
      const filteredRates: ExchangeRates = {
        base: baseCurrency.toUpperCase(),
        date: rates.date || new Date().toISOString().split('T')[0],
        timestamp: Date.now(),
        rates: this.filterToCurrencies(
          rates.rates,
          TARGET_CURRENCIES as unknown as string[],
        ),
      };

      // Store in cache
      await this.cacheManager.set(cacheKey, filteredRates, this.cacheTtl);

      return filteredRates;
    } catch (error) {
      this.logger.error(`Failed to fetch rates: ${error}`);
      throw new HttpException(
        'Failed to fetch exchange rates',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Fetch rates from external provider
   */
  private async fetchFromProvider(baseCurrency: string): Promise<any> {
    const url = `${this.apiUrl}/${baseCurrency.toUpperCase()}`;

    const headers: Record<string, string> = {
      Accept: 'application/json',
    };

    // Add API key if configured (some providers require it)
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
      // Or depending on provider:
      // headers['apikey'] = this.apiKey;
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get(url, { headers }).pipe(
          timeout(10000),
          catchError((error: AxiosError) => {
            this.logger.error(`API request failed: ${error.message}`);
            throw error;
          }),
        ),
      );

      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        if (error.response?.status === 404) {
          throw new HttpException(
            `Currency ${baseCurrency} not supported`,
            HttpStatus.BAD_REQUEST,
          );
        }
        if (error.response?.status === 429) {
          throw new HttpException(
            'Rate limit exceeded. Please try again later.',
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }
      }
      throw error;
    }
  }

  /**
   * Filter rates to only include specified currencies
   */
  private filterToCurrencies(
    rates: Record<string, number>,
    currencies: string[],
  ): Record<string, number> {
    const filtered: Record<string, number> = {};

    for (const currency of currencies) {
      if (rates[currency] !== undefined) {
        filtered[currency] = rates[currency];
      }
    }

    return filtered;
  }

  /**
   * Convert amount between currencies
   *
   * @param amount - Amount to convert
   * @param fromCurrency - Source currency
   * @param toCurrency - Target currency
   */
  async convert(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
  ): Promise<{ convertedAmount: number; rate: number }> {
    const rates = await this.getRates(fromCurrency);

    const rate = rates.rates[toCurrency.toUpperCase()];
    if (!rate) {
      throw new HttpException(
        `Conversion rate not available for ${toCurrency}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    return {
      convertedAmount: amount * rate,
      rate,
    };
  }

  /**
   * Invalidate cached rates (useful for manual refresh)
   */
  async invalidateCache(baseCurrency?: string): Promise<void> {
    if (baseCurrency) {
      await this.cacheManager.del(`rates:${baseCurrency.toUpperCase()}`);
    } else {
      // Clear all rate caches
      for (const currency of TARGET_CURRENCIES) {
        await this.cacheManager.del(`rates:${currency}`);
      }
    }
  }
}
