/**
 * 请求上下文插件 —— 解析 requestId / tenantId / userId / roles 并注入 request。
 *
 * 阶段 0 仅解析 header，阶段 1 起叠加 JWT 解析与租户校验。
 * 所有 service / agent 层必须通过 RequestContext 获取主体信息，禁止直接读 header。
 */
import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import type { RequestContext, SystemRole, TenantRole } from '@moy/shared';

declare module 'fastify' {
  interface FastifyRequest {
    ctx: RequestContext;
  }
}

export const requestContextPlugin: FastifyPluginAsync = async (app) => {
  app.addHook('onRequest', async (req: FastifyRequest) => {
    const requestId = (req.id ?? String(req.headers['x-request-id'] ?? '')).toString();
    const tenantIdHeader = req.headers['x-tenant-id'];
    const userIdHeader = req.headers['x-user-id'];
    const rolesHeader = req.headers['x-roles'];

    const tenantId =
      typeof tenantIdHeader === 'string' && tenantIdHeader.length > 0 ? tenantIdHeader : null;
    const userId =
      typeof userIdHeader === 'string' && userIdHeader.length > 0 ? userIdHeader : null;
    const roles = (
      typeof rolesHeader === 'string' && rolesHeader.length > 0
        ? rolesHeader.split(',').map((r) => r.trim()).filter(Boolean)
        : []
    ) as Array<SystemRole | TenantRole>;

    req.ctx = {
      requestId,
      tenantId,
      userId,
      roles,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      path: req.routeOptions?.url ?? req.url,
      method: req.method,
    };
  });
};
