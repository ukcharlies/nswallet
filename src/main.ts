import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

/**
 * Bootstrap the NestJS application
 *
 * Security middleware configured:
 * - Helmet: Security headers
 * - CORS: Cross-origin resource sharing with allowlist
 * - Cookie Parser: Parse cookies (for refresh tokens)
 * - Validation Pipe: Input validation using class-validator
 * - Rate Limiting: Configured in AppModule
 */
async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);

  // Security: Helmet middleware for secure HTTP headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          scriptSrc: ["'self'"],
        },
      },
      hsts: {
        maxAge: 31536000, // 1 year in seconds
        includeSubDomains: true,
        preload: true,
      },
    }),
  );

  // Security: Cookie parser for refresh token handling
  const cookieSecret = configService.get<string>(
    'COOKIE_SECRET',
    'change-me-in-production',
  );
  app.use(cookieParser(cookieSecret));

  // Security: CORS with allowlist
  const corsOrigins = configService.get<string>(
    'CORS_ORIGINS',
    'http://localhost:3001',
  );
  const allowedOrigins = corsOrigins.split(',').map((origin) => origin.trim());

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logger.warn(`Blocked CORS request from: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true, // Allow cookies
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  });

  // Validation: Global validation pipe for all DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip non-whitelisted properties
      forbidNonWhitelisted: true, // Throw error if non-whitelisted props are present
      transform: true, // Auto-transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true,
      },
      stopAtFirstError: true, // Return only first validation error
    }),
  );

  // Exception handling: Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // API prefix (optional)
  const apiPrefix = configService.get<string>('API_PREFIX', 'api/v1');
  app.setGlobalPrefix(apiPrefix);

  // Start server
  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);

  logger.log(
    `🚀 Application running on: http://localhost:${port}/${apiPrefix}`,
  );
  logger.log(
    `📚 Environment: ${configService.get<string>('NODE_ENV', 'development')}`,
  );
}

bootstrap();
