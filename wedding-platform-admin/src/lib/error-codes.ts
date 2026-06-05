/**
 * 错误码 → 用户可读中文提示映射
 * 与后端 packages/shared/src/errors.ts 保持一致
 */

export const ERROR_CODE_MESSAGE: Record<string, string> = {
  // Auth
  AUTH_INVALID_CREDENTIALS: '账号或密码错误',
  AUTH_TOKEN_EXPIRED: '登录已过期，请重新登录',
  AUTH_TOKEN_INVALID: '登录凭证无效，请重新登录',
  AUTH_REFRESH_FAILED: '自动登录失败，请重新登录',

  // Permission
  PERMISSION_DENIED: '权限不足，请联系管理员',
  TENANT_REQUIRED: '请先选择工作空间',

  // Validation
  VALIDATION_ERROR: '请检查输入内容',

  // Resource
  RESOURCE_NOT_FOUND: '请求的资源不存在',
  RESOURCE_CONFLICT: '操作冲突，数据可能已被修改',

  // Rate Limit
  RATE_LIMIT_EXCEEDED: '操作过于频繁，请稍后再试',

  // AI
  AI_GENERATION_FAILED: 'AI 生成失败',
  AI_QUOTA_INSUFFICIENT: 'AI 配额已用完，请稍后再试',
  AI_PROVIDER_ERROR: 'AI 服务暂不可用，请稍后重试',

  // Storage
  STORAGE_UPLOAD_FAILED: '文件上传失败',
  STORAGE_FILE_TOO_LARGE: '文件大小超出限制',

  // Contract
  CONTRACT_SIGN_FAILED: '合同签署失败',
  CONTRACT_ALREADY_SIGNED: '合同已签署，无需重复操作',

  // Internal
  INTERNAL_ERROR: '系统繁忙，请稍后重试',
};

/** 需要 toast 弹窗提醒的错误码（非静默） */
const TOAST_ERROR_CODES = new Set([
  'AUTH_INVALID_CREDENTIALS',
  'PERMISSION_DENIED',
  'RATE_LIMIT_EXCEEDED',
  'AI_QUOTA_INSUFFICIENT',
  'INTERNAL_ERROR',
]);

export function getErrorMessage(code: string, fallback?: string): string {
  return ERROR_CODE_MESSAGE[code] ?? fallback ?? '请求失败';
}

export function shouldToastError(code: string): boolean {
  return TOAST_ERROR_CODES.has(code);
}

export interface ApiErrorResponse {
  code: string;
  message: string;
  details?: unknown;
  statusCode: number;
}
