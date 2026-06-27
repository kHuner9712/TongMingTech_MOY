/**
 * Redis 插件 —— 注入 ioredis 客户端，供 BullMQ 队列与缓存共用。
 *
 * 测试时可通过预先 decorate 注入 mock，本插件检测到已存在则跳过。
 */
import type { FastifyPluginAsync } from 'fastify';
import { Redis } from 'ioredis';

declare module 'fastify' {
  interface FastifyInstance {
    redis: Redis;
  }
}

export const redisPlugin: FastifyPluginAsync = async (app) => {
  if (app.hasDecorator('redis')) {
    return;
  }

  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error('REDIS_URL 未配置');
  }
  const redis = new Redis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
  });

  redis.on('error', (err: Error) => {
    app.log.error({ err }, 'Redis 连接异常');
  });

  app.decorate('redis', redis);
  app.addHook('onClose', async () => {
    redis.disconnect();
  });
};
