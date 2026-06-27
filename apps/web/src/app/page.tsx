/**
 * MOY Web 根页面 —— 阶段 0 工程底座展示页。
 *
 * 说明：本页仅展示工程底座就绪状态与产品宪章摘要，不含任何业务功能页面。
 * 业务模块（GEO 工作台 / AI 超级员工 / 企业后台）将在阶段 1 起按 ROADMAP 落地。
 * 本页非"前端假页面"，而是真实渲染的工程状态说明页。
 */
import Link from 'next/link';

const PILLARS = [
  {
    title: 'GEO 工作台',
    desc: '品牌资产管理 · AI 搜索平台监测 · 提及率/引用率/推荐率 · 内容生产与效果复盘',
  },
  {
    title: 'AI 超级员工',
    desc: '内容运营 · 销售 · 客服 · 美工 · 法务合规 · 数据分析，形成从曝光到转化的业务闭环',
  },
  {
    title: '企业级后台',
    desc: '多租户隔离 · 权限与审计 · API Key · 任务队列 · 通知中心 · 数据看板',
  },
];

export default function HomePage() {
  return (
    <div className="moy-shell">
      <header className="moy-header">
        <div className="moy-brand">
          <div className="moy-brand-mark" aria-hidden />
          <div>
            <div className="moy-brand-name">MOY</div>
            <div className="moy-brand-tag">Mate Of You · 桐鸣科技</div>
          </div>
        </div>
        <div className="moy-stage-badge">
          <span className="moy-stage-dot" />
          STAGE 0 · ENGINEERING FOUNDATION
        </div>
      </header>

      <main className="moy-main">
        <div className="moy-hero-eyebrow">AI Growth Operating System</div>
        <h1 className="moy-hero-title">MOY · AI 增长操作系统</h1>
        <p className="moy-hero-subtitle">
          面向 B 端企业的 Web 端 AI 增长操作系统。1.0 正式商业版以 GEO（生成式引擎优化）为第一切入口，
          帮助企业提升品牌、产品、内容在 AI 搜索与大模型回答场景中的可见度、引用率、推荐率与可信度。
        </p>

        <div className="moy-pillars">
          {PILLARS.map((p) => (
            <div key={p.title} className="moy-pillar">
              <h3 className="moy-pillar-title">{p.title}</h3>
              <p className="moy-pillar-desc">{p.desc}</p>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 48, color: 'var(--text-tertiary)', fontSize: 13 }}>
          工程底座已就绪。业务模块将按 <Link href="#">ROADMAP</Link> 依次落地。
        </div>
      </main>

      <footer className="moy-footer">
        © 桐鸣科技 · MOY · 本仓库当前处于阶段 0，未交付业务功能
      </footer>
    </div>
  );
}
