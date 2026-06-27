/**
 * Result<T, E> —— 统一的错误处理返回类型
 *
 * 设计意图：
 * 1. 在 service / agent / 基础设施层强制使用 Result 显式表达失败，而非 throw。
 * 2. 边界层（HTTP handler）将 Result 转换为 HTTP 响应。
 * 3. 不可变、类型安全，避免 try/catch 散落各处导致的不可控控制流。
 *
 * 使用范式：
 *   const r = await someService();
 *   if (r.isErr()) return handleErr(r.error);
 *   return r.value;
 */
import type { AppError } from '../errors/index.js';
import { normalizeError } from '../errors/index.js';

export type Result<T, E extends Error = AppError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export const Ok = <T>(value: T): Result<T, never> => ({ ok: true, value });

export const Err = <E extends Error = AppError>(error: E): Result<never, E> => ({
  ok: false,
  error,
});

export function isOk<T, E extends Error>(r: Result<T, E>): r is { ok: true; value: T } {
  return r.ok;
}

export function isErr<T, E extends Error>(
  r: Result<T, E>,
): r is { ok: false; error: E } {
  return !r.ok;
}

/**
 * 将可能抛出的函数包裹为 Result。
 *   const r = await tryAsync(() => someFn());
 */
export async function tryAsync<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    const value = await fn();
    return Ok(value);
  } catch (err) {
    return Err(normalizeError(err));
  }
}

/**
 * 同步版本。
 */
export function trySync<T>(fn: () => T): Result<T> {
  try {
    return Ok(fn());
  } catch (err) {
    return Err(normalizeError(err));
  }
}

/**
 * 在 Result 链上 map 成功值。
 */
export function mapOk<T, U, E extends Error>(
  r: Result<T, E>,
  fn: (value: T) => U,
): Result<U, E> {
  return r.ok ? Ok(fn(r.value)) : r;
}

/**
 * 在 Result 链上 flatMap 成功值。
 */
export function andThen<T, U, E extends Error>(
  r: Result<T, E>,
  fn: (value: T) => Result<U, E>,
): Result<U, E> {
  return r.ok ? fn(r.value) : r;
}
