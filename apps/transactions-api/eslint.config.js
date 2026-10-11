import { createBaseConfig } from '@tech-challenge/config/eslint/base';

export default [
  ...createBaseConfig({ tsconfigRootDir: import.meta.dirname }),
  { ignores: ['src/generated/**'] },
  {
    rules: {
      // Classes do Nest (módulos, controllers) existem para os decorators.
      '@typescript-eslint/no-extraneous-class': 'off',
      // A injeção do Nest lê o tipo do construtor em runtime (emitDecoratorMetadata):
      // um `import type` apagaria a classe e quebraria a injeção.
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  },
];
