/**
 * GEO 领域共享类型。
 *
 * 重要边界：GEO ≠ RAG ≠ 企业知识库问答。
 * GEO 核心指标 = AI 搜索可见度、引用率、推荐率、可信度、获客转化。
 */
import type { ID, ISODateString } from './index.js';

/** AI 搜索平台 */
export type AiSearchProvider =
  | 'OPENAI_CHATGPT'
  | 'PERPLEXITY'
  | 'GOOGLE_AIO'
  | 'BING_COPILOT'
  | 'META_AI'
  | 'CLAUDE'
  | 'GEMINI'
  | 'KIMI'
  | 'DOUBAO'
  | 'DEEPSEEK'
  | 'WENXIN'
  | 'ZHIPU'
  | 'OTHER';

/** GEO 项目 */
export interface GeoProject {
  id: ID;
  tenantId: ID;
  customerId: ID;
  name: string;
  status: GeoProjectStatus;
  metadata?: GeoProjectMetadata;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export type GeoProjectStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED';

export interface GeoProjectMetadata {
  /** 是否为 demo 项目 */
  geoDemo?: boolean;
  /** 是否包含 mock 数据 */
  mockData?: boolean;
  /** 是否经过人工复核 */
  demoReviewed?: boolean;
  [key: string]: unknown;
}

/** 提示词矩阵维度：品牌 × 人群 × 场景 × 平台 */
export interface PromptMatrixEntry {
  id: ID;
  projectId: ID;
  brandAssetId: ID;
  persona: string;
  scenario: string;
  provider: AiSearchProvider;
  prompt: string;
  /** 期望提及的品牌关键词 */
  expectedKeywords: string[];
}

/** AI 搜索监测结果 */
export type TestResultStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

export interface AiSearchTestResult {
  id: ID;
  projectId: ID;
  batchId: ID;
  provider: AiSearchProvider;
  modelName: string;
  prompt: string;
  rawResponse: string;
  status: TestResultStatus;
  /** 是否为 mock 数据（与真实测试严格区分） */
  isMock: boolean;
  /** 引用率 0-1 */
  mentionRate?: number;
  /** 推荐率 0-1 */
  recommendationRate?: number;
  /** 可信度评分 0-1 */
  trustScore?: number;
  /** 引用证据（人工复核必填） */
  evidenceSummary?: EvidenceSummary;
  createdAt: ISODateString;
  verifiedAt?: ISODateString;
}

export interface EvidenceSummary {
  resultId: ID;
  providerName: string;
  modelName: string;
  analysisMethod: string;
  confidence: number;
  citationSources: string[];
  reviewStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
}

/** 报告交付状态 */
export type DeliveryStatus = 'DRAFT' | 'READY_FOR_CLIENT' | 'DELIVERED' | 'ARCHIVED';

/** GEO 报告 */
export interface GeoReport {
  id: ID;
  projectId: ID;
  title: string;
  deliveryStatus: DeliveryStatus;
  summaryJson: GeoReportSummary;
  markdownContent?: string;
  htmlContent?: string;
  metadataJson?: Record<string, unknown>;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/** 报告摘要（强制字段，用于交付就绪检查） */
export interface GeoReportSummary {
  batchId: ID;
  batchLabel: string;
  verifiedCount: number;
  pendingCount: number;
  rejectedCount: number;
  mentionRate: number;
  generatedAt: ISODateString;
  evidenceMethod: string;
  reviewPolicy: string;
  methodBoundary: string;
  evidenceSummaries: EvidenceSummary[];
}
