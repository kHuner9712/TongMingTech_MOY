/**
 * Logger 插件。
 *
 * Fastify 内置 pino，请求级日志通过 request.log 提供。
 * 本插件额外提供一个 app 级的 shared Logger（兼容 @moy/shared 接口），
 * 供非请求上下文代码（如 BullMQ worker、定时任务）使用。
 */
import type { FastifyPluginAsync } from 'fastify';
import type { Logger } from '@moy/shared';

declare module 'fastify' {
  interface FastifyInstance {
    sharedLogger: Logger;
  }
}

export const loggerPlugin: FastifyPluginAsync = async (app) => {
  // 用 fastify pino 作为底层，包装成 @moy/shared Logger 接口
  const sharedLogger: Logger = {
    trace: (msg, ctx) => app.log.trace(ctx, msg),
    debug: (msg, ctx) => app.log.debug(ctx, msg),
    info: (msg, ctx) => app.log.info(ctx, msg),
    warn: (msg, ctx) => app.log.warn(ctx, msg),
    error: (msg, ctx, error) => app.log.error({ ...ctx, err: error }, msg),
    fatal: (msg, ctx, error) => app.log.fatal({ ...ctx, err: error }, msg),
    child: (ctx) => ({
      trace: (m, c) => app.log.trace({ ...ctx, ...c }, m),
      debug: (m, c) => app.log.debug({ ...ctx, ...c }, m),
      info: (m, c) => app.log.info({ ...ctx, ...c }, m),
      warn: (m, c) => app.log.warn({ ...ctx, ...c }, m),
      error: (m, c, e) => app.log.error({ ...ctx, ...c, err: e }, m),
      fatal: (m, c, e) => app.log.fatal({ ...ctx, ...c, err: e }, m),
      child: (c2) => sharedLogger.child({ ...ctx, ...c2 }),
    }),
  };
  app.decorate('sharedLogger', sharedLogger);
};
