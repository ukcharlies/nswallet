import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';

/**
 * PrismaService - Database client wrapper with lifecycle management
 *
 * Features:
 * - Automatic connection management
 * - Query logging in development
 * - Graceful shutdown handling
 * - Soft delete middleware (filters deleted records by default)
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log:
        process.env.NODE_ENV === 'development'
          ? [
              { emit: 'event', level: 'query' },
              { emit: 'stdout', level: 'info' },
              { emit: 'stdout', level: 'warn' },
              { emit: 'stdout', level: 'error' },
            ]
          : ['error'],
    });
  }

  async onModuleInit() {
    // Log queries in development for debugging
    if (process.env.NODE_ENV === 'development') {
      // @ts-ignore - Prisma event typing
      this.$on('query', (e: Prisma.QueryEvent) => {
        this.logger.debug(`Query: ${e.query}`);
        this.logger.debug(`Duration: ${e.duration}ms`);
      });
    }

    await this.$connect();
    this.logger.log('Database connected successfully');

    // Add soft delete middleware
    this.addSoftDeleteMiddleware();
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }

  /**
   * Middleware to automatically filter soft-deleted records
   * and convert delete operations to soft deletes
   */
  private addSoftDeleteMiddleware() {
    // Models that support soft delete
    const softDeleteModels = ['User', 'Wallet'];

    // Filter out soft-deleted records on find operations
    (this as any).$use(async (params, next) => {
      if (softDeleteModels.includes(params.model || '')) {
        if (params.action === 'findUnique' || params.action === 'findFirst') {
          // Change to findFirst to add deletedAt filter
          params.action = 'findFirst';
          params.args.where = {
            ...params.args.where,
            deletedAt: null,
          };
        }

        if (params.action === 'findMany') {
          // Add deletedAt filter if not explicitly querying deleted records
          if (!params.args) {
            params.args = { where: {} };
          }
          if (!params.args.where) {
            params.args.where = {};
          }
          if (params.args.where.deletedAt === undefined) {
            params.args.where.deletedAt = null;
          }
        }
      }
      return next(params);
    });

    // Convert delete to soft delete
    (this as any).$use(async (params, next) => {
      if (softDeleteModels.includes(params.model || '')) {
        if (params.action === 'delete') {
          params.action = 'update';
          params.args.data = { deletedAt: new Date() };
        }
        if (params.action === 'deleteMany') {
          params.action = 'updateMany';
          if (!params.args) {
            params.args = {};
          }
          params.args.data = { deletedAt: new Date() };
        }
      }
      return next(params);
    });
  }

  /**
   * Clean up database for testing
   * WARNING: Only use in test environment!
   */
  async cleanDatabase() {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('cleanDatabase can only be used in test environment');
    }

    const tablenames = await this.$queryRaw<
      Array<{ tablename: string }>
    >`SELECT tablename FROM pg_tables WHERE schemaname='public'`;

    const tables = tablenames
      .map(({ tablename }) => tablename)
      .filter((name) => name !== '_prisma_migrations')
      .map((name) => `"public"."${name}"`)
      .join(', ');

    if (tables.length > 0) {
      await this.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);
    }
  }
}
