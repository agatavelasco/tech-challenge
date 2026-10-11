// Porta do dashboard lida do .env da raiz: o `--port` do Next é argumento de linha de
// comando e não enxerga o .env por conta própria.
import { existsSync } from 'node:fs';

const rootEnvFile = new URL('../../../.env', import.meta.url);
if (existsSync(rootEnvFile)) process.loadEnvFile(rootEnvFile);
process.stdout.write(process.env.WEB_PORT ?? '3000');
