import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ZodError } from 'zod';
import { ThrottlerException } from '@nestjs/throttler';
import type { ApiErrorResponse, ErrorCode } from '@wedding/shared/errors';
import { BusinessException } from '../exceptions/business.exception';
import { AppError } from '../errors/app-error';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code: ErrorCode = 'INTERNAL_ERROR';
    let message = '服务器内部错误';
    let details: unknown = undefined;

    if (exception instanceof AppError) {
      status = exception.statusCode;
      code = exception.code;
      message = exception.message;
      details = exception.details;
    } else if (exception instanceof BusinessException) {
      status = exception.getStatus();
      code = exception.errorCode;
      message = exception.message;
      details = (exception.getResponse() as ApiErrorResponse).details;
    } else if (exception instanceof ThrottlerException) {
      status = HttpStatus.TOO_MANY_REQUESTS;
      code = 'RATE_LIMIT_EXCEEDED';
      message = '请求过于频繁，请稍后再试';
    } else if (exception instanceof ZodError) {
      status = HttpStatus.BAD_REQUEST;
      code = 'VALIDATION_ERROR';
      message = exception.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
      details = exception.issues;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      code = this.httpStatusToCode(status, exception.message);
      message = this.sanitizeMessage(exception.message);
      const res = exception.getResponse();
      if (typeof res === 'object' && res !== null) {
        const r = res as Record<string, unknown>;
        if (typeof r.message === 'string') message = r.message;
        else if (Array.isArray(r.message)) message = r.message.join('; ');
      }
    } else if (exception instanceof Error) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      code = 'INTERNAL_ERROR';
      message = exception.message;
      details = process.env.NODE_ENV !== 'production' ? exception.stack?.slice(0, 500) : undefined;
    }

    const body: ApiErrorResponse = { code, message, details, statusCode: status };

    if (status >= 500) {
      this.logger.error(`[${code}] ${request.method} ${request.url} — ${message}`, details);
    }

    response.status(status).json(body);
  }

  private httpStatusToCode(status: number, _msg: string): ErrorCode {
    switch (status) {
      case 400: return 'VALIDATION_ERROR';
      case 401: return 'AUTH_TOKEN_INVALID';
      case 403: return 'PERMISSION_DENIED';
      case 404: return 'RESOURCE_NOT_FOUND';
      case 409: return 'RESOURCE_CONFLICT';
      case 429: return 'RATE_LIMIT_EXCEEDED';
      default: return status >= 500 ? 'INTERNAL_ERROR' : 'INTERNAL_ERROR';
    }
  }

  private sanitizeMessage(msg: string): string {
    // Strip "NotFoundException:" and similar NestJS prefixes
    return msg.replace(/^(NotFoundException|BadRequestException|UnauthorizedException|ForbiddenException|ConflictException|InternalServerErrorException):\s*/i, '');
  }
}
