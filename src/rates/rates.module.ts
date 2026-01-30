import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RatesController } from './rates.controller';
import { RatesService } from './rates.service';

/**
 * RatesModule - Exchange rates functionality
 *
 * Features:
 * - Fetch rates from external provider
 * - Cache rates with configurable TTL
 * - Support for multiple currencies
 */
@Module({
  imports: [
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        timeout: 10000,
        maxRedirects: 3,
        headers: {
          'User-Agent': 'NSWallet/1.0',
        },
      }),
      inject: [ConfigService],
    }),
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        ttl: configService.get<number>('RATES_CACHE_TTL', 60) * 1000, // Convert to milliseconds
        max: 100, // Max cached items
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [RatesController],
  providers: [RatesService],
  exports: [RatesService],
})
export class RatesModule {}
