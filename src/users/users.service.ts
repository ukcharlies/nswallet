import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, Role, Prisma } from '../../generated/prisma';
import { hashPassword } from '../common/utils/password.utils';

/**
 * UsersService - User CRUD and authentication helpers
 */
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new user with email/password
   */
  async create(data: {
    email: string;
    password: string;
    name?: string;
    roles?: Role[];
  }): Promise<User> {
    // Check if email already exists
    const existing = await this.prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await hashPassword(data.password);

    return this.prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash,
        name: data.name,
        roles: data.roles || [Role.USER],
      },
    });
  }

  /**
   * Create or update user from Google OAuth
   */
  async upsertFromGoogle(data: {
    googleId: string;
    email: string;
    name?: string;
  }): Promise<User> {
    return this.prisma.user.upsert({
      where: { googleId: data.googleId },
      update: {
        name: data.name,
        lastLoginAt: new Date(),
      },
      create: {
        googleId: data.googleId,
        email: data.email.toLowerCase(),
        name: data.name,
        isEmailVerified: true, // Google accounts are pre-verified
        roles: [Role.USER],
      },
    });
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  /**
   * Find user by ID - throws if not found
   */
  async findByIdOrFail(id: string): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  /**
   * Find user by Google ID
   */
  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { googleId },
    });
  }

  /**
   * Update user
   */
  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  /**
   * Record successful login
   */
  async recordSuccessfulLogin(id: string, ip?: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: ip,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
  }

  /**
   * Record failed login attempt and potentially lock account
   */
  async recordFailedLogin(
    id: string,
  ): Promise<{ locked: boolean; lockedUntil?: Date }> {
    const user = await this.findByIdOrFail(id);
    const attempts = user.failedLoginAttempts + 1;
    const threshold = parseInt(process.env.LOCKOUT_THRESHOLD || '5', 10);
    const baseDuration = parseInt(
      process.env.LOCKOUT_DURATION_MINUTES || '15',
      10,
    );

    let lockedUntil: Date | null = null;
    let locked = false;

    if (attempts >= threshold) {
      // Progressive lockout: double duration for each successive lockout
      const lockoutMultiplier = Math.floor(attempts / threshold);
      const lockoutMinutes = baseDuration * Math.pow(2, lockoutMultiplier - 1);
      lockedUntil = new Date(Date.now() + lockoutMinutes * 60 * 1000);
      locked = true;

      this.logger.warn(
        `Account ${user.email} locked until ${lockedUntil.toISOString()} after ${attempts} failed attempts`,
      );
    }

    await this.prisma.user.update({
      where: { id },
      data: {
        failedLoginAttempts: attempts,
        lockedUntil,
      },
    });

    return { locked, lockedUntil: lockedUntil || undefined };
  }

  /**
   * Check if account is currently locked
   */
  isAccountLocked(user: User): boolean {
    if (!user.lockedUntil) return false;
    return new Date() < user.lockedUntil;
  }

  /**
   * Get time remaining on account lock
   */
  getLockTimeRemaining(user: User): number {
    if (!user.lockedUntil) return 0;
    const remaining = user.lockedUntil.getTime() - Date.now();
    return Math.max(0, Math.ceil(remaining / 1000)); // Return seconds
  }

  /**
   * Verify email address
   */
  async verifyEmail(id: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: {
        isEmailVerified: true,
        emailVerifyToken: null,
        emailVerifyExpires: null,
      },
    });
  }

  /**
   * Set password reset token
   */
  async setPasswordResetToken(
    id: string,
    token: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: {
        passwordResetToken: token,
        passwordResetExpires: expiresAt,
      },
    });
  }

  /**
   * Reset password
   */
  async resetPassword(id: string, newPassword: string): Promise<void> {
    const passwordHash = await hashPassword(newPassword);
    await this.prisma.user.update({
      where: { id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
  }

  /**
   * Soft delete user
   */
  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({
      where: { id },
    });
  }

  /**
   * Get user profile (safe fields only)
   */
  sanitizeUser(user: User): Partial<User> {
    const { passwordHash, emailVerifyToken, passwordResetToken, ...safe } =
      user;
    return safe;
  }
}
