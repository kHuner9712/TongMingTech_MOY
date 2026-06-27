# MOY Agent 架构（AI 超级员工）

> 本文件定义 MOY 中 AI 超级员工（Agent）的架构、职责边界、调用抽象、防幻觉机制与人工审核流程。所有 Agent 实现必须以本文件为准。

---

## 1. MOY 中 Agent 的定位

### 1.1 不是什么
- ❌ 不是通用聊天机器人
- ❌ 不是无限制的 LLM 调用包装
- ❌ 不是脱离业务的"AI 助手"功能

### 1.2 是什么
AI 超级员工是 **GEO 业务闭环的执行单元**，每个 Agent：
1. 有明确职责边界（6 类角色，职责不重叠）
2. 有触发条件（GEO 任务计划 / 定时 / 手动 / 事件）
3. 有输出规范（结构化内容 + 引用证据 + 置信度 + 风险标记）
4. 有人工审核 hook（human-in-the-loop，关键输出必审）
5. 有防幻觉机制（引用证据 + 置信度阈值 + 最大 LLM 调用次数）
6. 有完整执行日志（每步 LLM 调用、token 消耗、结果可审计）

### 1.3 Agent 与 GEO 的关系（闭环）
```
GEO 工作台定义任务
  → AI 内容运营 Agent 生产内容
  → AI 法务/合规 Agent 审查风险
  → AI 美工 Agent 生成配图需求
  → 内容发布交付
  → AI 搜索监测度量效果
  → AI 数据分析 Agent 生成报告与建议
  → AI 销售 Agent 处理 GEO 线索
  → AI 客服 Agent 沉淀真实问答反哺资产库
  → 回到 GEO 工作台（新任务）
```

---

## 2. 6 类 Agent 职责定义

### 2.1 AI 内容运营 Agent（CONTENT_OPS）
**职责**：生产 GEO 内容资产
- 输入：品牌资产 + 目标关键词 + AI 平台 + 人群场景
- 输出：
  - 问答内容（针对 AI 搜索高频问题）
  - 百科草稿
  - 媒体稿草稿
  - 产品介绍
  - 行业文章
- 防幻觉：必须引用品牌知识库来源，输出 citations
- 审核：交付前必经人工审核
- 边界：不直接发布，只生产草稿

### 2.2 AI 销售 Agent（SALES）
**职责**：基于 GEO 线索的跟进辅助
- 输入：GEO 线索（来源/行为/兴趣关键词）
- 输出：
  - 线索分级（A/B/C/D）
  - 跟进建议（时机/渠道/重点）
  - 销售话术草稿
  - 邮件/私信草稿
- 防幻觉：话术不得虚构产品功能，必须基于产品知识库
- 审核：话术与对外草稿必审
- 边界：不自动发送，只生成草稿

### 2.3 AI 客服 Agent（CUSTOMER_SERVICE）
**职责**：客户咨询响应 + 问答资产沉淀
- 输入：客户咨询消息
- 输出：
  - 自动回复草稿（常规问题）
  - 高风险问题升级标记
  - 沉淀客户真实问答到 GEO 问答资产库
- 防幻觉：不确定的问题标记"需人工核实"，不编造答案
- 审核：高风险问题强制人工接管
- 边界：不替代人工客服，只辅助

### 2.4 AI 美工 Agent（DESIGNER）
**职责**：内容视觉辅助
- 输入：内容运营 Agent 的产出 + 视觉需求
- 输出：
  - 配图思路（描述性，不直接生成图片以避免版权风险）
  - 海报构图建议
  - 视觉素材需求说明（给设计师的 brief）
- 防幻觉：明确标注"思路"而非成品，不声称已生成图片
- 审核：需求说明必审
- 边界：1.0 不接入图片生成模型，只产出文字需求（避免版权与合规风险）

### 2.5 AI 法务/合规 Agent（LEGAL_COMPLIANCE）
**职责**：内容合规审查（强制阻断型）
- 输入：待发布内容
- 输出：
  - 违规表述清单（广告法/行业法规/平台规则）
  - 夸大宣传风险标记
  - 行业敏感词风险
  - 整改建议
- 防幻觉：风险标记必须引用具体法规/规则依据
- 审核：本 Agent 输出即审核结论，高风险直接阻断发布
- 边界：不替代专业法律意见，重大合规问题提示客户咨询专业律师

### 2.6 AI 数据分析 Agent（DATA_ANALYST）
**职责**：GEO 效果分析与报告
- 输入：GEO 监测数据 + 测试批次结果
- 输出：
  - GEO 周报 / 月报
  - 客户交付报告草稿
  - 优化建议
  - 趋势分析
- 防幻觉：所有数据引用必须可溯源到具体测试结果，禁止编造数字
- 审核：客户交付报告必审，且必须包含方法边界声明
- 边界：报告必须区分 VERIFIED / PENDING / REJECTED 结果，未 VERIFIED 不计入核心指标

---

## 3. Agent 调用 LLM 的抽象层

### 3.1 LlmProvider 接口
```typescript
interface LlmProvider {
  name: string;
  call(params: LlmCallParams): Promise<Result<LlmCallResult, AppError>>;
  /** 健康检查（用于就绪探针） */
  health(): Promise<boolean>;
}
```

### 3.2 多 Provider 路由（阶段 3 落地）
- 默认 Provider：env `LLM_PROVIDER` 配置
- 按 Agent 角色可指定不同 Provider（如法务用 Claude，内容运营用 GPT-4o）
- Provider 降级：主 Provider 超时/限流自动切换备用
- Provider 注册表：启动时注册所有 Provider，运行时按角色路由

### 3.3 调用约束
- 超时：默认 30s，LLM 任务 60s，超时抛 `LLM_TIMEOUT`
- 重试：429 限流指数退避 3 次，其他错误不自动重试
- 费用控制：每个 Agent 任务最大 LLM 调用次数（`maxLlmCalls`），超限终止并标记 FAILED
- token 计量：每次调用记录 prompt/completion token，写入 `AgentStep.tokenUsage`

---

## 4. Prompt 模板管理

### 4.1 模板存储
- 平台模板：`tenantId = null`，系统内置，只读
- 租户模板：`tenantId = 具体值`，租户可基于平台模板派生定制
- 版本化：每个模板有 `version`，变更创建新版本，旧版本保留

### 4.2 模板变量
- 模板用 `{{varName}}` 占位
- 变量类型在 `variables` 字段声明
- 运行时注入变量前必须 Zod 校验类型与范围
- 禁止把敏感字段（密码/token）作为变量注入 Prompt

### 4.3 模板审核
- 平台模板由产品团队审核入库
- 租户模板由租户管理员审核启用
- 模板变更写审计日志

---

## 5. 人工审核机制（Human-in-the-Loop）

### 5.1 审核触发点
| Agent | 强制审核场景 |
|---|---|
| 内容运营 | 任何对外交付前 |
| 销售 | 话术与对外草稿 |
| 客服 | 高风险问题 |
| 美工 | 需求说明 |
| 法务/合规 | 高风险直接阻断（即审核结论） |
| 数据分析 | 客户交付报告 |

### 5.2 审核流程
```
Agent 任务执行完成
  → status = AWAITING_HUMAN_REVIEW
  → 写入 AgentTaskRecord
  → 通知中心推送审核任务给审核人
  → 审核人 approve / reject / request-revision
  → approve：status = COMPLETED，内容进入交付流
  → reject：status = FAILED，记录拒绝理由
  → request-revision：回到 Agent 重新执行（带审核反馈）
```

### 5.3 审核SLA
- 内容交付审核：≤ 4 工作小时
- 客户报告审核：≤ 1 工作日
- 超时自动升级通知

---

## 6. 防幻觉机制

### 6.1 引用证据强制
- 内容运营 Agent 输出必须包含 `citations: [{source, snippet}]`
- 数据分析 Agent 报告必须可溯源到 `AiSearchTestResult`
- 无引用的输出标记低置信度，强制人工审核

### 6.2 置信度阈值
- 每个 Agent 输出携带 `confidence: number (0-1)`
- 阈值（可按 Agent 配置）：
  - 内容运营：confidence < 0.7 强制审核
  - 法务合规：confidence < 0.8 强制审核
  - 数据分析：confidence < 0.85 强制审核
- 低于阈值的输出不得自动交付

### 6.3 最大调用次数
- 每个 Agent 任务 `maxLlmCalls` 上限（默认 5，法务 3）
- 超限终止任务，标记 FAILED，记录告警
- 防止 Agent 自循环失控

### 6.4 输出校验
- Agent 输出必须符合 `AgentTaskOutput` schema
- 关键字段缺失（如内容运营无 citations）直接 reject
- 敏感词扫描（接法务合规 Agent 的词表）

### 6.5 禁止行为
- ❌ Agent 不得编造未在知识库中的产品功能
- ❌ Agent 不得编造未在测试结果中的数据
- ❌ Agent 不得自行决定绕过审核
- ❌ Agent 不得跨租户读取数据
- ❌ Agent 不得直接调用外部 API（除 LLM Provider）

---

## 7. 任务执行日志

### 7.1 AgentTaskRecord（任务级）
记录：role / status / input / output / llmCallCount / startedAt / finishedAt / errorMessage

### 7.2 AgentStep（步骤级）
每次 LLM 调用记录一条：
- stepIndex / action / llmModel / promptHash（不存原文，隐私与体积）
- tokenUsage / result（摘要）/ startedAt / finishedAt

### 7.3 日志用途
- 审计：谁在何时让哪个 Agent 做了什么
- 复盘：失败任务根因分析
- 优化：识别低效 Prompt 与高 token 消耗步骤
- 合规：客户报告可追溯生成过程

### 7.4 日志保留
- AgentTaskRecord：与业务数据同寿命
- AgentStep：≥ 180 天
- promptHash 而非原文，敏感 Prompt 内容不长期留存

---

## 8. Agent 任务状态机

```
QUEUED
  ↓ (worker 取出)
PLANNING
  ↓ (规划步骤)
EXECUTING
  ↓ (执行 LLM 调用)
  ├─ 需审核 → AWAITING_HUMAN_REVIEW
  │            ├─ approve → COMPLETED
  │            ├─ reject  → FAILED
  │            └─ revision → 回到 EXECUTING
  ├─ 无需审核 → COMPLETED
  ├─ 失败 → FAILED
  └─ 取消 → CANCELLED
```

状态变更必须：
1. 更新 `AgentTaskRecord.status`
2. 写审计日志
3. 通知中心推送（如需）

---

## 9. 阶段落地计划

| 阶段 | 落地内容 |
|---|---|
| 阶段 0（已落地） | Agent 类型定义（`@moy/shared` types/agent.ts）、LlmCallParams/Result 抽象类型 |
| 阶段 1 | LlmProvider 接口 + OpenAI Provider 实现 + PromptTemplate 表 |
| 阶段 2 | 内容运营 Agent（最小可用，配合 GEO 工作台） |
| 阶段 3 | 6 类 Agent 全量 + 人工审核 UI + 任务队列 |
| 阶段 4 | 多 Provider 路由 + 费用计量 + 租户级配额 |
