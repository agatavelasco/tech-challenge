import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.tsx', 'src/**/*.test.ts'],
    setupFiles: ['src/test/setup.ts'],
  },
});
