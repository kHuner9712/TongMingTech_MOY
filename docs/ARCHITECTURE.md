# MOY 架构设计（Architecture）

> 本文件描述 MOY 1.0 的总体技术架构。所有模块设计、技术选型、边界划分必须以本文件为基准。新增模块须先更新本文件再编码。

---

## 1. 总体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         客户端（Web 端）                          │
│              Next.js 14 App Router · TypeScript                  │
│         指挥中心 / 任务流 / 智能体协同 / 增长雷达                  │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTPS（REST + JSON）
┌────────────────────────▼────────────────────────────────────────┐
│                       API 网关层（Fastify）                       │
│  鉴权 · 租户上下文 · 请求日志 · 限流 · 统一错误 · 审计 · 路由      │
└────────────────────────┬────────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  业务模块层   │ │  Agent 编排层 │ │  基础设施层   │
│ GEO / 后台   │ │ 6 类超级员工  │ │ 文件/队列/缓存│
└──────┬───────┘ └──────┬───────┘ └──────┬───────┘
       │                │                 │
       ▼                ▼                 ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Prisma (PG)  │ │ LLM 抽象层    │ │ Redis/BullMQ │
│ 多租户隔离   │ │ 防幻觉/审核   │ │ 任务队列      │
└──────────────┘ └──────────────┘ └──────────────┘
```

### 分层职责

| 层 | 职责 | 禁止 |
|---|---|---|
| 客户端 | UI 渲染、用户交互、调用 API | 直接访问数据库、写业务逻辑 |
| API 网关层 | 鉴权、租户上下文、限流、错误转换、审计、路由分发 | 写业务规则 |
| 业务模块层 | GEO/后台业务规则、数据校验、事务编排 | 直接调 LLM、直接读基础设施裸接口 |
| Agent 编排层 | 6 类员工任务规划、LLM 调用、人工审核 hook、防幻觉 | 越权跨租户、绕过审计 |
| 基础设施层 | 文件存储、缓存、队列、外部集成 | 包含业务规则 |
| 数据访问层 | Prisma + PostgreSQL，多租户隔离 | 跨租户查询 |

---

## 2. 前端架构

### 2.1 技术栈
- Next.js 14 App Router + TypeScript
- React 18 Server Components 优先，交互组件用 'use client'
- 共享 UI：`@moy/ui`（深色未来科技感设计系统，tokens 化）
- 数据获取：Server Components 直接调 API（带 cookie/token），Client Components 用 fetch + SWR 或 React Query（阶段 1 选型）
- 表单：React Hook Form + Zod（与后端共享 schema）

### 2.2 目录结构（阶段 1 起落地）
```
apps/web/src/
├─ app/                    # App Router 路由
│  ├─ (auth)/              # 登录/注册路由组
│  ├─ (dashboard)/         # 已登录工作台路由组
│  │  ├─ geo/              # GEO 工作台
│  │  ├─ agents/           # AI 超级员工
│  │  └─ admin/            # 企业后台
│  ├─ layout.tsx
│  └─ page.tsx
├─ components/             # 业务组件
├─ lib/                    # 客户端工具：api client、auth、fetcher
├─ hooks/                  # 自定义 hooks
└─ styles/                 # 全局样式与 tokens
```

### 2.3 设计语言
- 深色基底（`#0A0E14`）+ 克制青蓝主色（`#3DD6E0`）
- 不为炫酷牺牲 B 端效率
- 核心页面：指挥中心（Overview）、任务流（Task Flow）、智能体协同（Agent Workspace）、增长雷达（Growth Radar）、品牌可见度地图（Visibility Map）
- 所有交互元素必须有 loading / empty / error 三态

---

## 3. 后端架构

### 3.1 技术栈
- Fastify 5 + TypeScript（高性能、低样板、插件化）
- Prisma 5 + PostgreSQL 16
- ioredis + BullMQ（任务队列）
- Zod（输入校验，与前端共享）
- pino（结构化日志）

### 3.2 模块化组织（Feature-based）
```
apps/api/src/
├─ config/                 # 环境变量、常量
├─ plugins/                # Fastify 插件：prisma/redis/logger/error/context
├─ modules/                # 业务模块（feature-based）
│  ├─ health/              # 健康检查
│  ├─ auth/                # 鉴权（阶段 1）
│  ├─ tenants/             # 租户管理（阶段 1）
│  ├─ users/               # 用户与权限（阶段 1）
│  ├─ audit/               # 审计日志（阶段 1）
│  ├─ geo/                 # GEO 工作台（阶段 2）
│  ├─ agents/              # AI 超级员工（阶段 3）
│  └─ files/               # 文件资产（阶段 1）
├─ shared-kernel/          # 跨模块内核：LLM 抽象、Prompt 模板、防幻觉
└─ index.ts                # 入口
```

每个模块统一结构：
```
modules/<feature>/
├─ <feature>.routes.ts     # 路由定义
├─ <feature>.controller.ts # 请求处理（调 service，不写业务规则）
├─ <feature>.service.ts    # 业务规则（返回 Result，不 throw）
├─ <feature>.schema.ts     # Zod 输入输出 schema
├─ <feature>.repository.ts # 数据访问（Prisma，强制 tenantId）
└─ <feature>.test.ts       # 单测
```

### 3.3 统一错误处理（已落地）
- 所有业务错误使用 `@moy/shared` 的 `AppError` 体系
- 错误码统一登记在 `ErrorCode` 常量表，禁止散落字符串
- Fastify `setErrorHandler` 统一序列化为 `{ success:false, error:{code,message,details}, requestId }`
- 内部错误（expose=false）不暴露 message 给客户端
- 详见 [DEVELOPMENT_STANDARDS.md](DEVELOPMENT_STANDARDS.md) §错误处理

### 3.4 统一日志（已落地）
- Fastify 内置 pino，请求级日志含 requestId
- 业务代码使用 `request.log` 或 `app.sharedLogger`
- 敏感字段（password/token/secret/cookie）在 `@moy/shared` Logger 层自动脱敏
- 生产环境日志 JSON 结构化，含 level/time/msg/requestId/tenantId/userId/module

---

## 4. 数据库架构

### 4.1 主库
- PostgreSQL 16
- Prisma ORM
- 多租户隔离采用 **应用层 tenantId + 唯一索引** 策略（详见 §5）
- 软删除：核心表带 `deletedAt`，查询默认过滤
- 审计字段：`createdAt` / `updatedAt` 由 Prisma 自动维护

### 4.2 缓存与队列
- Redis 7：缓存 + BullMQ 队列共用
- BullMQ 队列分类：
  - `geo-test-queue`：AI 搜索平台测试任务（耗时长，异步）
  - `agent-task-queue`：Agent 任务执行
  - `report-queue`：报告生成
  - `notification-queue`：通知发送

### 4.3 详见 [DATABASE_PLAN.md](DATABASE_PLAN.md)

---

## 5. 多租户架构

### 5.1 隔离策略
采用 **共享数据库 + 应用层 tenantId 隔离**（非独立 schema、非独立库）：

- 所有租户资源表带 `tenantId` 字段
- 唯一索引组合 `(tenantId, <业务键>)`，防止跨租户冲突
- Repository 层强制注入 `tenantId` 到 where 条件
- 后续阶段叠加 PostgreSQL Row-Level Security 作为深度防御（非依赖项）

### 5.2 租户上下文流转
```
请求 → request-context 插件解析 tenantId（来自 JWT 或 header）
     → req.ctx.tenantId 注入所有 service 调用
     → repository 层 where: { tenantId } 强制隔离
     → 审计日志记录 tenantId
```

### 5.3 平台级资源
- 平台用户（super admin）`tenantId = null`
- 平台级操作通过 SYSTEM_ROLE 角色控制，单独审计
- 租户内角色通过 TENANT_ROLE 控制，绑定 tenantId

### 5.4 隔离模式（env 可配）
- `TENANT_ISOLATION_MODE=strict`（默认，生产）：每次请求必须携带租户上下文，缺失即 403
- `TENANT_ISOLATION_MODE=permissive`（仅开发）：缺失仅告警，不阻断

---

## 6. 权限系统

### 6.1 角色模型（RBAC + 少量 ABAC）
- **系统角色**（跨租户）：`SUPER_ADMIN` / `PLATFORM_OPERATOR` / `SUPPORT_AGENT`
- **租户角色**（绑定租户）：`OWNER` / `ADMIN` / `MANAGER` / `SPECIALIST` / `VIEWER`
- 用户可同时持有系统角色与租户角色
- 权限粒度：模块级 + 操作级（CREATE/UPDATE/DELETE/READ/EXPORT/SHARE）

### 6.2 权限校验
- 路由级：Fastify preHandler hook 校验角色
- 资源级：service 层校验资源 tenantId 与 req.ctx.tenantId 一致
- 字段级：敏感字段（如价格、合同）按角色返回

### 6.3 鉴权机制
- JWT Access Token（15m）+ Refresh Token（7d，存表可撤销）
- 密码使用 argon2id + pepper
- 登录失败锁定：5 次失败锁 15 分钟
- 所有登录/登出/登录失败写审计日志

---

## 7. Agent 架构

### 7.1 定位
AI 超级员工是 **GEO 业务闭环的执行单元**，不是通用聊天机器人。每个 Agent 有：
- 明确职责边界
- 人工审核 hook（human-in-the-loop）
- 防幻觉机制（引用证据 + 置信度 + 最大 LLM 调用次数）
- 完整执行日志

### 7.2 6 类 Agent
| Agent | 职责 | 触发 | 审核 |
|---|---|---|---|
| AI 内容运营 | 生成 GEO 内容（问答/百科/媒体稿/行业文章） | GEO 任务计划 | 内容交付前必审 |
| AI 销售 | 线索分级、跟进建议、销售话术、邮件草稿 | 新线索进入 | 话术必审 |
| AI 客服 | 沉淀客户真实问答，反哺 GEO 问答资产 | 客户咨询 | 高风险问题人工接管 |
| AI 美工 | 配图、海报思路、视觉素材需求说明 | 内容运营触发 | 需求说明必审 |
| AI 法务/合规 | 违规/夸大/敏感风险检查 | 内容交付前 | 强制阻断 |
| AI 数据分析 | 周报/月报/客户交付报告/优化建议 | 定时 + 手动 | 客户交付报告必审 |

### 7.3 详见 [AGENT_ARCHITECTURE.md](AGENT_ARCHITECTURE.md)

---

## 8. 任务队列

### 8.1 队列划分
| 队列 | 用途 | 并发 |
|---|---|---|
| `geo-test-queue` | AI 搜索平台测试（ChatGPT/Perplexity 等 API 调用） | 4 |
| `agent-task-queue` | Agent 任务执行（LLM 调用） | env 配置 |
| `report-queue` | 报告生成（CPU 密集） | 2 |
| `notification-queue` | 通知发送（邮件/站内信） | 4 |

### 8.2 任务生命周期
`PENDING → RUNNING → SUCCESS/FAILED/CANCELLED`
- 失败自动重试 3 次（指数退避）
- 超时默认 30s（LLM 任务 60s）
- 所有任务状态变更写 `AgentTaskRecord` / `AuditLog`

### 8.3 Worker 部署
- 阶段 1：与 API 同进程（简化部署）
- 阶段 2+：独立 worker 进程，水平扩展

---

## 9. 文件资产系统

### 9.1 存储抽象
- 驱动可切换：`local`（开发）/ `s3`（生产）
- 统一接口 `FileStorageDriver`：upload / download / signUrl / delete
- 文件元数据存 `FileAsset` 表（含 tenantId / mimeType / size / hash / uploaderId）

### 9.2 安全
- 上传大小限制（默认 20MB，可配置）
- MIME 白名单（图片/pdf/docx/xlsx/csv）
- 病毒扫描占位（阶段 2 接入 ClamAV）
- 签名 URL 访问，禁止公开直链

---

## 10. 日志与审计

### 10.1 日志分层
| 类型 | 用途 | 存储 |
|---|---|---|
| 运行日志 | 应用运行状态、错误堆栈 | stdout/文件，pino |
| 访问日志 | HTTP 请求记录 | stdout，pino |
| 审计日志 | 关键业务操作（合规要求） | `AuditLog` 表 |
| Agent 日志 | Agent 任务执行步骤 | `AgentStep` 表 |

### 10.2 审计日志强制场景
- 登录 / 登出 / 登录失败
- 权限授予 / 撤销
- 内容创建 / 修改 / 删除 / 导出 / 分享
- 报告生成 / 交付状态变更
- API Key 创建 / 撤销
- 任何 DELETE 操作

### 10.3 审计字段（已落地 schema）
`tenantId / userId / action / resource / resourceId / method / path / ip / userAgent / statusCode / durationMs / result / details / errorMessage / requestId / createdAt`

### 10.4 保留策略
- 运行日志：30 天滚动
- 审计日志：默认 365 天（env 可配），生产环境导出到对象存储长期保留

---

## 11. 未来扩展点（架构预留，不在 1.0 落地）

1. **PostgreSQL RLS**：作为多租户深度防御层叠加
2. **独立 Worker 进程**：BullMQ worker 与 API 分离部署，水平扩展
3. **多 LLM Provider 路由**：抽象层支持 OpenAI / Anthropic / 国产模型动态切换与降级
4. **向量检索**：阶段 2 引入 pgvector，用于 GEO 内容相似度匹配（非 RAG 问答）
5. **WebSocket 实时推送**：Agent 任务进度、通知中心实时更新
6. **OpenTelemetry**：分布式追踪接入
7. **租户级配额与计费**：基于 BullMQ 计数 + 计费模块
8. **国际化 i18n**：next-intl 接入，1.0 预留文案外置
9. **公开 API 平台**：2.0 起对外提供 API（独立鉴权、配额、文档）
10. **行业模板市场**：1.5 起按行业沉淀 GEO 任务模板

---

## 12. 技术选型决策记录（ADR 摘要）

| 决策 | 选择 | 理由 |
|---|---|---|
| API 框架 | Fastify（非 NestJS） | 高性能、低样板、插件化；NestJS 的 DI 与装饰器对当前规模过重 |
| ORM | Prisma | 类型安全、迁移管理、生态成熟 |
| 队列 | BullMQ | Node 原生、Redis 复用、任务追踪完善 |
| 错误处理 | AppError + Result 双轨 | AppError 用于边界抛出，Result 用于 service 层显式失败；避免 try/catch 散落 |
| 多租户隔离 | 应用层 tenantId | 成本低、运维简单；后续叠加 RLS 深度防御 |
| 日志 | pino | 性能最佳的 Node logger，结构化 JSON |
| 测试 | Vitest + Playwright | Vitest 与 TS 原生集成快；Playwright 覆盖真实浏览器 e2e |
| Monorepo | pnpm workspace | 跨包共享类型/组件/配置，统一版本 |
