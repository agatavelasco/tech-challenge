import { existsSync } from 'node:fs';

const rootEnvFile = new URL('../../../.env', import.meta.url);
if (existsSync(rootEnvFile)) process.loadEnvFile(rootEnvFile);
process.stdout.write(process.env.WEB_PORT ?? '3000');
