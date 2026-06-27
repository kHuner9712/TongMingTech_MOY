/**
 * MOY 共享 ESLint Flat Config 基线
 *
 * 各 package / app 在自身 eslint.config.js 中通过引入本配置再扩展：
 *   import baseConfig from '@moy/config/eslint';
 *   export default [...baseConfig, { ... }];
 */
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always'],
      'no-throw-literal': 'error',
    },
  },
  {
    ignores: ['**/dist/**', '**/build/**', '**/.next/**', '**/node_modules/**'],
  },
];
