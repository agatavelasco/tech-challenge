import { existsSync } from 'node:fs';
import type { NextConfig } from 'next';

// O .env fica na raiz do monorepo, compartilhado com os outros serviços.
const rootEnvFile = new URL('../../.env', import.meta.url);
if (existsSync(rootEnvFile)) process.loadEnvFile(rootEnvFile);

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  // Imagem de produção enxuta: só o necessário para rodar o servidor (ver Dockerfile).
  output: 'standalone',
  // Não gerar AGENTS.md com instruções para agentes de IA no repositório.
  agentRules: false,
  turbopack: {
    rules: {
      '*.css': { loaders: ['@tailwindcss/turbopack'], as: '*.css' },
    },
  },
};

export default nextConfig;
