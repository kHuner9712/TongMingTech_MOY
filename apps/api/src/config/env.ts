/**
 * 环境变量校验 —— 应用启动时通过 Zod 严格校验，缺失或非法直接 fail-fast。
 * 禁止在业务代码中直接读 process.env，统一从 AppConfig 取值。
 */
import { z } from 'zod';
import { AppError, ErrorCode } from '@moy/shared';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_HOST: z.string().default('0.0.0.0'),
  API_PORT: z.coerce.number().int().positive().default(4000),
  API_LOG_LEVEL: z
    .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
    .default('info'),

  DATABASE_URL: z.string().url(),

  REDIS_URL: z.string().url(),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 chars'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('7d'),
  PASSWORD_PEPPER: z.string().min(8, 'PASSWORD_PEPPER must be at least 8 chars'),

  TENANT_ISOLATION_MODE: z.enum(['strict', 'permissive']).default('strict'),
  BULLMQ_CONCURRENCY: z.coerce.number().int().positive().default(4),

  FILE_STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  FILE_STORAGE_LOCAL_DIR: z.string().default('./storage'),

  AUDIT_LOG_RETENTION_DAYS: z.coerce.number().int().positive().default(365),
});

export type AppConfig = z.infer<typeof EnvSchema>;

let cachedConfig: AppConfig | null = null;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new AppError({
      code: ErrorCode.INTERNAL_ERROR,
      message: `环境变量校验失败：\n${issues}`,
      httpStatus: 500,
      expose: false,
    });
  }
  cachedConfig = parsed.data;
  return cachedConfig;
}

export function getConfig(): AppConfig {
  if (!cachedConfig) {
    return loadConfig();
  }
  return cachedConfig;
}
