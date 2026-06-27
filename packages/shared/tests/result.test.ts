import { describe, expect, it } from 'vitest';
import {
  andThen,
  Err,
  isErr,
  isOk,
  mapOk,
  Ok,
  tryAsync,
  trySync,
} from '../src/result/index.js';
import { AppError, ValidationError } from '../src/errors/index.js';

describe('Result', () => {
  it('Ok / Err 类型区分正确', () => {
    const ok = Ok(1);
    const err = Err(new ValidationError('bad'));
    expect(isOk(ok)).toBe(true);
    expect(isErr(ok)).toBe(false);
    expect(isOk(err)).toBe(false);
    expect(isErr(err)).toBe(true);
  });

  it('mapOk 只对成功值变换', () => {
    const ok = Ok(2);
    const err: Result<number, AppError> = Err(new ValidationError('x'));
    expect(mapOk(ok, (n) => n * 3).ok ? (mapOk(ok, (n) => n * 3) as { value: number }).value : -1).toBe(6);
    expect(isErr(mapOk(err, (n) => n * 3))).toBe(true);
  });

  it('andThen 链式 flatMap', () => {
    const ok = Ok(2);
    const chained = andThen(ok, (n) => Ok(n + 1));
    expect(isOk(chained) ? (chained as { value: number }).value : -1).toBe(3);
  });

  it('trySync 捕获同步异常为 Err', () => {
    const r = trySync(() => {
      throw new Error('sync boom');
    });
    expect(isErr(r)).toBe(true);
    if (isErr(r)) {
      expect(r.error).toBeInstanceOf(AppError);
      expect(r.error.code).toBe('INTERNAL_ERROR');
    }
  });

  it('tryAsync 捕获异步异常为 Err', async () => {
    const r = await tryAsync(async () => {
      throw new Error('async boom');
    });
    expect(isErr(r)).toBe(true);
  });

  it('tryAsync 透传成功值', async () => {
    const r = await tryAsync(async () => 42);
    expect(isOk(r) ? (r as { value: number }).value : -1).toBe(42);
  });
});

// 局部类型，避免从外层导入造成循环
type Result<T, E extends Error = AppError> =
  | { ok: true; value: T }
  | { ok: false; error: E };
