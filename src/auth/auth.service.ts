import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { AuditService } from '../audit/audit.service';
import { User, RefreshToken } from '@prisma/client';
import {
  verifyPassword,
  validatePasswordPolicy,
  isPasswordBreached,
} from '../common/utils/password.utils';
import { generateSecureToken, hashToken } from '../common/utils/crypto.utils';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

/**
 * Token payload interface
 */
export interface TokenPayload {
  sub: string; // User ID
  email: string;
  roles: string[];
}

/**
 * Tokens response interface
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * AuthService - Core authentication logic
 *
 * Features:
 * - Password validation and hashing with Argon2
 * - JWT access tokens (short-lived)
 * - Refresh tokens (long-lived, stored in DB)
 * - Token rotation and revocation
 * - Account lockout protection
 * - HIBP password breach checking
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Register a new user with email/password
   */
  async register(
    dto: RegisterDto,
    ip?: string,
    userAgent?: string,
  ): Promise<{ user: Partial<User>; tokens: AuthTokens }> {
    // Validate password policy
    const policyCheck = validatePasswordPolicy(dto.password);
    if (!policyCheck.isValid) {
      throw new BadRequestException(policyCheck.errors);
    }

    // Check if password has been breached (HIBP)
    const isBreached = await isPasswordBreached(dto.password);
    if (isBreached) {
      throw new BadRequestException(
        'This password has appeared in a data breach. Please choose a different password.',
      );
    }

    // Create user
    const user = await this.usersService.create({
      email: dto.email,
      password: dto.password,
      name: dto.name,
    });

    // Generate tokens
    const tokens = await this.generateTokens(user, ip, userAgent);

    // Audit log
    await this.auditService.log({
      actorUserId: user.id,
      entity: 'User',
      entityId: user.id,
      action: 'CREATE',
      changes: { email: user.email, name: user.name },
      ip,
      userAgent,
    });

    return {
      user: this.usersService.sanitizeUser(user),
      tokens,
    };
  }

  /**
   * Validate user credentials for local login
   */
  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersService.findByEmail(email);

    if (!user || !user.passwordHash) {
      return null;
    }

    const isValid = await verifyPassword(user.passwordHash, password);
    return isValid ? user : null;
  }

  /**
   * Login with email/password
   */
  async login(
    dto: LoginDto,
    ip?: string,
    userAgent?: string,
  ): Promise<{ user: Partial<User>; tokens: AuthTokens }> {
    const user = await this.usersService.findByEmail(dto.email);

    // User not found - delay response to prevent timing attacks
    if (!user) {
      await this.delay(100);
      await this.auditService.logFailedLogin(
        dto.email,
        ip || null,
        userAgent || null,
        'User not found',
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check account lockout
    if (this.usersService.isAccountLocked(user)) {
      const remainingSeconds = this.usersService.getLockTimeRemaining(user);
      await this.auditService.logFailedLogin(
        dto.email,
        ip || null,
        userAgent || null,
        'Account locked',
      );
      throw new UnauthorizedException(
        `Account is temporarily locked. Try again in ${Math.ceil(remainingSeconds / 60)} minutes.`,
      );
    }

    // OAuth-only user trying to use password
    if (!user.passwordHash) {
      throw new UnauthorizedException(
        'This account uses Google sign-in. Please use "Sign in with Google".',
      );
    }

    // Verify password
    const isValid = await verifyPassword(user.passwordHash, dto.password);

    if (!isValid) {
      const lockResult = await this.usersService.recordFailedLogin(user.id);
      await this.auditService.logFailedLogin(
        dto.email,
        ip || null,
        userAgent || null,
        'Invalid password',
      );

      if (lockResult.locked) {
        throw new UnauthorizedException(
          `Too many failed attempts. Account locked until ${lockResult.lockedUntil?.toISOString()}.`,
        );
      }

      throw new UnauthorizedException('Invalid credentials');
    }

    // Successful login
    await this.usersService.recordSuccessfulLogin(user.id, ip);
    await this.auditService.logLogin(user.id, ip || null, userAgent || null);

    const tokens = await this.generateTokens(user, ip, userAgent);

    return {
      user: this.usersService.sanitizeUser(user),
      tokens,
    };
  }

  /**
   * Handle Google OAuth login/registration
   */
  async googleLogin(
    googleUser: { googleId: string; email: string; name?: string },
    ip?: string,
    userAgent?: string,
  ): Promise<{ user: Partial<User>; tokens: AuthTokens }> {
    const user = await this.usersService.upsertFromGoogle(googleUser);
    await this.usersService.recordSuccessfulLogin(user.id, ip);
    await this.auditService.logLogin(user.id, ip || null, userAgent || null);

    const tokens = await this.generateTokens(user, ip, userAgent);

    return {
      user: this.usersService.sanitizeUser(user),
      tokens,
    };
  }

  /**
   * Refresh access token using refresh token
   * Implements token rotation for security
   */
  async refreshTokens(
    refreshToken: string,
    ip?: string,
    userAgent?: string,
  ): Promise<AuthTokens> {
    const tokenHash = hashToken(refreshToken);

    // Find token in database
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Check if token is revoked
    if (storedToken.revoked) {
      // Potential token reuse attack - revoke all tokens for this user
      this.logger.warn(
        `Refresh token reuse detected for user ${storedToken.userId}`,
      );
      await this.revokeAllUserTokens(
        storedToken.userId,
        'Token reuse detected',
      );
      throw new UnauthorizedException(
        'Token has been revoked. Please login again.',
      );
    }

    // Check if token is expired
    if (storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    // Check if user still exists and is not deleted
    if (!storedToken.user || storedToken.user.deletedAt) {
      throw new UnauthorizedException('User not found');
    }

    // Rotate token: revoke old, create new
    const newTokens = await this.generateTokens(
      storedToken.user,
      ip,
      userAgent,
    );

    // Mark old token as replaced
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: {
        revoked: true,
        revokedAt: new Date(),
        revokedReason: 'Rotated',
      },
    });

    return newTokens;
  }

  /**
   * Logout - Revoke refresh token
   */
  async logout(
    refreshToken: string,
    userId: string,
    ip?: string,
    userAgent?: string,
  ): Promise<void> {
    const tokenHash = hashToken(refreshToken);

    await this.prisma.refreshToken.updateMany({
      where: {
        tokenHash,
        userId,
        revoked: false,
      },
      data: {
        revoked: true,
        revokedAt: new Date(),
        revokedReason: 'User logout',
      },
    });

    await this.auditService.logLogout(userId, ip || null, userAgent || null);
  }

  /**
   * Logout from all devices - Revoke all refresh tokens for a user
   */
  async logoutAll(userId: string): Promise<void> {
    await this.revokeAllUserTokens(userId, 'Logout from all devices');
  }

  /**
   * Generate access and refresh tokens
   */
  private async generateTokens(
    user: User,
    ip?: string,
    userAgent?: string,
  ): Promise<AuthTokens> {
    const payload: TokenPayload = {
      sub: user.id,
      email: user.email,
      roles: user.roles,
    };

    // Generate access token
    const accessToken = this.jwtService.sign(payload);
    const accessExpiresIn = this.parseExpiresIn(
      this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
    );

    // Generate refresh token
    const refreshToken = generateSecureToken(32);
    const refreshExpiresIn = this.parseExpiresIn(
      this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
    );

    // Store refresh token hash in database
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + refreshExpiresIn * 1000),
        ip,
        userAgent,
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: accessExpiresIn,
    };
  }

  /**
   * Revoke all refresh tokens for a user
   */
  private async revokeAllUserTokens(
    userId: string,
    reason: string,
  ): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        revoked: false,
      },
      data: {
        revoked: true,
        revokedAt: new Date(),
        revokedReason: reason,
      },
    });
  }

  /**
   * Parse expires in string to seconds
   * Supports: 15m, 1h, 7d, etc.
   */
  private parseExpiresIn(value: string): number {
    const match = value.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // Default 15 minutes

    const num = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return num;
      case 'm':
        return num * 60;
      case 'h':
        return num * 60 * 60;
      case 'd':
        return num * 60 * 60 * 24;
      default:
        return 900;
    }
  }

  /**
   * Delay helper for preventing timing attacks
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Clean up expired refresh tokens (run as scheduled job)
   */
  async cleanupExpiredTokens(): Promise<number> {
    const result = await this.prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          {
            revoked: true,
            revokedAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        ],
      },
    });

    this.logger.log(
      `Cleaned up ${result.count} expired/revoked refresh tokens`,
    );
    return result.count;
  }
}
