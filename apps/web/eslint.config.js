import baseConfig from '@moy/config/eslint';

/**
 * Web 包 ESLint flat config。
 *
 * 说明：Next.js 14 的 `next lint` 依赖旧版 ESLint API（eslintrc），
 * 与 ESLint 9 flat config 不兼容。本阶段直接使用 flat config 跑 eslint，
 * 暂不启用 next 专属规则（页面极少，价值有限）。
 * 待升级 Next.js 15 或 eslint-config-next 支持 flat config 后再切换回 `next lint`。
 */
export default [
  ...baseConfig,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    ignores: ['.next/**', 'out/**', 'next-env.d.ts'],
  },
];
