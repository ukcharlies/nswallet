import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

// Core modules
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { WalletsModule } from './wallets/wallets.module';
import { RatesModule } from './rates/rates.module';
import { AuditModule } from './audit/audit.module';

// Guards
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

// Controllers
import { AppController } from './app.controller';
import { AppService } from './app.service';

/**
 * AppModule - Root application module
 *
 * Configures:
 * - Environment variables (ConfigModule)
 * - Rate limiting (ThrottlerModule)
 * - Global JWT authentication guard
 * - All feature modules
 */
@Module({
  imports: [
    // Environment configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Rate limiting - Prevent brute force attacks
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1 second
        limit: 3, // 3 requests per second
      },
      {
        name: 'medium',
        ttl: 10000, // 10 seconds
        limit: 20, // 20 requests per 10 seconds
      },
      {
        name: 'long',
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),

    // Database
    PrismaModule,

    // Feature modules
    AuthModule,
    UsersModule,
    WalletsModule,
    RatesModule,
    AuditModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,

    // Global rate limiting guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },

    // Global JWT authentication guard
    // All routes require authentication by default
    // Use @Public() decorator to mark routes as public
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
