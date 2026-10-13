import { createBaseConfig } from '@tech-challenge/config/eslint/base';

export default [
  { ignores: ['scripts/**', 'playwright-report/**', 'test-results/**'] },
  ...createBaseConfig({ tsconfigRootDir: import.meta.dirname }),
];
