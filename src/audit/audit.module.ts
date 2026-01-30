import { Module } from '@nestjs/common';
import { AuditService } from './audit.service';

/**
 * AuditModule - Audit trail functionality
 *
 * Provides logging for all important system actions:
 * - User authentication events
 * - Resource create/update/delete operations
 * - Financial transactions
 */
@Module({
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
