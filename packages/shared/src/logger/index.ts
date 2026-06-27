/**
 * MOY 结构化日志接口
 *
 * 设计原则：
 * 1. 业务层只依赖 Logger 接口，不直接 console.log。
 * 2. 日志必须结构化（JSON），含 level / time / msg / context / requestId / tenantId / userId。
 * 3. 生产环境禁止打印敏感字段（密码、token、密钥、个人隐私）。
 * 4. 实现可替换（pino / console / 自定义），由基础设施注入。
 */

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogContext {
  requestId?: string;
  tenantId?: string;
  userId?: string;
  module?: string;
  /** 任意业务上下文，但禁止包含敏感字段 */
  [key: string]: unknown;
}

export interface Logger {
  trace(msg: string, context?: LogContext): void;
  debug(msg: string, context?: LogContext): void;
  info(msg: string, context?: LogContext): void;
  warn(msg: string, context?: LogContext): void;
  error(msg: string, context?: LogContext, error?: unknown): void;
  fatal(msg: string, context?: LogContext, error?: unknown): void;
  /** 创建带固定上下文的子 logger */
  child(context: LogContext): Logger;
}

/**
 * 敏感字段黑名单（写入前会被脱敏或剔除）。
 */
const SENSITIVE_KEYS = new Set([
  'password',
  'passwd',
  'secret',
  'token',
  'accessToken',
  'refreshToken',
  'apiKey',
  'api_key',
  'authorization',
  'pepper',
  'cookie',
]);

function redact(obj: unknown): unknown {
  if (obj === null || obj === undefined || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(redact);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(k)) {
      out[k] = '[REDACTED]';
    } else if (typeof v === 'object' && v !== null) {
      out[k] = redact(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

/**
 * 控制台实现（开发环境默认）。生产环境应替换为 pino 等高性能实现。
 */
export class ConsoleLogger implements Logger {
  constructor(
    private readonly baseContext: LogContext = {},
    private readonly minLevel: LogLevel = 'info',
  ) {}

  private readonly levelRank: Record<LogLevel, number> = {
    trace: 10,
    debug: 20,
    info: 30,
    warn: 40,
    error: 50,
    fatal: 60,
  };

  private shouldLog(level: LogLevel): boolean {
    return this.levelRank[level] >= this.levelRank[this.minLevel];
  }

  private write(level: LogLevel, msg: string, context?: LogContext, error?: unknown): void {
    if (!this.shouldLog(level)) return;
    const merged: LogContext = { ...this.baseContext, ...context };
    const redacted = redact(merged) as Record<string, unknown>;
    const payload = {
      level,
      time: new Date().toISOString(),
      msg,
      ...redacted,
      ...(error
        ? {
            error:
              error instanceof Error
                ? { name: error.name, message: error.message, stack: error.stack }
                : String(error),
          }
        : {}),
    };
    // 使用 stderr/stdout 分流
    // eslint-disable-next-line no-console
    const stream = level === 'error' || level === 'fatal' ? console.error : console.log;
    stream(JSON.stringify(payload));
  }

  trace(msg: string, context?: LogContext): void {
    this.write('trace', msg, context);
  }
  debug(msg: string, context?: LogContext): void {
    this.write('debug', msg, context);
  }
  info(msg: string, context?: LogContext): void {
    this.write('info', msg, context);
  }
  warn(msg: string, context?: LogContext): void {
    this.write('warn', msg, context);
  }
  error(msg: string, context?: LogContext, error?: unknown): void {
    this.write('error', msg, context, error);
  }
  fatal(msg: string, context?: LogContext, error?: unknown): void {
    this.write('fatal', msg, context, error);
  }

  child(context: LogContext): Logger {
    return new ConsoleLogger(
      { ...this.baseContext, ...context },
      this.minLevel,
    );
  }
}

/** 无操作 logger，用于测试。 */
export const noopLogger: Logger = {
  trace: () => {},
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  fatal: () => {},
  child: () => noopLogger,
};
