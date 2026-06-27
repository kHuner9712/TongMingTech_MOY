/**
 * API 服务入口。
 */
import { buildApp } from './app.js';
import { loadConfig } from './config/env.js';
import { normalizeError } from '@moy/shared';

async function main(): Promise<void> {
  const config = loadConfig();
  const app = await buildApp({ config });

  try {
    await app.listen({ host: config.API_HOST, port: config.API_PORT });
    app.log.info(
      { host: config.API_HOST, port: config.API_PORT, env: config.NODE_ENV },
      'MOY API 已启动',
    );
  } catch (err) {
    const normalized = normalizeError(err);
    app.log.fatal({ err: normalized }, 'MOY API 启动失败');
    process.exit(1);
  }

  const shutdown = async (signal: string): Promise<void> => {
    app.log.info({ signal }, '收到退出信号，开始优雅关闭');
    await app.close();
    app.log.info('已关闭');
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('未捕获启动错误', err);
  process.exit(1);
});
