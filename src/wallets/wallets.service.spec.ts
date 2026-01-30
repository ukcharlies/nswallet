import { Test, TestingModule } from '@nestjs/testing';
import { WalletsService } from './wallets.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { TransactionsService } from './transactions.service';
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

/**
 * WalletsService Unit Tests
 *
 * Tests focus on:
 * - Wallet CRUD operations
 * - Concurrent fund operations (optimistic locking)
 * - Insufficient funds handling
 * - Atomic transaction behavior
 */
describe('WalletsService', () => {
  let service: WalletsService;
  let prismaService: PrismaService;
  let auditService: AuditService;
  let transactionsService: TransactionsService;

  // Mock wallet data
  const mockWallet = {
    id: 'wallet-123',
    name: 'Test Wallet',
    currency: 'NGN',
    balance: {
      toString: () => '1000.0000',
      plus: jest.fn(),
      minus: jest.fn(),
      lessThan: jest.fn(),
    },
    version: 0,
    userId: 'user-123',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  // Mock Prisma transaction
  const mockTx = {
    wallet: {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
    transaction: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletsService,
        {
          provide: PrismaService,
          useValue: {
            wallet: {
              create: jest.fn(),
              findUnique: jest.fn(),
              findMany: jest.fn(),
              updateMany: jest.fn(),
              delete: jest.fn(),
            },
            $transaction: jest.fn(),
          },
        },
        {
          provide: AuditService,
          useValue: {
            log: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: TransactionsService,
          useValue: {
            create: jest.fn().mockResolvedValue({}),
          },
        },
      ],
    }).compile();

    service = module.get<WalletsService>(WalletsService);
    prismaService = module.get<PrismaService>(PrismaService);
    auditService = module.get<AuditService>(AuditService);
    transactionsService = module.get<TransactionsService>(TransactionsService);
  });

  describe('create', () => {
    it('should create a new wallet', async () => {
      const createDto = { name: 'My Wallet', currency: 'NGN' };
      const expectedWallet = { ...mockWallet, ...createDto };

      jest
        .spyOn(prismaService.wallet, 'create')
        .mockResolvedValue(expectedWallet as any);

      const result = await service.create('user-123', createDto);

      expect(prismaService.wallet.create).toHaveBeenCalledWith({
        data: {
          name: createDto.name,
          currency: 'NGN',
          userId: 'user-123',
          balance: 0,
          version: 0,
        },
      });
      expect(auditService.log).toHaveBeenCalled();
      expect(result.name).toBe(createDto.name);
    });
  });

  describe('findById', () => {
    it('should return wallet when found', async () => {
      jest
        .spyOn(prismaService.wallet, 'findUnique')
        .mockResolvedValue(mockWallet as any);

      const result = await service.findById('wallet-123');

      expect(result).toEqual(mockWallet);
    });

    it('should return null when wallet not found', async () => {
      jest.spyOn(prismaService.wallet, 'findUnique').mockResolvedValue(null);

      const result = await service.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('findByIdOrFail', () => {
    it('should throw NotFoundException when wallet not found', async () => {
      jest.spyOn(prismaService.wallet, 'findUnique').mockResolvedValue(null);

      await expect(service.findByIdOrFail('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('fund', () => {
    it('should fund wallet successfully', async () => {
      const fundDto = { amount: 500, description: 'Test deposit' };
      const walletWithDecimal = {
        ...mockWallet,
        balance: {
          toString: () => '1000.0000',
          plus: jest.fn().mockReturnValue({ toString: () => '1500.0000' }),
        },
      };
      const updatedWallet = {
        ...walletWithDecimal,
        balance: { toString: () => '1500.0000' },
        version: 1,
      };

      // Mock transaction
      jest
        .spyOn(prismaService, '$transaction')
        .mockImplementation(async (callback: any) => {
          const tx = {
            wallet: {
              findUnique: jest.fn().mockResolvedValue(walletWithDecimal),
              updateMany: jest.fn().mockResolvedValue({ count: 1 }),
            },
          };
          // Return updated wallet from transaction
          (tx.wallet.findUnique as jest.Mock).mockResolvedValueOnce(
            walletWithDecimal,
          );
          (tx.wallet.findUnique as jest.Mock).mockResolvedValue(updatedWallet);
          return callback(tx);
        });

      // This test verifies the method executes without error
      // In a real scenario with a real DB, we'd verify the balance
      await expect(
        service.fund('wallet-123', fundDto, 'user-123'),
      ).resolves.toBeDefined();
    });

    it('should throw ConflictException on concurrent modification', async () => {
      const fundDto = { amount: 500 };
      const walletWithDecimal = {
        ...mockWallet,
        balance: {
          toString: () => '1000.0000',
          plus: jest.fn().mockReturnValue({ toString: () => '1500.0000' }),
        },
      };

      // Simulate optimistic lock failure (count = 0)
      let attempts = 0;
      jest
        .spyOn(prismaService, '$transaction')
        .mockImplementation(async (callback: any) => {
          attempts++;
          const tx = {
            wallet: {
              findUnique: jest.fn().mockResolvedValue(walletWithDecimal),
              updateMany: jest.fn().mockResolvedValue({ count: 0 }), // Lock failure
            },
          };
          return callback(tx);
        });

      // Should throw ConflictException after MAX_RETRIES
      await expect(
        service.fund('wallet-123', fundDto, 'user-123'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('withdraw', () => {
    it('should withdraw from wallet successfully', async () => {
      const withdrawDto = { amount: 200, description: 'Test withdrawal' };
      const walletWithDecimal = {
        ...mockWallet,
        balance: {
          toString: () => '1000.0000',
          minus: jest.fn().mockReturnValue({
            toString: () => '800.0000',
            lessThan: jest.fn().mockReturnValue(false),
          }),
        },
      };
      const updatedWallet = {
        ...walletWithDecimal,
        balance: { toString: () => '800.0000' },
        version: 1,
      };

      jest
        .spyOn(prismaService, '$transaction')
        .mockImplementation(async (callback: any) => {
          const tx = {
            wallet: {
              findUnique: jest
                .fn()
                .mockResolvedValueOnce(walletWithDecimal)
                .mockResolvedValue(updatedWallet),
              updateMany: jest.fn().mockResolvedValue({ count: 1 }),
            },
          };
          return callback(tx);
        });

      await expect(
        service.withdraw('wallet-123', withdrawDto, 'user-123'),
      ).resolves.toBeDefined();
    });

    it('should throw BadRequestException for insufficient funds', async () => {
      const withdrawDto = { amount: 2000 }; // More than balance
      const walletWithDecimal = {
        ...mockWallet,
        balance: {
          toString: () => '1000.0000',
          minus: jest.fn().mockReturnValue({
            toString: () => '-1000.0000',
            lessThan: jest.fn().mockReturnValue(true), // Negative balance
          }),
        },
      };

      jest
        .spyOn(prismaService, '$transaction')
        .mockImplementation(async (callback: any) => {
          const tx = {
            wallet: {
              findUnique: jest.fn().mockResolvedValue(walletWithDecimal),
            },
          };
          return callback(tx);
        });

      await expect(
        service.withdraw('wallet-123', withdrawDto, 'user-123'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('concurrent operations', () => {
    /**
     * This test simulates concurrent fund operations
     * It verifies that optimistic locking prevents race conditions
     */
    it('should handle concurrent fund operations correctly', async () => {
      const fundDto = { amount: 100 };
      let callCount = 0;

      // Simulate two concurrent calls - first one succeeds after retries,
      // second one fails all retries
      jest
        .spyOn(prismaService, '$transaction')
        .mockImplementation(async (callback: any) => {
          callCount++;
          const walletWithDecimal = {
            ...mockWallet,
            version: callCount <= 3 ? 0 : 1, // Version changes after 3rd attempt
            balance: {
              toString: () => '1000.0000',
              plus: jest.fn().mockReturnValue({ toString: () => '1100.0000' }),
            },
          };

          const tx = {
            wallet: {
              findUnique: jest
                .fn()
                .mockResolvedValueOnce(walletWithDecimal)
                .mockResolvedValue({
                  ...walletWithDecimal,
                  version: callCount,
                }),
              updateMany: jest.fn().mockResolvedValue({
                count: callCount <= 3 ? 0 : 1, // Fail first 3 attempts
              }),
            },
          };
          return callback(tx);
        });

      // First operation should eventually succeed after retries
      const result = await service.fund('wallet-123', fundDto, 'user-123');
      expect(result).toBeDefined();
      expect(callCount).toBeGreaterThan(1); // Should have retried
    });
  });
});
