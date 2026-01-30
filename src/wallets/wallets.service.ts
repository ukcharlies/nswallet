import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { TransactionsService } from './transactions.service';
import {
  Wallet,
  TransactionType,
  Prisma,
  AuditAction,
} from '../../generated/prisma';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { FundWalletDto } from './dto/fund-wallet.dto';
import { WithdrawWalletDto } from './dto/withdraw-wallet.dto';
import { generateTransactionReference } from '../common/utils/crypto.utils';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * WalletsService - Core wallet operations with banking-grade concurrency
 *
 * Features:
 * - Atomic balance updates using Prisma transactions
 * - Optimistic locking via version field to prevent race conditions
 * - Full audit trail for all operations
 * - Support for fallback to pessimistic locking (FOR UPDATE)
 */
@Injectable()
export class WalletsService {
  private readonly logger = new Logger(WalletsService.name);

  // Maximum retries for optimistic locking conflicts
  private readonly MAX_RETRIES = 3;

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly transactionsService: TransactionsService,
  ) {}

  /**
   * Create a new wallet
   */
  async create(
    userId: string,
    dto: CreateWalletDto,
    ip?: string,
    userAgent?: string,
  ): Promise<Wallet> {
    const wallet = await this.prisma.wallet.create({
      data: {
        name: dto.name,
        currency: dto.currency.toUpperCase(),
        userId,
        balance: 0,
        version: 0,
      },
    });

    // Audit log
    await this.auditService.log({
      actorUserId: userId,
      entity: 'Wallet',
      entityId: wallet.id,
      action: AuditAction.CREATE,
      changes: { name: wallet.name, currency: wallet.currency },
      ip,
      userAgent,
    });

    return wallet;
  }

  /**
   * Get wallet by ID
   */
  async findById(id: string): Promise<Wallet | null> {
    return this.prisma.wallet.findUnique({
      where: { id },
    });
  }

  /**
   * Get wallet by ID - throws if not found
   */
  async findByIdOrFail(id: string): Promise<Wallet> {
    const wallet = await this.findById(id);
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }
    return wallet;
  }

  /**
   * Get all wallets for a user
   */
  async findByUserId(userId: string): Promise<Wallet[]> {
    return this.prisma.wallet.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Fund wallet (credit operation)
   * Uses optimistic locking with automatic retry on conflict
   *
   * @param id - Wallet ID
   * @param dto - Fund details (amount, reference)
   * @param performedByUserId - User performing the operation
   */
  async fund(
    id: string,
    dto: FundWalletDto,
    performedByUserId: string,
    ip?: string,
    userAgent?: string,
  ): Promise<Wallet> {
    return this.executeWithRetry(async () => {
      return this.prisma.$transaction(async (tx) => {
        // Get current wallet state
        const wallet = await tx.wallet.findUnique({
          where: { id },
        });

        if (!wallet) {
          throw new NotFoundException('Wallet not found');
        }

        if (wallet.deletedAt) {
          throw new BadRequestException('Wallet has been deleted');
        }

        const amount = new Decimal(dto.amount);
        const balanceBefore = wallet.balance;
        const balanceAfter = balanceBefore.plus(amount);

        // Update with optimistic locking
        // This will fail if another transaction modified the wallet
        const updated = await tx.wallet.updateMany({
          where: {
            id,
            version: wallet.version, // Optimistic lock check
          },
          data: {
            balance: balanceAfter,
            version: { increment: 1 },
            updatedAt: new Date(),
          },
        });

        // Check if update succeeded (optimistic lock)
        if (updated.count === 0) {
          throw new ConflictException(
            'Concurrent modification detected - retry',
          );
        }

        // Create transaction record
        const reference = dto.reference || generateTransactionReference();
        await this.transactionsService.create(tx, {
          walletId: id,
          type: TransactionType.CREDIT,
          amount,
          balanceBefore: balanceBefore.toString(),
          balanceAfter: balanceAfter.toString(),
          reference,
          description: dto.description,
          metadata: dto.metadata,
          performedByUserId,
        });

        // Get updated wallet
        const updatedWallet = await tx.wallet.findUnique({
          where: { id },
        });

        // Audit log
        await this.auditService.log({
          actorUserId: performedByUserId,
          entity: 'Wallet',
          entityId: id,
          action: AuditAction.UPDATE,
          changes: {
            operation: 'FUND',
            amount: amount.toString(),
            balanceBefore: balanceBefore.toString(),
            balanceAfter: balanceAfter.toString(),
            reference,
          },
          ip,
          userAgent,
        });

        return updatedWallet!;
      });
    });
  }

  /**
   * Withdraw from wallet (debit operation)
   * Uses optimistic locking with automatic retry on conflict
   *
   * @param id - Wallet ID
   * @param dto - Withdrawal details (amount, reference)
   * @param performedByUserId - User performing the operation
   */
  async withdraw(
    id: string,
    dto: WithdrawWalletDto,
    performedByUserId: string,
    ip?: string,
    userAgent?: string,
  ): Promise<Wallet> {
    return this.executeWithRetry(async () => {
      return this.prisma.$transaction(async (tx) => {
        // Get current wallet state
        const wallet = await tx.wallet.findUnique({
          where: { id },
        });

        if (!wallet) {
          throw new NotFoundException('Wallet not found');
        }

        if (wallet.deletedAt) {
          throw new BadRequestException('Wallet has been deleted');
        }

        const amount = new Decimal(dto.amount);
        const balanceBefore = wallet.balance;
        const balanceAfter = balanceBefore.minus(amount);

        // Insufficient funds check
        if (balanceAfter.lessThan(0)) {
          throw new BadRequestException(
            `Insufficient funds. Available balance: ${balanceBefore.toString()} ${wallet.currency}`,
          );
        }

        // Update with optimistic locking
        const updated = await tx.wallet.updateMany({
          where: {
            id,
            version: wallet.version, // Optimistic lock check
          },
          data: {
            balance: balanceAfter,
            version: { increment: 1 },
            updatedAt: new Date(),
          },
        });

        // Check if update succeeded (optimistic lock)
        if (updated.count === 0) {
          throw new ConflictException(
            'Concurrent modification detected - retry',
          );
        }

        // Create transaction record
        const reference = dto.reference || generateTransactionReference();
        await this.transactionsService.create(tx, {
          walletId: id,
          type: TransactionType.DEBIT,
          amount,
          balanceBefore: balanceBefore.toString(),
          balanceAfter: balanceAfter.toString(),
          reference,
          description: dto.description,
          metadata: dto.metadata,
          performedByUserId,
        });

        // Get updated wallet
        const updatedWallet = await tx.wallet.findUnique({
          where: { id },
        });

        // Audit log
        await this.auditService.log({
          actorUserId: performedByUserId,
          entity: 'Wallet',
          entityId: id,
          action: AuditAction.UPDATE,
          changes: {
            operation: 'WITHDRAW',
            amount: amount.toString(),
            balanceBefore: balanceBefore.toString(),
            balanceAfter: balanceAfter.toString(),
            reference,
          },
          ip,
          userAgent,
        });

        return updatedWallet!;
      });
    });
  }

  /**
   * Alternative: Pessimistic locking using FOR UPDATE
   * Use this for extreme high-concurrency scenarios
   *
   * Example: Fund with row-level lock
   */
  async fundWithPessimisticLock(
    id: string,
    dto: FundWalletDto,
    performedByUserId: string,
  ): Promise<Wallet> {
    return this.prisma.$transaction(async (tx) => {
      // Lock the row for update - blocks other transactions
      const [wallet] = await tx.$queryRaw<Wallet[]>`
        SELECT * FROM wallets 
        WHERE id = ${id} AND deleted_at IS NULL
        FOR UPDATE
      `;

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      const amount = new Decimal(dto.amount);
      const balanceBefore = new Decimal(wallet.balance.toString());
      const balanceAfter = balanceBefore.plus(amount);

      // Update without version check (we have exclusive lock)
      await tx.wallet.update({
        where: { id },
        data: {
          balance: balanceAfter,
          version: { increment: 1 },
        },
      });

      // Create transaction record
      const reference = dto.reference || generateTransactionReference();
      await this.transactionsService.create(tx, {
        walletId: id,
        type: TransactionType.CREDIT,
        amount,
        balanceBefore,
        balanceAfter,
        reference,
        description: dto.description,
        metadata: dto.metadata,
        performedByUserId,
      });

      return tx.wallet.findUnique({ where: { id } }) as Promise<Wallet>;
    });
  }

  /**
   * Soft delete wallet
   */
  async delete(
    id: string,
    userId: string,
    ip?: string,
    userAgent?: string,
  ): Promise<void> {
    const wallet = await this.findByIdOrFail(id);

    // Verify ownership
    if (wallet.userId !== userId) {
      throw new NotFoundException('Wallet not found');
    }

    // Soft delete
    await this.prisma.wallet.delete({
      where: { id },
    });

    // Audit log
    await this.auditService.log({
      actorUserId: userId,
      entity: 'Wallet',
      entityId: id,
      action: AuditAction.DELETE,
      changes: { name: wallet.name, currency: wallet.currency },
      ip,
      userAgent,
    });
  }

  /**
   * Execute operation with automatic retry on optimistic lock conflict
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    retries: number = this.MAX_RETRIES,
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (
          error instanceof ConflictException &&
          error.message.includes('Concurrent modification')
        ) {
          lastError = error;
          this.logger.warn(
            `Optimistic lock conflict, retry attempt ${attempt}/${retries}`,
          );

          // Add small delay before retry with exponential backoff
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, attempt) * 10),
          );
          continue;
        }
        throw error;
      }
    }

    this.logger.error(
      `Failed after ${retries} retries due to concurrent modifications`,
    );
    throw new ConflictException(
      'Operation failed due to high concurrency. Please try again.',
    );
  }

  /**
   * Transfer between wallets (atomic operation)
   * Useful extension for wallet-to-wallet transfers
   */
  async transfer(
    fromWalletId: string,
    toWalletId: string,
    amount: number,
    performedByUserId: string,
    description?: string,
  ): Promise<{ from: Wallet; to: Wallet }> {
    return this.prisma.$transaction(async (tx) => {
      // Lock both wallets in consistent order to prevent deadlocks
      const walletIds = [fromWalletId, toWalletId].sort();

      await tx.$queryRaw`
        SELECT id FROM wallets 
        WHERE id IN (${Prisma.join(walletIds)}) 
        FOR UPDATE
      `;

      const [fromWallet, toWallet] = await Promise.all([
        tx.wallet.findUnique({ where: { id: fromWalletId } }),
        tx.wallet.findUnique({ where: { id: toWalletId } }),
      ]);

      if (!fromWallet || !toWallet) {
        throw new NotFoundException('One or both wallets not found');
      }

      if (fromWallet.currency !== toWallet.currency) {
        throw new BadRequestException(
          'Cross-currency transfers require conversion (not implemented)',
        );
      }

      const transferAmount = new Decimal(amount);

      if (new Decimal(fromWallet.balance.toString()).lessThan(transferAmount)) {
        throw new BadRequestException('Insufficient funds');
      }

      const reference = generateTransactionReference();

      // Debit from source
      await tx.wallet.update({
        where: { id: fromWalletId },
        data: {
          balance: { decrement: transferAmount },
          version: { increment: 1 },
        },
      });

      await this.transactionsService.create(tx, {
        walletId: fromWalletId,
        type: TransactionType.DEBIT,
        amount: transferAmount,
        balanceBefore: fromWallet.balance.toString(),
        balanceAfter: new Decimal(fromWallet.balance.toString())
          .minus(transferAmount)
          .toString(),
        reference: `${reference}-OUT`,
        description: description || `Transfer to wallet ${toWalletId}`,
        metadata: { toWalletId },
        performedByUserId,
      });

      // Credit to destination
      await tx.wallet.update({
        where: { id: toWalletId },
        data: {
          balance: { increment: transferAmount },
          version: { increment: 1 },
        },
      });

      await this.transactionsService.create(tx, {
        walletId: toWalletId,
        type: TransactionType.CREDIT,
        amount: transferAmount,
        balanceBefore: toWallet.balance.toString(),
        balanceAfter: new Decimal(toWallet.balance.toString())
          .plus(transferAmount)
          .toString(),
        reference: `${reference}-IN`,
        description: description || `Transfer from wallet ${fromWalletId}`,
        metadata: { fromWalletId },
        performedByUserId,
      });

      const [updatedFrom, updatedTo] = await Promise.all([
        tx.wallet.findUnique({ where: { id: fromWalletId } }),
        tx.wallet.findUnique({ where: { id: toWalletId } }),
      ]);

      return { from: updatedFrom!, to: updatedTo! };
    });
  }
}
