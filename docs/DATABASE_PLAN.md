# MOY 数据库设计（Database Plan）

> 本文件描述 MOY 1.0 的数据库实体设计、多租户隔离、索引策略。阶段 0 已落地企业级后台基线（Tenant/User/Role/AuditLog），GEO/Agent/内容资产等将在阶段 1+ 按本文件落地。

---

## 1. 设计原则

1. **多租户隔离第一公民**：所有租户资源表带 `tenantId`，唯一索引组合 `(tenantId, 业务键)`
2. **软删除**：核心业务表带 `deletedAt`，查询默认过滤（Prisma middleware 或 service 层显式）
3. **审计字段**：`createdAt` / `updatedAt` 由 Prisma `@default(now())` / `@updatedAt` 自动维护
4. **主键**：CUID 字符串，全局唯一，便于分布式与导出
5. **枚举**：用 Prisma enum 而非字符串常量，类型安全
6. **JSON 字段**：仅用于半结构化扩展元数据，核心字段必须独立列
7. **索引**：查询路径驱动索引设计，禁止过度索引

---

## 2. 多租户数据隔离设计

### 2.1 隔离层级
| 层级 | 机制 | 阶段 |
|---|---|---|
| 应用层 | Repository 强制 `where: { tenantId }` | 1.0（已落地 schema） |
| 索引层 | 唯一索引 `(tenantId, 业务键)` 防跨租户冲突 | 1.0 |
| 数据库层 | PostgreSQL Row-Level Security（深度防御） | 1.5+ 预留 |

### 2.2 平台级资源
- 平台用户、系统角色：`tenantId = null`
- 平台操作单独审计，与租户操作严格区分

### 2.3 跨租户禁止规则
- 任何查询不得省略 `tenantId` where 条件（除非明确平台级查询）
- Repository 层提供 `findByTenantId(tenantId, id)` 而非 `findById(id)`
- 软删除资源不得被跨租户访问

---

## 3. 核心实体设计

### 3.1 企业级后台（阶段 0 已落地 schema）

#### Tenant（租户）
| 字段 | 类型 | 说明 |
|---|---|---|
| id | String @id cuid | |
| name | String | 租户名称 |
| slug | String @unique | URL 友好标识 |
| status | TenantStatus enum | ACTIVE/SUSPENDED/TERMINATED |
| plan | String | starter/growth/enterprise |
| metadata | Json? | 套餐配额等扩展 |
| createdAt / updatedAt / deletedAt | DateTime | |

#### User（用户）
| 字段 | 类型 | 说明 |
|---|---|---|
| id | String @id | |
| tenantId | String? | null=平台用户 |
| email | String | 唯一约束 `(tenantId, email)` |
| passwordHash | String | argon2id + pepper |
| name | String | |
| status | UserStatus enum | ACTIVE/DISABLED/PENDING_INVITE |
| lastLoginAt | DateTime? | |
| roles | UserRole[] | 关联 |
| 索引 | `(tenantId, email)` / `email` / `status` | |

#### UserRole（用户角色关联）
| 字段 | 类型 | 说明 |
|---|---|---|
| id | String @id | |
| userId | String | |
| role | String | 角色名 |
| scope | RoleScope enum | SYSTEM / TENANT |
| 唯一约束 | `(userId, role, scope)` | |

#### RefreshToken（刷新令牌）
| 字段 | 类型 | 说明 |
|---|---|---|
| id | String @id | |
| userId | String | |
| tokenHash | String @unique | SHA-256(token) |
| expiresAt | DateTime | |
| revokedAt | DateTime? | 登出或刷新后撤销 |
| 索引 | `userId` / `expiresAt` | |

#### AuditLog（审计日志，已落地）
| 字段 | 类型 | 说明 |
|---|---|---|
| id | String @id | |
| tenantId | String? | |
| userId | String? | |
| action | String | CREATE/UPDATE/DELETE/READ/EXPORT/SHARE/LOGIN/... |
| resource | String | 资源类型 |
| resourceId | String? | |
| method / path | String? | HTTP 方法与路径 |
| ip / userAgent | String? | |
| statusCode / durationMs | Int? | |
| result | AuditResult enum | SUCCESS/FAILURE/DENIED |
| details | Json? | 变更前后快照 |
| errorMessage | String? | |
| requestId | String? | |
| createdAt | DateTime | 仅追加，禁止修改 |
| 索引 | `(tenantId, createdAt)` / `(userId, createdAt)` / `(action, createdAt)` / `requestId` | |

---

### 3.2 客户企业 / 品牌 / 产品 / 证书（阶段 2 落地）

#### CustomerCompany（客户企业 —— GEO 服务对象）
| 字段 | 类型 | 说明 |
|---|---|---|
| id | String @id | |
| tenantId | String | 隔离 |
| name | String | 客户企业名 |
| industry | String | 行业 |
| website | String? | 官网 |
| description | Text? | 简介 |
| metadata | Json? | |
| 索引 | `(tenantId, name)` | |

#### BrandAsset（品牌资产）
| 字段 | 类型 | 说明 |
|---|---|---|
| id | String @id | |
| tenantId | String | |
| customerId | String | 关联客户 |
| name | String | 品牌名 |
| type | BrandAssetType | BRAND/PRODUCT/SERVICE/CERT/CASE/CONTENT |
| keywords | String[] | 品牌关键词 |
| description | Text? | |
| 索引 | `(tenantId, customerId)` | |

#### Product（产品/服务）
| 字段 | 类型 | 说明 |
|---|---|---|
| id | String @id | |
| tenantId | String | |
| customerId | String | |
| brandAssetId | String? | |
| name | String | |
| description | Text? | |
| features | Json? | 卖点列表 |
| 索引 | `(tenantId, customerId)` | |

#### Certificate（证书/资质/案例素材）
| 字段 | 类型 | 说明 |
|---|---|---|
| id | String @id | |
| tenantId | String | |
| customerId | String | |
| type | CertType | CERT/QUALIFICATION/CASE/ARTICLE |
| title | String | |
| issuer | String? | 颁发机构 |
| issuedAt | DateTime? | |
| fileId | String? | 关联文件 |
| 索引 | `(tenantId, customerId, type)` | |

---

### 3.3 内容资产（阶段 2 落地）

#### ContentAsset（内容资产）
| 字段 | 类型 | 说明 |
|---|---|---|
| id | String @id | |
| tenantId | String | |
| customerId | String | |
| type | ContentType | QA/BAIKE/ARTICLE/NEWS/PRODUCT_DESC |
| title | String | |
| body | Text | |
| status | ContentStatus | DRAFT/REVIEW/PUBLISHED/ARCHIVED |
| producedByAgentId | String? | 生产 Agent |
| reviewedBy | String? | 人工审核人 |
| 索引 | `(tenantId, customerId, status)` | |

---

### 3.4 Prompt 矩阵与 GEO 监测（阶段 2 落地）

#### GeoProject（GEO 项目）
| 字段 | 类型 | 说明 |
|---|---|---|
| id | String @id | |
| tenantId | String | |
| customerId | String | |
| name | String | |
| status | GeoProjectStatus | DRAFT/ACTIVE/PAUSED/COMPLETED/ARCHIVED |
| metadata | Json? | geoDemo/mockData/demoReviewed 标记 |
| 索引 | `(tenantId, customerId)` | |

#### PromptMatrixEntry（提示词矩阵条目）
| 字段 | 类型 | 说明 |
|---|---|---|
| id | String @id | |
| tenantId | String | |
| projectId | String | |
| brandAssetId | String | |
| persona | String | 人群 |
| scenario | String | 场景 |
| provider | AiSearchProvider enum | AI 平台 |
| prompt | Text | |
| expectedKeywords | String[] | 期望提及词 |
| 索引 | `(tenantId, projectId, provider)` | |

#### GeoTestBatch（测试批次）
| 字段 | 类型 | 说明 |
|---|---|---|
| id | String @id | |
| tenantId | String | |
| projectId | String | |
| label | String | 含 mock/demo 标记则识别为 mock |
| isMock | Boolean | |
| status | BatchStatus | PENDING/RUNNING/COMPLETED/FAILED |
| 索引 | `(tenantId, projectId, createdAt)` | |

#### AiSearchTestResult（AI 搜索测试结果）
| 字段 | 类型 | 说明 |
|---|---|---|
| id | String @id | |
| tenantId | String | |
| projectId | String | |
| batchId | String | |
| matrixEntryId | String | |
| provider | AiSearchProvider | |
| modelName | String | |
| prompt | Text | |
| rawResponse | Text | |
| status | TestResultStatus | PENDING/VERIFIED/REJECTED |
| isMock | Boolean | |
| mentionRate | Float? | 0-1 |
| recommendationRate | Float? | |
| trustScore | Float? | |
| evidenceSummaryId | String? | |
| verifiedBy | String? | |
| verifiedAt | DateTime? | |
| 索引 | `(tenantId, batchId, status)` / `(tenantId, projectId, provider)` | |

#### EvidenceSummary（引用证据，防幻觉）
| 字段 | 类型 | 说明 |
|---|---|---|
| id | String @id | |
| tenantId | String | |
| resultId | String | |
| providerName | String | |
| modelName | String | |
| analysisMethod | String | |
| confidence | Float | |
| citationSources | String[] | |
| reviewStatus | TestResultStatus | |
| 索引 | `(tenantId, resultId)` | |

---

### 3.5 GEO 报告（阶段 2 落地）

#### GeoReport（GEO 报告）
| 字段 | 类型 | 说明 |
|---|---|---|
| id | String @id | |
| tenantId | String | |
| projectId | String | |
| title | String | |
| deliveryStatus | DeliveryStatus | DRAFT/READY_FOR_CLIENT/DELIVERED/ARCHIVED |
| summaryJson | Json | 强制字段见下 |
| markdownContent | Text? | |
| htmlContent | Text? | |
| metadataJson | Json? | delivery 复核信息存 metadataJson.delivery |
| 索引 | `(tenantId, projectId, deliveryStatus)` | |

**summaryJson 强制字段**：
`batchId / batchLabel / verifiedCount / pendingCount / rejectedCount / mentionRate / generatedAt / evidenceMethod / reviewPolicy / methodBoundary / evidenceSummaries`

---

### 3.6 Agent 执行记录（阶段 3 落地）

#### AgentTaskRecord（Agent 任务记录）
| 字段 | 类型 | 说明 |
|---|---|---|
| id | String @id | |
| tenantId | String | |
| role | AgentRole | CONTENT_OPS/SALES/CUSTOMER_SERVICE/DESIGNER/LEGAL_COMPLIANCE/DATA_ANALYST |
| status | AgentTaskStatus | QUEUED/PLANNING/EXECUTING/AWAITING_HUMAN_REVIEW/COMPLETED/FAILED/CANCELLED |
| input | Json | AgentTaskInput |
| output | Json? | AgentTaskOutput |
| llmCallCount | Int | 防失控 |
| errorMessage | String? | |
| startedAt | DateTime | |
| finishedAt | DateTime? | |
| 索引 | `(tenantId, role, status)` / `(tenantId, startedAt)` | |

#### AgentStep（Agent 执行步骤）
| 字段 | 类型 | 说明 |
|---|---|---|
| id | String @id | |
| tenantId | String | |
| taskId | String | |
| stepIndex | Int | |
| action | String | |
| llmModel | String? | |
| promptHash | String? | |
| tokenUsage | Json? | {prompt, completion} |
| result | Text? | |
| startedAt / finishedAt | DateTime | |
| 索引 | `(tenantId, taskId, stepIndex)` | |

#### PromptTemplate（Prompt 模板）
| 字段 | 类型 | 说明 |
|---|---|---|
| id | String @id | |
| tenantId | String? | null=平台模板 |
| role | AgentRole | |
| name | String | |
| template | Text | 含变量占位 |
| variables | String[] | |
| version | Int | |
| 索引 | `(tenantId, role, version)` | |

---

## 4. 枚举值汇总

```
TenantStatus: ACTIVE / SUSPENDED / TERMINATED
UserStatus: ACTIVE / DISABLED / PENDING_INVITE
RoleScope: SYSTEM / TENANT
AuditResult: SUCCESS / FAILURE / DENIED

BrandAssetType: BRAND / PRODUCT / SERVICE / CERT / CASE / CONTENT
CertType: CERT / QUALIFICATION / CASE / ARTICLE
ContentType: QA / BAIKE / ARTICLE / NEWS / PRODUCT_DESC
ContentStatus: DRAFT / REVIEW / PUBLISHED / ARCHIVED

GeoProjectStatus: DRAFT / ACTIVE / PAUSED / COMPLETED / ARCHIVED
BatchStatus: PENDING / RUNNING / COMPLETED / FAILED
TestResultStatus: PENDING / VERIFIED / REJECTED
DeliveryStatus: DRAFT / READY_FOR_CLIENT / DELIVERED / ARCHIVED
AiSearchProvider: OPENAI_CHATGPT / PERPLEXITY / GOOGLE_AIO / BING_COPILOT / CLAUDE / GEMINI / KIMI / DOUBAO / DEEPSEEK / WENXIN / ZHIPU / META_AI / OTHER

AgentRole: CONTENT_OPS / SALES / CUSTOMER_SERVICE / DESIGNER / LEGAL_COMPLIANCE / DATA_ANALYST
AgentTaskStatus: QUEUED / PLANNING / EXECUTING / AWAITING_HUMAN_REVIEW / COMPLETED / FAILED / CANCELLED
```

---

## 5. 迁移与种子策略

### 5.1 迁移
- `prisma migrate dev`：开发环境生成迁移
- `prisma migrate deploy`：CI/生产环境应用迁移
- 迁移文件一旦合并到 main，禁止修改，只能新增
- 破坏性迁移（drop column）必须分两步：先标记废弃 → 下个版本删除

### 5.2 种子数据
- `apps/api/prisma/seed.ts`：开发环境基础数据（1 个平台管理员 + 1 个 demo 租户）
- 真实客户数据禁止进种子
- Mock 数据通过 `batchLabel` 含 `mock-`/`-mock`/`-mock-` 标记识别

### 5.3 索引性能
- 单表索引 ≤ 6 个
- 复合索引字段顺序：高选择性在前
- 大表（>100 万行）查询必须走索引，禁止全表扫描

---

## 6. 阶段落地计划

| 阶段 | 落地实体 |
|---|---|
| 阶段 0（已落地） | Tenant / User / UserRole / RefreshToken / AuditLog |
| 阶段 1 | ApiKey / Notification / SystemSetting / FileAsset |
| 阶段 2 | CustomerCompany / BrandAsset / Product / Certificate / ContentAsset / GeoProject / PromptMatrixEntry / GeoTestBatch / AiSearchTestResult / EvidenceSummary / GeoReport |
| 阶段 3 | AgentTaskRecord / AgentStep / PromptTemplate / Lead（线索） |

每个阶段落地前必须：
1. 更新本文件
2. 更新 `prisma/schema.prisma`
3. `pnpm prisma:validate` 通过
4. 生成迁移
5. 补充种子与测试
