import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditAction, AuditLog } from '../../generated/prisma';

/**
 * DTO for creating audit log entries
 */
export interface CreateAuditLogDto {
  actorUserId: string | null;
  entity: string;
  entityId: string;
  action: AuditAction;
  changes?: Record<string, any> | null;
  ip?: string | null;
  userAgent?: string | null;
}

/**
 * AuditService - Records all significant system events
 *
 * Features:
 * - Immutable audit trail (append-only)
 * - Captures actor, action, entity, changes, and request context
 * - Supports JSON diff for update operations
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create an audit log entry
   */
  async log(dto: CreateAuditLogDto): Promise<AuditLog> {
    try {
      const auditLog = await this.prisma.auditLog.create({
        data: {
          actorUserId: dto.actorUserId,
          entity: dto.entity,
          entityId: dto.entityId,
          action: dto.action,
          changes: dto.changes || undefined,
          ip: dto.ip,
          userAgent: dto.userAgent,
        },
      });

      this.logger.debug(
        `Audit: ${dto.action} on ${dto.entity}:${dto.entityId} by user:${dto.actorUserId}`,
      );

      return auditLog;
    } catch (error) {
      this.logger.error('Failed to create audit log', error);
      throw error;
    }
  }

  /**
   * Log a successful login
   */
  async logLogin(
    userId: string,
    ip: string | null,
    userAgent: string | null,
  ): Promise<void> {
    await this.log({
      actorUserId: userId,
      entity: 'User',
      entityId: userId,
      action: AuditAction.LOGIN,
      ip,
      userAgent,
    });
  }

  /**
   * Log a failed login attempt
   */
  async logFailedLogin(
    email: string,
    ip: string | null,
    userAgent: string | null,
    reason: string,
  ): Promise<void> {
    await this.log({
      actorUserId: null,
      entity: 'User',
      entityId: email, // Use email since we may not have user ID
      action: AuditAction.LOGIN_FAILED,
      changes: { reason },
      ip,
      userAgent,
    });
  }

  /**
   * Log a logout event
   */
  async logLogout(
    userId: string,
    ip: string | null,
    userAgent: string | null,
  ): Promise<void> {
    await this.log({
      actorUserId: userId,
      entity: 'User',
      entityId: userId,
      action: AuditAction.LOGOUT,
      ip,
      userAgent,
    });
  }

  /**
   * Generate a JSON diff between two objects for audit logging
   * Useful for UPDATE operations to show what changed
   */
  generateDiff(
    before: Record<string, any>,
    after: Record<string, any>,
  ): Record<string, { old: any; new: any }> {
    const diff: Record<string, { old: any; new: any }> = {};

    // Sensitive fields to exclude from diff
    const excludeFields = ['passwordHash', 'tokenHash', 'secret'];

    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

    for (const key of allKeys) {
      if (excludeFields.includes(key)) continue;

      const oldValue = before[key];
      const newValue = after[key];

      // Simple comparison (doesn't deep compare objects)
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        diff[key] = { old: oldValue, new: newValue };
      }
    }

    return diff;
  }

  /**
   * Query audit logs with filtering
   */
  async findMany(options: {
    entity?: string;
    entityId?: string;
    actorUserId?: string;
    action?: AuditAction;
    fromDate?: Date;
    toDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<AuditLog[]> {
    return this.prisma.auditLog.findMany({
      where: {
        entity: options.entity,
        entityId: options.entityId,
        actorUserId: options.actorUserId,
        action: options.action,
        createdAt: {
          gte: options.fromDate,
          lte: options.toDate,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: options.limit || 100,
      skip: options.offset || 0,
      include: {
        actor: {
          select: { id: true, email: true, name: true },
        },
      },
    });
  }
}
