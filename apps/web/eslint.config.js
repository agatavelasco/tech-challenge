import { createBaseConfig } from '@tech-challenge/config/eslint/base';
import nextVitals from 'eslint-config-next/core-web-vitals';

export default [
  { ignores: ['.next/**', 'next-env.d.ts'] },
  ...nextVitals,
  ...createBaseConfig({ tsconfigRootDir: import.meta.dirname }),
];
