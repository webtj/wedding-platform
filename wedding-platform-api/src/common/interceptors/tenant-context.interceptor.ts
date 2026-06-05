import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    // Extract tenant context from JWT token
    if (request.auth) {
      request.tenantContext = {
        tenantId: request.auth.tenantId,
        userId: request.auth.userId,
        memberId: request.auth.memberId
      };
    }

    return next.handle();
  }
}
