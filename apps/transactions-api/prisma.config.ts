import { existsSync } from 'node:fs';
import { defineConfig } from 'prisma/config';

// O .env fica na raiz do monorepo, compartilhado com o docker-compose.
// Em CI e em container as variáveis já vêm do ambiente.
const rootEnvFile = new URL('../../.env', import.meta.url);
if (existsSync(rootEnvFile)) process.loadEnvFile(rootEnvFile);

// `prisma generate` não precisa de banco; o fallback evita exigir DATABASE_URL
// só para gerar o client (lint, typecheck e testes unitários).
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: process.env.DATABASE_URL ?? 'postgresql://localhost:5432/unused' },
});
