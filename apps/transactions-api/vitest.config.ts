import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['src/**/*.spec.ts', 'test/**/*.spec.ts'],
    // No CI estes testes dividem a máquina com os de integração (containers).
    testTimeout: 15_000,
  },
});
