import { existsSync } from 'node:fs';
import { NestFactory } from '@nestjs/core';
import type { Kafka } from 'kafkajs';
import { AppModule } from './app.module.js';
import { APP_CONFIG, type AppConfig } from './config/app-config.js';
import { kafkaConsumerOptions, startKafkaConsumer } from './messaging/kafka-consumer.js';
import { KAFKA } from './messaging/messaging.module.js';

const rootEnvFile = new URL('../../../.env', import.meta.url);
if (existsSync(rootEnvFile)) process.loadEnvFile(rootEnvFile);

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get<AppConfig>(APP_CONFIG);

  app.connectMicroservice(kafkaConsumerOptions(config), { inheritAppConfig: true });
  app.enableShutdownHooks();

  await app.listen(config.ANTI_FRAUD_PORT);
  await startKafkaConsumer(app, app.get<Kafka>(KAFKA), config);
}

await bootstrap();
