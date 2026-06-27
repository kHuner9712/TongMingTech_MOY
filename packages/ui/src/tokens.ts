/**
 * MOY 设计 tokens —— 未来科技感 · 深色 · 克制 · 专业
 *
 * 风格准则：
 * - 深色背景为主，避免传统后台廉价感
 * - 不为炫酷牺牲 B 端效率
 * - 核心体验：指挥中心 / 任务流 / 智能体协同 / 增长雷达 / 品牌可见度地图
 */
export const tokens = {
  color: {
    // 背景层级（从深到浅）
    bgBase: '#0A0E14',
    bgSurface: '#11161F',
    bgElevated: '#171E2A',
    bgHover: '#1E2634',
    // 边框与分隔
    borderSubtle: 'rgba(255,255,255,0.06)',
    borderDefault: 'rgba(255,255,255,0.10)',
    borderStrong: 'rgba(255,255,255,0.18)',
    // 文字层级
    textPrimary: '#F2F5F9',
    textSecondary: '#9AA7BD',
    textTertiary: '#5C6881',
    // 品牌主色（克制青蓝，未来科技感）
    brandPrimary: '#3DD6E0',
    brandAccent: '#5B8DEF',
    // 语义色
    success: '#3DD68F',
    warning: '#F5B544',
    danger: '#F56565',
    info: '#5B8DEF',
  },
  radius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    full: '9999px',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    xxl: '32px',
  },
  shadow: {
    glow: '0 0 0 1px rgba(61,214,224,0.20), 0 8px 24px rgba(61,214,224,0.08)',
    elevated: '0 8px 24px rgba(0,0,0,0.45)',
  },
  font: {
    sans: 'Inter, "PingFang SC", "Microsoft YaHei", system-ui, sans-serif',
    mono: '"JetBrains Mono", "Fira Code", ui-monospace, monospace',
  },
} as const;

export type UiTokens = typeof tokens;
