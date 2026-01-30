import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { WalletsService } from './wallets.service';
import { TransactionsService } from './transactions.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { FundWalletDto } from './dto/fund-wallet.dto';
import { WithdrawWalletDto } from './dto/withdraw-wallet.dto';
import type { User } from '../../generated/prisma';
import { TransactionType } from '../../generated/prisma';

/**
 * WalletsController - Wallet management endpoints
 */
@Controller('wallets')
@UseGuards(JwtAuthGuard)
export class WalletsController {
  constructor(
    private readonly walletsService: WalletsService,
    private readonly transactionsService: TransactionsService,
  ) {}

  /**
   * Create a new wallet
   * POST /wallets
   */
  @Post()
  async create(
    @CurrentUser() user: User,
    @Body() createWalletDto: CreateWalletDto,
    @Req() req: Request,
  ) {
    const ip = this.getClientIp(req);
    const userAgent = req.headers['user-agent'];

    return this.walletsService.create(user.id, createWalletDto, ip, userAgent);
  }

  /**
   * Get all wallets for current user
   * GET /wallets
   */
  @Get()
  async findAll(@CurrentUser() user: User) {
    return this.walletsService.findByUserId(user.id);
  }

  /**
   * Get wallet by ID
   * GET /wallets/:id
   */
  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    const wallet = await this.walletsService.findByIdOrFail(id);

    // Verify ownership
    if (wallet.userId !== user.id) {
      throw new Error('Wallet not found');
    }

    return wallet;
  }

  /**
   * Get wallet transactions
   * GET /wallets/:id/transactions
   */
  @Get(':id/transactions')
  async getTransactions(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Query('type') type?: TransactionType,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const wallet = await this.walletsService.findByIdOrFail(id);

    // Verify ownership
    if (wallet.userId !== user.id) {
      throw new Error('Wallet not found');
    }

    return this.transactionsService.findByWalletId(id, {
      type,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  /**
   * Get wallet transaction summary
   * GET /wallets/:id/summary
   */
  @Get(':id/summary')
  async getSummary(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    const wallet = await this.walletsService.findByIdOrFail(id);

    // Verify ownership
    if (wallet.userId !== user.id) {
      throw new Error('Wallet not found');
    }

    const summary = await this.transactionsService.getSummary(id);

    return {
      wallet,
      summary,
    };
  }

  /**
   * Fund wallet (add funds)
   * PATCH /wallets/:id/fund
   */
  @Patch(':id/fund')
  async fund(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() fundWalletDto: FundWalletDto,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    const wallet = await this.walletsService.findByIdOrFail(id);

    // Verify ownership
    if (wallet.userId !== user.id) {
      throw new Error('Wallet not found');
    }

    const ip = this.getClientIp(req);
    const userAgent = req.headers['user-agent'];

    return this.walletsService.fund(id, fundWalletDto, user.id, ip, userAgent);
  }

  /**
   * Withdraw from wallet
   * PATCH /wallets/:id/withdraw
   */
  @Patch(':id/withdraw')
  async withdraw(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() withdrawWalletDto: WithdrawWalletDto,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    const wallet = await this.walletsService.findByIdOrFail(id);

    // Verify ownership
    if (wallet.userId !== user.id) {
      throw new Error('Wallet not found');
    }

    const ip = this.getClientIp(req);
    const userAgent = req.headers['user-agent'];

    return this.walletsService.withdraw(
      id,
      withdrawWalletDto,
      user.id,
      ip,
      userAgent,
    );
  }

  /**
   * Delete wallet (soft delete)
   * DELETE /wallets/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Req() req: Request,
  ) {
    const ip = this.getClientIp(req);
    const userAgent = req.headers['user-agent'];

    await this.walletsService.delete(id, user.id, ip, userAgent);
  }

  /**
   * Get client IP, handling proxies
   */
  private getClientIp(req: Request): string {
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = Array.isArray(forwardedFor)
        ? forwardedFor[0]
        : forwardedFor.split(',')[0];
      return ips.trim();
    }
    return req.ip || req.socket.remoteAddress || 'unknown';
  }
}

/**
 * UsersWalletsController - User-scoped wallet endpoints
 */
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersWalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  /**
   * Get all wallets for a specific user
   * GET /users/:userId/wallets
   *
   * Note: In production, add authorization check for admin or self access
   */
  @Get(':userId/wallets')
  async getUserWallets(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() currentUser: User,
  ) {
    // Only allow users to view their own wallets (or admins)
    if (
      userId !== currentUser.id &&
      !currentUser.roles.includes('ADMIN' as any)
    ) {
      throw new Error('Access denied');
    }

    return this.walletsService.findByUserId(userId);
  }
}
