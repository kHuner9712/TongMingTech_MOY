import { describe, expect, it, vi } from 'vitest';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/config/env.js';

/**
 * 健康检查与错误处理集成测试。
 * 通过 buildApp 的 deps 注入 mock prisma/redis，避免连接真实基础设施。
 */

const baseEnv = {
  NODE_ENV: 'test' as const,
  API_HOST: '127.0.0.1',
  API_PORT: '4000',
  API_LOG_LEVEL: 'error' as const,
  DATABASE_URL: 'postgresql://u:p@localhost:5432/test?schema=public',
  REDIS_URL: 'redis://localhost:6379',
  JWT_SECRET: 'test-secret-at-least-32-characters-long',
  JWT_ACCESS_TTL: '15m',
  JWT_REFRESH_TTL: '7d',
  PASSWORD_PEPPER: 'test-pepper-min-len',
  TENANT_ISOLATION_MODE: 'strict' as const,
  BULLMQ_CONCURRENCY: '2',
  FILE_STORAGE_DRIVER: 'local' as const,
  FILE_STORAGE_LOCAL_DIR: './storage',
  AUDIT_LOG_RETENTION_DAYS: '30',
};

function makeMockPrisma($queryRawImpl: () => Promise<unknown> = () => Promise.resolve([{ '?column?': 1 }])) {
  return {
    $queryRaw: vi.fn($queryRawImpl),
    $disconnect: vi.fn().mockResolvedValue(undefined),
  } as unknown as Parameters<typeof buildApp>[0]['prisma'];
}

function makeMockRedis(pingImpl: () => Promise<string> = () => Promise.resolve('PONG')) {
  return {
    ping: vi.fn(pingImpl),
    disconnect: vi.fn(),
    on: vi.fn(),
  } as unknown as Parameters<typeof buildApp>[0]['redis'];
}

async function buildTestApp(overrides: { prisma?: ReturnType<typeof makeMockPrisma>; redis?: ReturnType<typeof makeMockRedis> } = {}) {
  const config = loadConfig(baseEnv);
  const app = await buildApp({
    config,
    prisma: overrides.prisma ?? makeMockPrisma(),
    redis: overrides.redis ?? makeMockRedis(),
  });
  await app.ready();
  return app;
}

describe('健康检查', () => {
  it('GET /health 返回 ok', async () => {
    const app = await buildTestApp();
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe('ok');
    expect(body.service).toBe('moy-api');
    await app.close();
  });

  it('GET /v1/health/live 返回 ok', async () => {
    const app = await buildTestApp();
    const res = await app.inject({ method: 'GET', url: '/v1/health/live' });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('ok');
    await app.close();
  });

  it('GET /v1/health/ready 在依赖健康时返回 200', async () => {
    const app = await buildTestApp();
    const res = await app.inject({ method: 'GET', url: '/v1/health/ready' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe('ok');
    expect(body.checks.postgres).toBe('ok');
    expect(body.checks.redis).toBe('ok');
    await app.close();
  });

  it('GET /v1/health/ready 在 Postgres 异常时返回 503', async () => {
    const app = await buildTestApp({
      prisma: makeMockPrisma(() => Promise.reject(new Error('conn refused'))),
    });
    const res = await app.inject({ method: 'GET', url: '/v1/health/ready' });
    expect(res.statusCode).toBe(503);
    const body = res.json();
    expect(body.status).toBe('degraded');
    expect(body.checks.postgres).toBe('error');
    await app.close();
  });

  it('GET /v1/health/ready 在 Redis 异常时返回 503', async () => {
    const app = await buildTestApp({
      redis: makeMockRedis(() => Promise.reject(new Error('conn refused'))),
    });
    const res = await app.inject({ method: 'GET', url: '/v1/health/ready' });
    expect(res.statusCode).toBe(503);
    expect(res.json().checks.redis).toBe('error');
    await app.close();
  });

  it('未知路由返回标准化 404 错误体', async () => {
    const app = await buildTestApp();
    const res = await app.inject({ method: 'GET', url: '/this-does-not-exist' });
    expect(res.statusCode).toBe(404);
    const body = res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.message).toContain('路由不存在');
    await app.close();
  });
});
