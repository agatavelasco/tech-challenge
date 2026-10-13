import { createBaseConfig } from '@tech-challenge/config/eslint/base';

export default [
  ...createBaseConfig({ tsconfigRootDir: import.meta.dirname }),
  { ignores: ['src/generated/**'] },
  {
    rules: {
      '@typescript-eslint/no-extraneous-class': 'off',
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  },
];
