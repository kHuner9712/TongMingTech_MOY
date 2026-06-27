/**
 * 健康检查路由。
 */
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { healthLive, healthReady } from './health.controller.js';

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/live', { logLevel: 'warn' }, async () => healthLive());

  app.get(
    '/ready',
    { logLevel: 'warn' },
    async (_req: FastifyRequest, reply: FastifyReply) => {
      const result = await healthReady({ app });
      const status = result.status === 'ok' ? 200 : 503;
      void reply.code(status);
      return result;
    },
  );
};
