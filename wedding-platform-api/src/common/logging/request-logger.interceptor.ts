import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { AuthContext } from '../auth/auth-context';

@Injectable()
export class RequestLoggerInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const requestId: string = request.requestId ?? request.headers['x-request-id'];
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const response = context.switchToHttp().getResponse();
          const auth: AuthContext | undefined = request.auth;
          this.logger.log({
            requestId,
            method: request.method,
            path: request.url,
            statusCode: response.statusCode,
            duration,
            userId: auth?.userId,
            tenantId: auth?.tenantId,
          });
        },
        error: (error: Error) => {
          const duration = Date.now() - startTime;
          const auth: AuthContext | undefined = request.auth;
          this.logger.error({
            requestId,
            method: request.method,
            path: request.url,
            error: error.message,
            duration,
            userId: auth?.userId,
            tenantId: auth?.tenantId,
          });
        },
      }),
    );
  }
}
