import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { AuthContext } from '../../common/auth/auth-context';
import { LogQueueService } from '../log-queue.service';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly logQueue: LogQueueService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof Error ? exception.message : 'Unknown error';

    const stack = exception instanceof Error ? exception.stack : undefined;

    const auth: AuthContext | undefined = request.auth;
    const traceId: string | undefined = request.traceId ?? request.requestId;

    // Queue error log asynchronously (non-blocking)
    this.logQueue.addError({
      traceId: traceId ?? 'unknown',
      message,
      stack,
      path: request.originalUrl || request.url,
      userId: auth?.userId,
      tenantId: auth?.tenantId ?? undefined,
      requestBody: request.body,
    });

    // Only log 5xx errors at error level to avoid noise
    if (status >= 500) {
      this.logger.error(
        `[${traceId}] ${request.method} ${request.originalUrl} — ${message}`,
        stack,
      );
    }

    // Re-throw to let the existing HttpExceptionFilter handle the response
    if (exception instanceof Error) {
      throw exception;
    }
    throw new Error(String(exception));
  }
}
