import { Module } from '@nestjs/common';
import { WalletsController } from './wallets.controller';
import { WalletsService } from './wallets.service';
import { TransactionsService } from './transactions.service';
import { AuditModule } from '../audit/audit.module';

/**
 * WalletsModule - Wallet and transaction management
 *
 * Features:
 * - Create, read, update, delete wallets
 * - Fund and withdraw operations with atomicity
 * - Transaction history and audit trail
 */
@Module({
  imports: [AuditModule],
  controllers: [WalletsController],
  providers: [WalletsService, TransactionsService],
  exports: [WalletsService, TransactionsService],
})
export class WalletsModule {}
