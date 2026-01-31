import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  Get,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService, AuthTokens } from './auth.service';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import type { User } from '@prisma/client';

/**
 * AuthController - Authentication endpoints
 *
 * Endpoints:
 * - POST /auth/register - Register new user
 * - POST /auth/login - Login with email/password
 * - POST /auth/refresh - Refresh access token
 * - POST /auth/logout - Logout (revoke refresh token)
 * - POST /auth/logout-all - Logout from all devices
 * - GET /auth/google - Initiate Google OAuth
 * - GET /auth/google/callback - Google OAuth callback
 */
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Register new user with email/password
   */
  @Public()
  @Post('register')
  async register(
    @Body() registerDto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip = this.getClientIp(req);
    const userAgent = req.headers['user-agent'];

    const { user, tokens } = await this.authService.register(
      registerDto,
      ip,
      userAgent,
    );

    this.setRefreshTokenCookie(res, tokens.refreshToken);

    return {
      user,
      accessToken: tokens.accessToken,
      expiresIn: tokens.expiresIn,
    };
  }

  /**
   * Login with email/password
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip = this.getClientIp(req);
    const userAgent = req.headers['user-agent'];

    const { user, tokens } = await this.authService.login(
      loginDto,
      ip,
      userAgent,
    );

    this.setRefreshTokenCookie(res, tokens.refreshToken);

    return {
      user,
      accessToken: tokens.accessToken,
      expiresIn: tokens.expiresIn,
    };
  }

  /**
   * Refresh access token using refresh token
   * Accepts token from cookie or body
   */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() body: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Get refresh token from cookie or body
    const refreshToken = req.cookies?.refreshToken || body.refreshToken;

    if (!refreshToken) {
      throw new Error('Refresh token is required');
    }

    const ip = this.getClientIp(req);
    const userAgent = req.headers['user-agent'];

    const tokens = await this.authService.refreshTokens(
      refreshToken,
      ip,
      userAgent,
    );

    this.setRefreshTokenCookie(res, tokens.refreshToken);

    return {
      accessToken: tokens.accessToken,
      expiresIn: tokens.expiresIn,
    };
  }

  /**
   * Logout - Revoke refresh token
   */
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: User,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.refreshToken;

    if (refreshToken) {
      const ip = this.getClientIp(req);
      const userAgent = req.headers['user-agent'];
      await this.authService.logout(refreshToken, user.id, ip, userAgent);
    }

    this.clearRefreshTokenCookie(res);

    return { message: 'Logged out successfully' };
  }

  /**
   * Logout from all devices
   */
  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  async logoutAll(
    @CurrentUser() user: User,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logoutAll(user.id);
    this.clearRefreshTokenCookie(res);

    return { message: 'Logged out from all devices' };
  }

  /**
   * Initiate Google OAuth flow
   */
  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // Guard redirects to Google
  }

  /**
   * Google OAuth callback
   */
  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const googleUser = req.user as {
      googleId: string;
      email: string;
      name?: string;
    };
    const ip = this.getClientIp(req);
    const userAgent = req.headers['user-agent'];

    const { user, tokens } = await this.authService.googleLogin(
      googleUser,
      ip,
      userAgent,
    );

    this.setRefreshTokenCookie(res, tokens.refreshToken);

    // Redirect to frontend with access token
    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3001',
    );
    res.redirect(`${frontendUrl}/auth/callback?token=${tokens.accessToken}`);
  }

  /**
   * Set secure HTTP-only cookie for refresh token
   */
  private setRefreshTokenCookie(res: Response, token: string): void {
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';
    const domain = this.configService.get<string>('COOKIE_DOMAIN', 'localhost');
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

    res.cookie('refreshToken', token, {
      httpOnly: true, // Not accessible via JavaScript
      secure: isProduction, // HTTPS only in production
      sameSite: isProduction ? 'strict' : 'lax', // CSRF protection
      domain: isProduction ? domain : undefined,
      path: '/auth', // Only sent to auth endpoints
      maxAge,
    });
  }

  /**
   * Clear refresh token cookie
   */
  private clearRefreshTokenCookie(res: Response): void {
    res.clearCookie('refreshToken', {
      httpOnly: true,
      path: '/auth',
    });
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
