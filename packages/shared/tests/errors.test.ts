import { describe, expect, it } from 'vitest';
import {
  AppError,
  ConflictError,
  ErrorCode,
  ForbiddenError,
  LlmProviderError,
  NotFoundError,
  TenantIsolationError,
  UnauthorizedError,
  ValidationError,
  normalizeError,
} from '../src/errors/index.js';

describe('AppError 体系', () => {
  it('AppError 携带 code / httpStatus / expose', () => {
    const err = new AppError({
      code: ErrorCode.INTERNAL_ERROR,
      message: 'boom',
      httpStatus: 500,
      expose: false,
    });
    expect(err.code).toBe(ErrorCode.INTERNAL_ERROR);
    expect(err.httpStatus).toBe(500);
    expect(err.expose).toBe(false);
    expect(err.name).toBe('AppError');
  });

  it('ValidationError 默认 400 且 expose=true', () => {
    const err = new ValidationError('字段非法');
    expect(err.httpStatus).toBe(400);
    expect(err.expose).toBe(true);
    expect(err.code).toBe(ErrorCode.VALIDATION_ERROR);
  });

  it('UnauthorizedError / ForbiddenError / NotFoundError / ConflictError 映射正确', () => {
    expect(new UnauthorizedError().httpStatus).toBe(401);
    expect(new ForbiddenError().httpStatus).toBe(403);
    expect(new NotFoundError('GeoProject', 'p1').httpStatus).toBe(404);
    expect(new ConflictError('dup').httpStatus).toBe(409);
  });

  it('TenantIsolationError 默认不暴露内部信息', () => {
    const err = new TenantIsolationError();
    expect(err.expose).toBe(false);
    expect(err.toJSON().message).toBe('Internal server error');
  });

  it('LlmProviderError 默认不暴露内部信息', () => {
    const err = new LlmProviderError('upstream 502');
    expect(err.expose).toBe(false);
    expect(err.httpStatus).toBe(502);
  });

  it('NotFoundError 携带 resource / id details', () => {
    const err = new NotFoundError('Report', 'r1');
    expect(err.details).toEqual({ resource: 'Report', id: 'r1' });
  });

  it('normalizeError 归一化裸 Error 为 AppError 且不暴露', () => {
    const raw = new Error('something broke');
    const err = normalizeError(raw);
    expect(err).toBeInstanceOf(AppError);
    expect(err.expose).toBe(false);
    expect(err.httpStatus).toBe(500);
  });

  it('normalizeError 透传已有的 AppError', () => {
    const original = new ValidationError('x');
    expect(normalizeError(original)).toBe(original);
  });

  it('normalizeError 归一化非 Error 抛出物', () => {
    const err = normalizeError('just a string');
    expect(err.code).toBe(ErrorCode.INTERNAL_ERROR);
    expect(err.details).toEqual({ raw: 'just a string' });
  });
});
