import { existsSync } from 'node:fs';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { APP_CONFIG, type AppConfig } from './config/app-config.js';

// Em desenvolvimento as variáveis vêm do .env da raiz do monorepo;
// em container e no CI já estão no ambiente.
const rootEnvFile = new URL('../../../.env', import.meta.url);
if (existsSync(rootEnvFile)) process.loadEnvFile(rootEnvFile);

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get<AppConfig>(APP_CONFIG);

  app.enableCors({ origin: config.WEB_ORIGIN });
  app.enableShutdownHooks();

  await app.listen(config.TRANSACTIONS_PORT);
}

await bootstrap();
