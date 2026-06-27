import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MOY · AI 增长操作系统',
  description:
    'MOY (Mate Of You) - 桐鸣科技 B 端 AI 增长操作系统。1.0 以 GEO（生成式引擎优化）为第一切入口。',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
