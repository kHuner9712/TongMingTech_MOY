export * from './error-codes.js';

/**
 * 系统级角色（不与具体租户绑定，跨租户生效）
 */
export const SYSTEM_ROLE = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  PLATFORM_OPERATOR: 'PLATFORM_OPERATOR',
  SUPPORT_AGENT: 'SUPPORT_AGENT',
} as const;

/**
 * 租户内角色（与具体租户绑定）
 */
export const TENANT_ROLE = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  SPECIALIST: 'SPECIALIST',
  VIEWER: 'VIEWER',
} as const;

/**
 * 多租户隔离模式
 */
export const TENANT_ISOLATION_MODE = {
  STRICT: 'strict',
  PERMISSIVE: 'permissive',
} as const;

/**
 * 审计日志动作类型
 */
export const AUDIT_ACTION = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  READ: 'READ',
  EXPORT: 'EXPORT',
  SHARE: 'SHARE',
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  LOGIN_FAILED: 'LOGIN_FAILED',
  PERMISSION_GRANT: 'PERMISSION_GRANT',
  PERMISSION_REVOKE: 'PERMISSION_REVOKE',
} as const;

/**
 * 任务状态
 */
export const TASK_STATUS = {
  PENDING: 'PENDING',
  RUNNING: 'RUNNING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
} as const;

/**
 * 默认分页参数
 */
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
