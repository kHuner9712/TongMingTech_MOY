/**
 * AI 超级员工 Agent 共享类型。
 *
 * Agent 不是简单的 LLM 调用封装，而是：
 * 1. 有明确职责边界的角色（内容运营 / 销售 / 客服 / 美工 / 法务合规 / 数据分析）
 * 2. 有人工审核 hook
 * 3. 有任务执行日志
 * 4. 有防幻觉机制
 */
import type { ID, ISODateString } from './index.js';

export type AgentRole =
  | 'CONTENT_OPS' // AI 内容运营
  | 'SALES' // AI 销售
  | 'CUSTOMER_SERVICE' // AI 客服
  | 'DESIGNER' // AI 美工
  | 'LEGAL_COMPLIANCE' // AI 法务/合规
  | 'DATA_ANALYST'; // AI 数据分析

export type AgentTaskStatus =
  | 'QUEUED'
  | 'PLANNING'
  | 'EXECUTING'
  | 'AWAITING_HUMAN_REVIEW'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

/** Agent 任务输入 */
export interface AgentTaskInput {
  role: AgentRole;
  tenantId: ID;
  projectId?: ID;
  prompt: string;
  context?: Record<string, unknown>;
  /** 是否必须经过人工审核才能交付 */
  requireHumanReview: boolean;
  /** 允许的最大 LLM 调用次数（防失控） */
  maxLlmCalls: number;
}

/** Agent 任务执行记录 */
export interface AgentTaskRecord {
  id: ID;
  tenantId: ID;
  role: AgentRole;
  status: AgentTaskStatus;
  input: AgentTaskInput;
  output?: AgentTaskOutput;
  /** LLM 调用次数（防幻觉 / 防失控） */
  llmCallCount: number;
  /** 执行步骤日志 */
  steps: AgentStep[];
  errorMessage?: string;
  startedAt: ISODateString;
  finishedAt?: ISODateString;
}

export interface AgentTaskOutput {
  content: string;
  /** 引用证据（防幻觉） */
  citations?: Array<{ source: string; snippet: string }>;
  /** 自检置信度 0-1 */
  confidence?: number;
  /** 风险标记（法务/合规 Agent 输出） */
  riskFlags?: string[];
  metadata?: Record<string, unknown>;
}

export interface AgentStep {
  stepIndex: number;
  action: string;
  llmModel?: string;
  promptHash?: string;
  startedAt: ISODateString;
  finishedAt?: ISODateString;
  tokenUsage?: { prompt: number; completion: number };
  result?: string;
}

/** LLM 抽象层调用参数 */
export interface LlmCallParams {
  model: string;
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  /** 超时毫秒 */
  timeoutMs?: number;
}

/** LLM 抽象层调用结果 */
export interface LlmCallResult {
  content: string;
  model: string;
  tokenUsage: { prompt: number; completion: number };
  finishReason: string;
}
