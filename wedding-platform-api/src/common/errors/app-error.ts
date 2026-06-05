import type { ErrorCode } from '@wedding/shared/errors';

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly statusCode: number = 400,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
  }

  static notFound(resource: string, id?: string): AppError {
    return new AppError(
      'RESOURCE_NOT_FOUND',
      `${resource}${id ? ` (id: ${id})` : ''} not found`,
      404,
    );
  }

  static forbidden(message = 'Access denied'): AppError {
    return new AppError('PERMISSION_DENIED', message, 403);
  }

  static badRequest(message: string, details?: Record<string, unknown>): AppError {
    return new AppError('VALIDATION_ERROR', message, 400, details);
  }

  static conflict(message: string): AppError {
    return new AppError('RESOURCE_CONFLICT', message, 409);
  }

  static internal(message = 'Internal server error'): AppError {
    return new AppError('INTERNAL_ERROR', message, 500);
  }
}
