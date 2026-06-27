/**
 * MOY 通用工具函数。
 */
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../constants/index.js';

/** 生成请求 ID（CUID 替代，足够唯一且可读） */
export function generateRequestId(prefix = 'req'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/** 安全解析 JSON，失败返回 null */
export function safeJsonParse<T = unknown>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** 规范化分页参数，带上下界 */
export function normalizePagination(query: {
  page?: unknown;
  pageSize?: unknown;
}): { page: number; pageSize: number } {
  const rawPage = Number(query.page);
  const rawPageSize = Number(query.pageSize);
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;
  const pageSize =
    Number.isFinite(rawPageSize) && rawPageSize >= 1
      ? Math.min(Math.floor(rawPageSize), MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE;
  return { page, pageSize };
}

/** 时间戳转 ISO 字符串 */
export function toIso(date: Date = new Date()): string {
  return date.toISOString();
}

/** 非空断言（用于过滤 null/undefined 后的类型收窄） */
export function isNonNullable<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/** 深层 omit（基于路径字符串） */
export function omit<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: readonly K[],
): Omit<T, K> {
  const out = { ...obj };
  for (const k of keys) {
    delete out[k];
  }
  return out;
}
