# MOY · Mate Of You

> 桐鸣科技 B 端 AI 增长操作系统。1.0 正式商业版以 GEO（生成式引擎优化 / AI 搜索优化）为第一切入口，帮助企业提升品牌、产品、官网、内容在 AI 搜索与大模型回答场景中的可见度、引用率、推荐率与可信度，并通过 AI 超级员工形成从 AI 搜索曝光到线索跟进、内容生产、合规审查、效果复盘的业务闭环。

> 本仓库当前处于 **阶段 0：工程底座与项目宪法**。尚未交付业务功能，仅完成企业级工程基座、技术架构、数据库设计、Agent 架构与产品宪章文档。

---

## 项目定位（摘要）

- **不是 MVP，不是 Demo**：MOY 1.0 是 First Complete Product，第一个正式商业版本。
- **GEO 不是 RAG，不是企业知识库问答**：GEO 的核心是 AI 搜索可见度、引用率、推荐率、可信度与获客转化。
- **三大模块**：GEO 工作台、AI 超级员工、企业级后台。
- 详细产品边界见 [docs/PRODUCT_CHARTER.md](docs/PRODUCT_CHARTER.md)。

## 技术栈

| 层 | 技术 |
|---|---|
| Monorepo | pnpm workspace |
| 前端 | Next.js 14 (App Router) + TypeScript |
| 后端 | Fastify + TypeScript |
| 数据库 | PostgreSQL + Prisma |
| 缓存/队列 | Redis + BullMQ |
| 校验 | Zod |
| 单测 | Vitest |
| E2E | Playwright |
| 容器 | Docker Compose |
| CI | GitHub Actions |

## 仓库结构

```
moy/
├─ apps/
│  ├─ api/                 # Fastify 后端服务
│  └─ web/                 # Next.js 前端应用
├─ packages/
│  ├─ config/              # 共享 ESLint / Prettier / TS 配置
│  ├─ shared/              # 共享类型、常量、工具函数、错误、日志
│  └─ ui/                  # 共享 UI 组件库
├─ docs/                   # 项目宪法与架构文档
├─ docker-compose.yml      # 本地 PostgreSQL + Redis
├─ .github/workflows/ci.yml
├─ tsconfig.base.json
└─ package.json
```

## 本地启动

### 前置要求
- Node.js >= 20.10
- pnpm >= 9.0
- Docker Desktop（用于本地 Postgres / Redis）

### 步骤
```bash
# 1. 安装依赖
pnpm install

# 2. 复制环境变量
cp .env.example .env

# 3. 启动本地数据库与缓存
pnpm docker:up

# 4. 生成 Prisma Client（首次）
pnpm prisma:generate

# 5. 启动开发服务（API + Web 并行）
pnpm dev
```

- API: http://localhost:4000
- Web: http://localhost:3000
- 健康检查: http://localhost:4000/health

## 常用命令

| 命令 | 说明 |
|---|---|
| `pnpm dev` | 并行启动所有 app 开发服务 |
| `pnpm dev:api` / `pnpm dev:web` | 单独启动 API / Web |
| `pnpm lint` | 全仓 ESLint |
| `pnpm typecheck` | 全仓 TS 类型检查 |
| `pnpm test` | 运行所有测试 |
| `pnpm test:unit` | 仅单元测试 |
| `pnpm test:e2e` | 仅端到端测试 |
| `pnpm build` | 构建所有包与 app |
| `pnpm prisma:validate` | 校验 Prisma schema |
| `pnpm docker:up` / `pnpm docker:down` | 启停本地依赖服务 |
| `pnpm format` | Prettier 格式化 |

## 文档导航

| 文档 | 内容 |
|---|---|
| [PRODUCT_CHARTER.md](docs/PRODUCT_CHARTER.md) | 产品定位、边界、不可妥协原则 |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | 总体架构、前后端、多租户、权限、Agent |
| [DEVELOPMENT_STANDARDS.md](docs/DEVELOPMENT_STANDARDS.md) | 代码规范、Git 规范、测试、安全 |
| [DATABASE_PLAN.md](docs/DATABASE_PLAN.md) | 核心实体与数据库设计 |
| [AGENT_ARCHITECTURE.md](docs/AGENT_ARCHITECTURE.md) | AI 超级员工 Agent 架构 |
| [ROADMAP.md](docs/ROADMAP.md) | 1.0 / 1.5 / 2.0 / 3.0 路线 |

## 工程原则

1. 企业级标准：清晰架构、类型安全、权限控制、审计日志、测试、错误处理、安全边界。
2. 不允许为快速实现写不可维护代码。
3. 不允许只做前端假页面（除非明确标注 UI 原型阶段）。
4. 不允许引入无必要复杂度，但为后续企业级扩展预留架构空间。
5. 所有关键决策写入文档。

License: UNLICENSED © 桐鸣科技
