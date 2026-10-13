import { randomUUID } from 'node:crypto';
import { Kafka, logLevel } from 'kafkajs';
import { inject } from 'vitest';
import { type AppConfig, loadAppConfig } from '../../../src/config/app-config.js';
import type { PrismaService } from '../../../src/prisma/prisma.service.js';

export function integrationConfig(overrides: Record<string, string> = {}): AppConfig {
  return loadAppConfig({
    DATABASE_URL: inject('databaseUrl'),
    KAFKA_BROKERS: inject('kafkaBrokers'),
    KAFKA_CLIENT_ID: 'integration-test',
    KAFKA_GROUP_ID_TRANSACTIONS: `transactions-${randomUUID()}`,
    KAFKA_TOPIC_PARTITIONS: '1',
    OUTBOX_POLL_INTERVAL_MS: '100',
    JWT_SECRET: 'segredo-de-teste-de-integracao-com-32-caracteres',
    DEMO_USER_EMAIL: 'demo@desafio.local',
    DEMO_USER_PASSWORD: 'demo12345',
    ...overrides,
  });
}

export function testKafka(): Kafka {
  return new Kafka({
    clientId: 'integration-test-client',
    brokers: [inject('kafkaBrokers')],
    logLevel: logLevel.NOTHING,
  });
}

export async function resetDatabase(prisma: PrismaService): Promise<void> {
  await prisma.$executeRaw`TRUNCATE outbox_events, transactions`;
}

export interface ReceivedMessage {
  key: string | null;
  value: unknown;
}

export async function readMessages(
  kafka: Kafka,
  topic: string,
  {
    until,
    timeoutMs = 20_000,
  }: { until: (received: ReceivedMessage[]) => boolean; timeoutMs?: number },
): Promise<ReceivedMessage[]> {
  const consumer = kafka.consumer({ groupId: `reader-${randomUUID()}` });
  const received: ReceivedMessage[] = [];
  await consumer.connect();
  await consumer.subscribe({ topic, fromBeginning: true });

  try {
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, timeoutMs);
      void consumer.run({
        eachMessage: ({ message }) => {
          received.push({
            key: message.key?.toString() ?? null,
            value: JSON.parse(message.value?.toString() ?? 'null') as unknown,
          });
          if (until(received)) {
            clearTimeout(timer);
            resolve();
          }
          return Promise.resolve();
        },
      });
    });
  } finally {
    await consumer.disconnect();
  }
  return received;
}

export async function eventually<T>(
  check: () => Promise<T>,
  { timeoutMs = 20_000, intervalMs = 200 } = {},
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      return await check();
    } catch (error) {
      if (Date.now() > deadline) throw error;
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }
}
