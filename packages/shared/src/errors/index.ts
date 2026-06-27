/**
 * MOY 统一错误体系
 *
 * 设计原则：
 * 1. 所有业务错误必须使用 AppError 或其子类，禁止直接 throw 字符串或裸 Error。
 * 2. 每个错误携带稳定的 errorCode（机器可读）+ httpStatus（HTTP 映射）+ 可读 message + 可选 details。
 * 3. 错误码命名：DOMAIN_REASON，全大写下划线分隔。
 * 4. API 层在错误处理中间件统一将 AppError 序列化为标准响应体。
 */
import { ErrorCode } from '../constants/error-codes.js';

// 重新导出 ErrorCode，便于消费者从 errors 模块一次性获取错误体系
export { ErrorCode } from '../constants/error-codes.js';
export type { ErrorCodeValue } from '../constants/error-codes.js';

export type ErrorDetails = Record<string, unknown>;

export interface AppErrorOptions {
  code?: string;
  message: string;
  httpStatus?: number;
  details?: ErrorDetails;
  cause?: unknown;
  /** 是否为用户可见错误（默认 true）。false 表示内部错误，message 不应直接暴露给前端。 */
  expose?: boolean;
}

export class AppError extends Error {
  readonly code: string;
  readonly httpStatus: number;
  readonly details?: ErrorDetails;
  readonly expose: boolean;

  constructor(opts: AppErrorOptions) {
    super(opts.message, { cause: opts.cause });
    this.name = this.constructor.name;
    this.code = opts.code ?? ErrorCode.INTERNAL_ERROR;
    this.httpStatus = opts.httpStatus ?? 500;
    this.details = opts.details;
    this.expose = opts.expose ?? true;
    // 维持栈追踪
    Error.captureStackTrace?.(this, this.constructor);
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.expose ? this.message : 'Internal server error',
      httpStatus: this.httpStatus,
      ...(this.details ? { details: this.details } : {}),
    };
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: ErrorDetails) {
    super({
      code: ErrorCode.VALIDATION_ERROR,
      message,
      httpStatus: 400,
      details,
    });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = '未认证或登录已失效') {
    super({ code: ErrorCode.UNAUTHORIZED, message, httpStatus: 401 });
  }
}

export class ForbiddenError extends AppError {
  constructor(message = '无权限执行此操作') {
    super({ code: ErrorCode.FORBIDDEN, message, httpStatus: 403 });
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string | number) {
    super({
      code: ErrorCode.NOT_FOUND,
      message: id ? `${resource} 不存在: ${String(id)}` : `${resource} 不存在`,
      httpStatus: 404,
      details: id ? { resource, id } : { resource },
    });
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: ErrorDetails) {
    super({ code: ErrorCode.CONFLICT, message, httpStatus: 409, details });
  }
}

export class TenantIsolationError extends AppError {
  constructor(message = '租户隔离违规：试图访问跨租户资源') {
    super({
      code: ErrorCode.TENANT_ISOLATION_VIOLATION,
      message,
      httpStatus: 403,
      expose: false,
    });
  }
}

export class RateLimitError extends AppError {
  constructor(message = '请求过于频繁，请稍后再试') {
    super({ code: ErrorCode.RATE_LIMIT, message, httpStatus: 429 });
  }
}

export class LlmProviderError extends AppError {
  constructor(message: string, details?: ErrorDetails) {
    super({
      code: ErrorCode.LLM_PROVIDER_ERROR,
      message,
      httpStatus: 502,
      details,
      expose: false,
    });
  }
}

/**
 * 将未知异常归一化为 AppError。
 * 用于捕获 try/catch 中非 AppError 的抛出物。
 */
export function normalizeError(err: unknown): AppError {
  if (err instanceof AppError) return err;
  if (err instanceof Error) {
    return new AppError({
      code: ErrorCode.INTERNAL_ERROR,
      message: err.message,
      httpStatus: 500,
      cause: err,
      expose: false,
    });
  }
  return new AppError({
    code: ErrorCode.INTERNAL_ERROR,
    message: '未知内部错误',
    httpStatus: 500,
    details: { raw: String(err) },
    expose: false,
  });
}
