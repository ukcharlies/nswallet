import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request } from 'express';
import { AuditService } from '../../audit/audit.service';
import { AuditAction } from '../../../generated/prisma';

/**
 * Metadata key for marking methods that should be audited
 */
export const AUDIT_METADATA_KEY = 'audit';

export interface AuditMetadata {
  entity: string;
  action: AuditAction;
  // Function to extract entity ID from request/response
  getEntityId?: (req: Request, res: any) => string;
}

/**
 * Decorator to mark a method for auditing
 *
 * Usage:
 * @Audit({ entity: 'Wallet', action: AuditAction.CREATE })
 * @Post()
 * createWallet() { ... }
 */
export function Audit(metadata: AuditMetadata) {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(AUDIT_METADATA_KEY, metadata, descriptor.value);
    return descriptor;
  };
}

/**
 * AuditInterceptor - Automatically creates audit log entries for marked methods
 *
 * Features:
 * - Records who (user), what (entity, action), when (timestamp)
 * - Captures IP address and user agent
 * - Runs after successful request completion
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const handler = context.getHandler();
    const auditMetadata: AuditMetadata | undefined = Reflect.getMetadata(
      AUDIT_METADATA_KEY,
      handler,
    );

    // If no audit metadata, skip auditing
    if (!auditMetadata) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as any).user;

    return next.handle().pipe(
      tap(async (response) => {
        try {
          // Extract entity ID from response or request params
          let entityId = auditMetadata.getEntityId
            ? auditMetadata.getEntityId(request, response)
            : response?.id || request.params?.id || 'unknown';

          await this.auditService.log({
            actorUserId: user?.id || null,
            entity: auditMetadata.entity,
            entityId: String(entityId),
            action: auditMetadata.action,
            changes: this.getChanges(request, response, auditMetadata.action),
            ip: this.getClientIp(request),
            userAgent: request.headers['user-agent'] || null,
          });
        } catch (error) {
          // Don't fail the request if audit logging fails
          this.logger.error('Failed to create audit log', error);
        }
      }),
    );
  }

  /**
   * Extract changes for audit log based on action type
   */
  private getChanges(
    request: Request,
    response: any,
    action: AuditAction,
  ): Record<string, any> | null {
    switch (action) {
      case AuditAction.CREATE:
        return { created: this.sanitizeForAudit(response) };
      case AuditAction.UPDATE:
        return {
          requestBody: this.sanitizeForAudit(request.body),
          result: this.sanitizeForAudit(response),
        };
      case AuditAction.DELETE:
        return { deleted: { id: request.params?.id } };
      default:
        return null;
    }
  }

  /**
   * Remove sensitive fields from audit data
   */
  private sanitizeForAudit(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sensitiveFields = [
      'password',
      'passwordHash',
      'token',
      'tokenHash',
      'secret',
      'apiKey',
    ];

    const sanitized = { ...data };
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Get client IP, handling proxies
   */
  private getClientIp(request: Request): string {
    const forwardedFor = request.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = Array.isArray(forwardedFor)
        ? forwardedFor[0]
        : forwardedFor.split(',')[0];
      return ips.trim();
    }
    return request.ip || request.socket.remoteAddress || 'unknown';
  }
}
