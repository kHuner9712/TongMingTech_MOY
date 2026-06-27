# MOY 开发规范（Development Standards）

> 本文件是 MOY 项目的强制开发规范。所有提交必须符合本规范。Code Review 以本文件为检查清单。

---

## 1. 代码规范

### 1.1 TypeScript 严格模式（强制）
- 所有包继承 `tsconfig.base.json`，开启 `strict` + `noUnusedLocals` + `noUnusedParameters` + `noImplicitReturns` + `noUncheckedIndexedAccess`
- 禁止 `any`（必要时用 `unknown` 并收窄），ESLint `@typescript-eslint/no-explicit-any` 为 warn，CR 阻断
- 禁止 `// @ts-ignore`，用 `// @ts-expect-error: 原因` 并写明理由
- 禁止 `as unknown as T` 强转，除非有明确类型守卫

### 1.2 模块与导入
- 使用 ESM（`"type": "module"`），导入路径带 `.js` 后缀（TS 5 + NodeNext 要求）
- 一致使用 `import type` 区分类型导入
- 禁止 `export *`（除 barrel index.ts 显式聚合）
- 循环依赖零容忍，新增循环依赖 CR 阻断

### 1.3 命名规范

| 类型 | 规范 | 示例 |
|---|---|---|
| 文件 | 业务文件 camelCase，组件文件 PascalCase，配置 kebab-case | `geo.service.ts` / `Button.tsx` / `tsconfig.base.json` |
| 变量/函数 | camelCase | `getTenantById` |
| 类/接口/类型 | PascalCase | `GeoProject` / `AgentTaskRecord` |
| 常量 | UPPER_SNAKE_CASE | `DEFAULT_PAGE_SIZE` |
| 枚举值 | UPPER_SNAKE_CASE | `TenantStatus.ACTIVE` |
| 私有成员 | 前缀 `_`（仅当必要） | `_internalCache` |
| 布尔变量 | `is`/`has`/`should` 前缀 | `isLoading` / `hasPermission` |
| 事件处理 | `on` 前缀 | `onSubmit` |
| 异步函数 | 不强制 `Async` 后缀，但返回 Promise 类型必须显式 | `Promise<Result<T>>` |

### 1.4 函数设计
- 单一职责，函数长度建议 < 60 行，超过 100 行必须拆分
- 参数 ≤ 4 个，超过用对象封装
- 纯函数优先，副作用隔离到边界
- service 层返回 `Result<T>`，不 throw（边界层 try/catch 后转 Result）
- 禁止在循环中 await，用 `Promise.all`

---

## 2. Git 分支与提交规范

### 2.1 分支模型
- `main`：生产分支，保护分支，只接受 PR 合并
- `develop`：集成分支，PR 目标分支
- `feature/<scope>-<short-desc>`：功能分支
- `fix/<scope>-<short-desc>`：修复分支
- `refactor/<scope>-<short-desc>`：重构分支
- `chore/<short-desc>`：工程杂项

scope 取值：`geo` / `agent` / `auth` / `tenant` / `ui` / `infra` / `doc` / `test`

### 2.2 Commit Message（Conventional Commits）
```
<type>(<scope>): <subject>

<body 可选>

<footer 可选>
```
- type：`feat` / `fix` / `refactor` / `test` / `docs` / `chore` / `perf` / `build` / `ci`
- scope：见上
- subject：祈使句，< 50 字符，不含句号
- 示例：`feat(geo): 新增提示词矩阵批量运行 API`
- BREAKING CHANGE 在 footer 标注：`BREAKING CHANGE: 移除 v1 的 /legacy 接口`

### 2.3 PR 规范
- PR 标题同 commit message 格式
- PR 描述必须包含：
  - 变更摘要（改了什么）
  - 变更原因（为什么改）
  - 验收方式（如何验证）
  - 风险与回滚（如有）
- PR 必须通过 CI（lint / typecheck / test / build）才能合并
- 至少 1 人 approve（核心模块 2 人）

---

## 3. 测试要求

### 3.1 测试金字塔
```
        /\
       /e2e\        少量，关键流程
      /------\
     / 集成测试 \     中等，API + 真实依赖 mock
    /----------\
   /   单元测试   \   最多，纯逻辑
  /--------------\
```

### 3.2 覆盖率要求
| 类型 | 要求 |
|---|---|
| 单元测试 | service / 工具函数 / 错误体系 / Result 必测 |
| 集成测试 | 每个 API endpoint 至少 1 个 happy path + 1 个 error path |
| e2e | 登录、GEO 任务创建到报告生成主流程、Agent 任务执行主流程 |
| 覆盖率 | shared 包 ≥ 85%，api 关键模块 ≥ 75%，整体不低于 70% |

### 3.3 测试规范
- 测试文件与被测文件同目录或 `tests/` 目录，命名 `*.test.ts`
- 每个测试用例独立，禁止依赖执行顺序
- mock 外部依赖（DB / Redis / LLM），单测禁止连真实服务
- 测试名用业务语言：`it('在 Postgres 异常时返回 503', ...)` 而非 `it('test1', ...)`
- 已落地样例：`packages/shared/tests/*.test.ts`、`apps/api/tests/health.test.ts`

---

## 4. 错误处理规范

### 4.1 错误分层
- **service 层**：返回 `Result<T, AppError>`，用 `Ok()` / `Err()` 构造，不 throw
- **边界层（controller / route handler）**：用 `tryAsync` 捕获，或直接 `if (r.isErr()) throw r.error` 让 errorHandler 接管
- **基础设施层**：throw `AppError`（带 ErrorCode）
- **禁止**：throw 字符串、throw 裸 `Error`、吞掉异常不记录

### 4.2 错误码使用
- 所有错误码登记在 `@moy/shared` 的 `ErrorCode` 常量表
- 新增错误码必须先登记再使用，禁止字符串字面量
- 错误码命名：`DOMAIN_REASON`，全大写下划线

### 4.3 错误暴露策略
| 类型 | expose | 客户端可见 message |
|---|---|---|
| 业务校验错误（ValidationError） | true | 原始 message |
| 鉴权/权限错误 | true | 原始 message |
| 资源不存在 | true | 原始 message |
| 租户隔离违规 | false | "Internal server error" |
| LLM Provider 错误 | false | "Internal server error" |
| 未知内部错误 | false | "Internal server error" |

### 4.4 错误响应体（已落地）
```json
{
  "success": false,
  "error": { "code": "GEO_NO_VERIFIED_RESULTS", "message": "无可信测试结果", "details": { ... } },
  "requestId": "req_xxx"
}
```

---

## 5. API 设计规范

### 5.1 URL
- 版本前缀：`/v1`
- 资源命名：复数名词，kebab-case
- 嵌套：`/v1/tenants/:tenantId/geo-projects/:projectId/reports/:reportId`
- 查询参数：分页 `page` / `pageSize`，排序 `sort=field:asc`，过滤 `?status=ACTIVE`

### 5.2 方法
- GET：查询，幂等，无副作用
- POST：创建 / 非幂等动作（动作型 URL 用动词：`POST /reports/:id/deliver`）
- PATCH：部分更新
- PUT：整体替换（少用）
- DELETE：删除（软删除）

### 5.3 响应体
成功：
```json
{ "success": true, "data": { ... }, "requestId": "req_xxx" }
```
分页：
```json
{ "success": true, "data": { "items": [...], "total": 100, "page": 1, "pageSize": 20 } }
```
失败：见 §4.4

### 5.4 状态码
| 码 | 场景 |
|---|---|
| 200 | 成功（GET / PATCH） |
| 201 | 创建成功（POST） |
| 204 | 无内容（DELETE） |
| 400 | 校验错误 |
| 401 | 未认证 |
| 403 | 无权限 / 租户隔离违规 |
| 404 | 资源不存在 |
| 409 | 冲突（唯一约束） |
| 429 | 限流 |
| 500 | 内部错误 |
| 502 | 上游错误（LLM Provider） |
| 503 | 依赖不可用（健康检查） |

### 5.5 输入校验
- 所有输入用 Zod schema 校验，schema 与前端共享（放 `@moy/shared` 或模块 schema.ts）
- 校验失败抛 `ValidationError`，错误码 `VALIDATION_ERROR`
- 路径参数、查询参数、请求体都要校验

### 5.6 幂等性
- 创建类 API 接收 `Idempotency-Key` header，5 分钟内重复请求返回首次结果
- 关键操作（支付、报告交付）强制幂等

---

## 6. 安全规范

### 6.1 鉴权与密码
- 密码 hash：argon2id + pepper（pepper 来自 env，不进库）
- 密码策略：≥ 10 字符，含大小写+数字+符号
- 登录失败锁定：5 次失败锁 15 分钟
- JWT secret ≥ 32 字符，env 注入
- Refresh Token 存表可撤销，登出即撤销

### 6.2 输入安全
- 所有输入 Zod 校验，拒绝非法字符
- SQL 注入：Prisma 参数化查询，禁止字符串拼接 SQL
- XSS：Next.js 默认转义，富文本用 DOMPurify
- CSRF：SameSite=Lax cookie + 自定义 header 校验

### 6.3 敏感数据
- 密码 / token / secret / cookie / apiKey 在日志层自动脱敏（已落地）
- 禁止把密钥写进代码、提交到仓库（.env 在 .gitignore）
- 生产环境密钥从密钥管理服务注入，非 env 文件

### 6.4 速率限制
- 登录 API：10 次/分钟/IP
- 公开 API：100 次/分钟/租户
- LLM 调用：按租户套餐配额

### 6.5 审计
- 关键操作必须写审计日志（见 ARCHITECTURE.md §10.2）
- 审计日志不可修改、不可删除（仅追加）
- 审计日志保留 ≥ 365 天

---

## 7. 禁止事项（红线）

1. ❌ 在 service 层直接 throw 字符串或裸 Error
2. ❌ 在 repository 层省略 `where: { tenantId }`
3. ❌ 在前端硬编码 API 地址（用 `NEXT_PUBLIC_API_BASE_URL`）
4. ❌ 在前端写业务规则（业务规则在后端）
5. ❌ 提交 `.env` / 密钥 / 客户真实数据
6. ❌ 提交未通过 lint / typecheck / test 的代码
7. ❌ 在 main / develop 直接 push（必须 PR）
8. ❌ 使用 `any` 而不写理由
9. ❌ Mock 数据伪装成真实数据（必须标记 mock/demo）
10. ❌ 删除审计日志或绕过审计写入
11. ❌ 把 MOY 写成 MVP / 半成品交付客户
12. ❌ 把 GEO 写成 RAG / 知识库问答
13. ❌ 引入未在 package.json 登记的依赖
14. ❌ 在循环中 await（用 Promise.all）
15. ❌ 写没有错误处理的代码（吞异常 / 空 catch）

---

## 8. Code Review 检查清单

提交 PR 前，作者自查 + 评审人核对：

- [ ] 通过 `pnpm lint` `pnpm typecheck` `pnpm test:unit` `pnpm build`
- [ ] 新增 API 有 Zod schema + 集成测试
- [ ] service 层返回 Result，无裸 throw
- [ ] repository 层带 tenantId，无跨租户风险
- [ ] 关键操作写审计日志
- [ ] 敏感字段未进日志
- [ ] 错误码已登记 ErrorCode 表
- [ ] 无 `any` / `@ts-ignore` 残留
- [ ] 新增依赖在 package.json 登记，且必要
- [ ] 文档（API / 架构 / 数据库）同步更新
- [ ] 提交信息符合 Conventional Commits
