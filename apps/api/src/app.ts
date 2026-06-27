/**
 * Fastify 实例工厂。
 *
 * 所有插件、模块路由在此装配。设计为工厂函数，便于测试时注入配置与 mock 依赖。
 */
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import Fastify from 'fastify';
import type { Redis } from 'ioredis';
import type { PrismaClient } from '@prisma/client';
import type { AppConfig } from './config/env.js';
import { loggerPlugin } from './plugins/logger.js';
import { prismaPlugin } from './plugins/prisma.js';
import { redisPlugin } from './plugins/redis.js';
import { requestContextPlugin } from './plugins/request-context.js';
import { errorHandlerPlugin } from './plugins/error-handler.js';
import { healthRoutes } from './modules/health/health.routes.js';

export interface AppDeps {
  config: AppConfig;
  /** 测试时注入 mock prisma，跳过真实连接 */
  prisma?: PrismaClient;
  /** 测试时注入 mock redis，跳过真实连接 */
  redis?: Redis;
}

export async function buildApp(deps: AppDeps): Promise<FastifyInstance> {
  const { config } = deps;

  const app = Fastify({
    logger: {
      level: config.API_LOG_LEVEL,
      ...(config.NODE_ENV === 'development'
        ? {
            transport: {
              target: 'pino-pretty',
              options: { colorize: true, translateTime: 'HH:MM:ss.l' },
            },
          }
        : {}),
    },
    disableRequestLogging: false,
    genReqId: (req) => {
      const header = req.headers['x-request-id'];
      if (typeof header === 'string' && header.length > 0) return header;
      return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    },
  });

  // 测试时预注入基础设施，使 prisma/redis 插件跳过真实连接
  if (deps.prisma) {
    app.decorate('prisma', deps.prisma);
  }
  if (deps.redis) {
    app.decorate('redis', deps.redis);
  }

  // 插件装配顺序：logger → context → error → infra → routes
  await app.register(loggerPlugin);
  await app.register(requestContextPlugin);
  await app.register(errorHandlerPlugin);
  await app.register(prismaPlugin);
  await app.register(redisPlugin);

  const apiV1: FastifyPluginAsync = async (instance) => {
    await instance.register(healthRoutes, { prefix: '/health' });
  };
  await app.register(apiV1, { prefix: '/v1' });

  // 根路径健康检查（不带版本前缀，供 LB 探活）
  app.get('/health', { logLevel: 'warn' }, async () => ({
    status: 'ok',
    service: 'moy-api',
    time: new Date().toISOString(),
  }));

  return app;
}
