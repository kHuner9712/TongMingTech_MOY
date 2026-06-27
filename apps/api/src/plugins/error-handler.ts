/**
 * 统一错误处理插件。
 *
 * 职责：
 * 1. 将 AppError 序列化为标准响应体 { success:false, error:{code,message,details}, requestId }。
 * 2. 未识别异常归一化为 INTERNAL_ERROR 且不暴露内部信息。
 * 3. 记录错误日志（含 requestId / tenantId / path）。
 * 4. 404 路由返回标准化错误体。
 */
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { AppError, ErrorCode, normalizeError } from '@moy/shared';

interface ErrorResponseBody {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  requestId?: string;
}

export const errorHandlerPlugin: FastifyPluginAsync = async (app) => {
  app.setErrorHandler((err, req: FastifyRequest, reply: FastifyReply) => {
    const normalized = normalizeError(err);
    const isExposed = normalized.expose;

    // 日志：内部错误 error 级别，业务错误 warn 级别
    const logPayload = {
      requestId: req.ctx?.requestId,
      tenantId: req.ctx?.tenantId,
      userId: req.ctx?.userId,
      path: req.url,
      method: req.method,
      err: {
        name: normalized.name,
        code: normalized.code,
        message: normalized.message,
        details: normalized.details,
        stack: normalized.stack,
      },
    };
    if (isExposed) {
      req.log.warn(logPayload, '业务错误');
    } else {
      req.log.error(logPayload, '内部错误');
    }

    const body: ErrorResponseBody = {
      success: false,
      error: {
        code: normalized.code,
        message: isExposed ? normalized.message : 'Internal server error',
        ...(normalized.details && isExposed ? { details: normalized.details } : {}),
      },
      requestId: req.ctx?.requestId,
    };

    void reply.status(normalized.httpStatus).send(body);
  });

  app.setNotFoundHandler((req: FastifyRequest, reply: FastifyReply) => {
    const notFound = new AppError({
      code: ErrorCode.NOT_FOUND,
      message: `路由不存在: ${req.method} ${req.url}`,
      httpStatus: 404,
    });
    const body: ErrorResponseBody = {
      success: false,
      error: { code: notFound.code, message: notFound.message },
      requestId: req.ctx?.requestId,
    };
    void reply.status(404).send(body);
  });
};
