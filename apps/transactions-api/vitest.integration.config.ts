import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['test/integration/**/*.int-spec.ts'],
    globalSetup: ['test/integration/support/global-setup.ts'],
    // Os arquivos compartilham o mesmo banco e o mesmo broker.
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 120_000,
  },
});
