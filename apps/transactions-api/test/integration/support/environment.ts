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
    // Grupo novo por teste: cada um lê os tópicos do começo, sem herdar offsets.
    KAFKA_GROUP_ID_TRANSACTIONS: `transactions-${randomUUID()}`,
    KAFKA_TOPIC_PARTITIONS: '1',
    OUTBOX_POLL_INTERVAL_MS: '100',
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

/**
 * Lê um tópico desde o início até `until` ser satisfeito ou o prazo estourar.
 * Os tópicos são compartilhados entre os arquivos de teste, então o critério
 * deve procurar a mensagem esperada, e não contar a partir da primeira.
 */
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

/** Repete a verificação até passar ou estourar o prazo — para efeitos assíncronos. */
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
