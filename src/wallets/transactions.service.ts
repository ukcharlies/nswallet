import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Transaction, TransactionType, Prisma } from '@prisma/client';

/**
 * DTO for creating a transaction
 */
export interface CreateTransactionDto {
  walletId: string;
  type: TransactionType;
  amount: number | string;
  balanceBefore: number | string;
  balanceAfter: number | string;
  reference: string;
  description?: string;
  metadata?: Record<string, any>;
  performedByUserId: string;
}

/**
 * TransactionsService - Immutable transaction ledger
 *
 * Transactions are append-only and should never be modified or deleted.
 * They provide a complete audit trail of all financial operations.
 */
@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a transaction record
   * Should be called within a Prisma transaction for atomicity
   *
   * @param tx - Prisma transaction client
   * @param dto - Transaction details
   */
  async create(
    tx: Prisma.TransactionClient,
    dto: CreateTransactionDto,
  ): Promise<Transaction> {
    return tx.transaction.create({
      data: {
        walletId: dto.walletId,
        type: dto.type,
        amount: dto.amount,
        balanceBefore: dto.balanceBefore,
        balanceAfter: dto.balanceAfter,
        reference: dto.reference,
        description: dto.description,
        metadata: dto.metadata || undefined,
        performedByUserId: dto.performedByUserId,
      },
    });
  }

  /**
   * Find transaction by ID
   */
  async findById(id: string): Promise<Transaction | null> {
    return this.prisma.transaction.findUnique({
      where: { id },
      include: {
        wallet: true,
        performedBy: {
          select: { id: true, email: true, name: true },
        },
      },
    });
  }

  /**
   * Find transaction by reference (idempotency check)
   */
  async findByReference(reference: string): Promise<Transaction | null> {
    return this.prisma.transaction.findUnique({
      where: { reference },
    });
  }

  /**
   * Get transactions for a wallet
   */
  async findByWalletId(
    walletId: string,
    options?: {
      type?: TransactionType;
      limit?: number;
      offset?: number;
      fromDate?: Date;
      toDate?: Date;
    },
  ): Promise<Transaction[]> {
    return this.prisma.transaction.findMany({
      where: {
        walletId,
        type: options?.type,
        createdAt: {
          gte: options?.fromDate,
          lte: options?.toDate,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 50,
      skip: options?.offset || 0,
      include: {
        performedBy: {
          select: { id: true, email: true, name: true },
        },
      },
    });
  }

  /**
   * Get transaction summary for a wallet
   */
  async getSummary(walletId: string): Promise<{
    totalCredits: number | string;
    totalDebits: number | string;
    transactionCount: number;
  }> {
    const [credits, debits, count] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: { walletId, type: TransactionType.CREDIT },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: { walletId, type: TransactionType.DEBIT },
        _sum: { amount: true },
      }),
      this.prisma.transaction.count({ where: { walletId } }),
    ]);

    return {
      totalCredits: credits._sum.amount ? Number(credits._sum.amount) : 0,
      totalDebits: debits._sum.amount ? Number(debits._sum.amount) : 0,
      transactionCount: count,
    };
  }
}
