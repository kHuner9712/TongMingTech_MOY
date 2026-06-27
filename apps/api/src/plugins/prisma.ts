/**
 * Prisma 插件 —— 注入 PrismaClient 并在关闭时断开连接。
 *
 * 多租户隔离策略：
 * - 通过 request.tenantId 在 service 层强制带 where: { tenantId }
 * - 不依赖 RLS（PostgreSQL Row-Level Security），由应用层保证隔离
 * - 后续阶段可叠加 RLS 作为深度防御
 *
 * 测试时可通过 app.decorate 预先注入 mock，本插件检测到已存在则跳过。
 */
import type { FastifyPluginAsync } from 'fastify';
import { PrismaClient } from '@prisma/client';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

export const prismaPlugin: FastifyPluginAsync = async (app) => {
  // 已有装饰器（测试注入）则跳过
  if (app.hasDecorator('prisma')) {
    return;
  }

  const prisma = new PrismaClient({
    log:
      app.log.level === 'debug' || app.log.level === 'trace'
        ? ['query', 'warn', 'error']
        : ['warn', 'error'],
  });

  app.decorate('prisma', prisma);
  app.addHook('onClose', async () => {
    await prisma.$disconnect();
  });
};
