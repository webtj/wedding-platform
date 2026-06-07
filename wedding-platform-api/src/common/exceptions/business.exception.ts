import { HttpException, HttpStatus } from '@nestjs/common';
import type { ApiErrorResponse, ErrorCode } from '@wedding/shared/errors';

export class BusinessException extends HttpException {
  public readonly errorCode: ErrorCode;

  constructor(code: ErrorCode, message: string, status: HttpStatus = HttpStatus.BAD_REQUEST, details?: unknown) {
    const body: ApiErrorResponse = { code, message, details, statusCode: status };
    super(body, status);
    this.errorCode = code;
  }

  static notFound(resource: string) {
    return new BusinessException('RESOURCE_NOT_FOUND', `${resource} 不存在`, HttpStatus.NOT_FOUND);
  }

  /**
   * 403 PERMISSION_DENIED. `details` may include:
   * - `requiredPermissions`: string[] of permission codes the action needs
   * - `resource`: optional human-readable label of the resource the user tried
   *   to access (e.g. "项目", "角色管理"). The frontend surfaces this in the
   *   403 panel to tell the user what they're missing and which menu/permission
   *   would unblock them.
   */
  static permissionDenied(details?: {
    requiredPermissions?: string[];
    resource?: string;
  }) {
    return new BusinessException(
      'PERMISSION_DENIED',
      '权限不足，请联系管理员',
      HttpStatus.FORBIDDEN,
      details
    );
  }

  static validationError(message: string) {
    return new BusinessException('VALIDATION_ERROR', message, HttpStatus.BAD_REQUEST);
  }

  static internal(message = '服务器内部错误') {
    return new BusinessException('INTERNAL_ERROR', message, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
