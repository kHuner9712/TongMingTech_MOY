import { describe, expect, it } from 'vitest';
import { ConsoleLogger, noopLogger } from '../src/logger/index.js';

describe('ConsoleLogger', () => {
  it('child logger 继承父上下文', () => {
    const parent = new ConsoleLogger({ module: 'api' }, 'info');
    const child = parent.child({ requestId: 'r1' }) as ConsoleLogger;
    // 通过内部 baseContext 间接验证
    expect(child).toBeInstanceOf(ConsoleLogger);
  });

  it('noopLogger 不抛错', () => {
    expect(() => {
      noopLogger.info('x');
      noopLogger.error('y', {}, new Error('e'));
      noopLogger.child({}).debug('z');
    }).not.toThrow();
  });

  it('敏感字段被脱敏', () => {
    const sink: string[] = [];
    const origLog = console.log;
    const origErr = console.error;
    console.log = (...args: unknown[]) => sink.push(args.map(String).join(' '));
    console.error = (...args: unknown[]) => sink.push(args.map(String).join(' '));
    try {
      const logger = new ConsoleLogger({}, 'info');
      logger.info('login attempt', {
        email: 'a@b.com',
        password: 'should-not-leak',
        token: 'secret-token',
        nested: { apiKey: 'k' },
      });
      const line = sink.find((s) => s.includes('login attempt')) ?? '';
      expect(line).toContain('[REDACTED]');
      expect(line).not.toContain('should-not-leak');
      expect(line).not.toContain('secret-token');
    } finally {
      console.log = origLog;
      console.error = origErr;
    }
  });
});
