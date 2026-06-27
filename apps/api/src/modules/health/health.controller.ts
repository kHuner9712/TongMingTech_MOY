/**
 * 健康检查 controller。
 *
 * /v1/health/live  —— 存活探针（不依赖外部服务）
 * /v1/health/ready —— 就绪探针（依赖 Postgres / Redis 可达）
 */
import type { FastifyInstance } from 'fastify';

export interface HealthDeps {
  app: FastifyInstance;
}

export async function healthLive(): Promise<{ status: string; service: string; time: string }> {
  return {
    status: 'ok',
    service: 'moy-api',
    time: new Date().toISOString(),
  };
}

export async function healthReady(deps: HealthDeps): Promise<{
  status: string;
  checks: Record<string, string>;
  time: string;
}> {
  const checks: Record<string, string> = {};

  // Postgres
  try {
    await deps.app.prisma.$queryRaw`SELECT 1`;
    checks.postgres = 'ok';
  } catch {
    checks.postgres = 'error';
  }

  // Redis
  try {
    const pong = await deps.app.redis.ping();
    checks.redis = pong === 'PONG' ? 'ok' : 'error';
  } catch {
    checks.redis = 'error';
  }

  const allOk = Object.values(checks).every((v) => v === 'ok');
  return {
    status: allOk ? 'ok' : 'degraded',
    checks,
    time: new Date().toISOString(),
  };
}
