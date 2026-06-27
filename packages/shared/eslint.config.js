import baseConfig from '@moy/config/eslint';

export default [
  ...baseConfig,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
  },
  {
    // 测试文件允许 console
    files: ['tests/**/*.ts', 'src/**/*.test.ts'],
    rules: {
      'no-console': 'off',
    },
  },
];
