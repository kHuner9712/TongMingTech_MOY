/**
 * MOY 共享类型 —— 多租户、用户、权限、分页等基础类型。
 * 业务领域类型（GEO / Agent）见 geo.ts、agent.ts。
 */
import type { SYSTEM_ROLE, TENANT_ROLE } from '../constants/index.js';

/** 资源 ID 类型（CUID/UUID 字符串） */
export type ID = string;

/** ISO 8601 时间字符串 */
export type ISODateString = string;

export type SystemRole = (typeof SYSTEM_ROLE)[keyof typeof SYSTEM_ROLE];
export type TenantRole = (typeof TENANT_ROLE)[keyof typeof TENANT_ROLE];

/** 租户状态 */
export type TenantStatus = 'ACTIVE' | 'SUSPENDED' | 'TERMINATED';

/** 用户状态 */
export type UserStatus = 'ACTIVE' | 'DISABLED' | 'PENDING_INVITE';

/** 租户主体 */
export interface Tenant {
  id: ID;
  name: string;
  slug: string;
  status: TenantStatus;
  /** 套餐等级：starter / growth / enterprise */
  plan: string;
  metadata?: Record<string, unknown>;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/** 用户主体 */
export interface User {
  id: ID;
  tenantId: ID | null; // null = 平台级用户
  email: string;
  name: string;
  status: UserStatus;
  roles: Array<SystemRole | TenantRole>;
  lastLoginAt?: ISODateString;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/** 请求上下文 —— 由中间件解析并注入，贯穿 service / agent / 基础设施层 */
export interface RequestContext {
  requestId: string;
  tenantId: ID | null;
  userId: ID | null;
  roles: Array<SystemRole | TenantRole>;
  ip?: string;
  userAgent?: string;
  /** 原始请求路径，用于审计 */
  path?: string;
  /** 原始请求方法 */
  method?: string;
}

/** 标准分页响应 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** 标准分页查询参数 */
export interface PaginationQuery {
  page?: number;
  pageSize?: number;
  /** 排序字段，格式：field:asc|desc */
  sort?: string;
}

/** 标准 API 响应体 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  requestId?: string;
}
