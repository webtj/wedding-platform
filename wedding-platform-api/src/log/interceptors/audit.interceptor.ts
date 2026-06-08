import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap, catchError, throwError } from 'rxjs';
import type { AuthContext } from '../../common/auth/auth-context';
import { AUDIT_LOG_KEY, type AuditLogMetadata } from '../decorators/audit-log.decorator';
import { LogQueueService } from '../log-queue.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly logQueue: LogQueueService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const metadata = this.reflector.get<AuditLogMetadata>(
      AUDIT_LOG_KEY,
      context.getHandler(),
    );

    // No @AuditLog decorator — pass through
    if (!metadata) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Record<string, any>>();
    const auth: AuthContext | undefined = request.auth;
    const startTime = Date.now();

    return next.handle().pipe(
      tap((result) => {
        // Extract entity info from result if available
        const entity = this.extractEntity(context, result);
        const entityId = this.extractEntityId(result, request);

        this.logQueue.addAudit({
          action: metadata.action,
          entity: entity,
          entityId: entityId,
          userId: auth?.userId,
          tenantId: auth?.tenantId ?? undefined,
          changes: request.body,
          metadata: {
            method: request.method,
            path: request.originalUrl || request.url,
            duration: Date.now() - startTime,
            traceId: request.traceId ?? request.requestId,
          },
        });
      }),
      catchError((error) => {
        this.logQueue.addAudit({
          action: `${metadata.action}:failed`,
          entity: this.extractEntity(context),
          entityId: this.extractEntityId(undefined, request),
          userId: auth?.userId,
          tenantId: auth?.tenantId ?? undefined,
          changes: request.body,
          metadata: {
            method: request.method,
            path: request.originalUrl || request.url,
            duration: Date.now() - startTime,
            traceId: request.traceId ?? request.requestId,
            error: error instanceof Error ? error.message : String(error),
          },
        });

        return throwError(() => error);
      }),
    );
  }

  private extractEntity(context: ExecutionContext, result?: unknown): string {
    // Try to infer entity from the controller class name
    const controllerName = context.getClass().name;
    // Strip "Controller" suffix and convert to snake_case-ish entity name
    return controllerName
      .replace(/Controller$/, '')
      .replace(/([a-z])([A-Z])/g, '$1_$2')
      .toLowerCase();
  }

  private extractEntityId(
    result?: unknown,
    request?: Record<string, any>,
  ): string {
    const fromResult = this.readId(result);
    if (fromResult) return fromResult;

    const fromRequest =
      this.readId(request?.params) ??
      this.readId(request?.body) ??
      this.readId(request?.query);

    return fromRequest ?? 'unknown';
  }

  private readId(source: unknown): string | null {
    if (!source || typeof source !== 'object') return null;

    const record = source as Record<string, unknown>;
    for (const key of ['id', 'entityId', 'recordId']) {
      const value = record[key];
      if (typeof value === 'string' || typeof value === 'number') {
        return String(value);
      }
    }

    for (const key of ['data', 'result', 'entity', 'payload']) {
      const nested = this.readId(record[key]);
      if (nested) return nested;
    }

    return null;
  }
}
