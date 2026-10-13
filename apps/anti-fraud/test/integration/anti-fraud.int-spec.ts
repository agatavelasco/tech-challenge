import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { KafkaPublisher } from '@tech-challenge/messaging';
import { Kafka, logLevel } from 'kafkajs';
import { inject } from 'vitest';
import { AppModule } from '../../src/app.module.js';
import { APP_CONFIG, loadAppConfig } from '../../src/config/app-config.js';
import { kafkaConsumerOptions, startKafkaConsumer } from '../../src/messaging/kafka-consumer.js';
import { KAFKA } from '../../src/messaging/messaging.module.js';

interface ReceivedMessage {
  key: string | null;
  value: unknown;
}

async function readUntil(
  kafka: Kafka,
  topic: string,
  until: (received: ReceivedMessage[]) => boolean,
): Promise<ReceivedMessage[]> {
  const consumer = kafka.consumer({ groupId: `reader-${randomUUID()}` });
  const received: ReceivedMessage[] = [];
  await consumer.connect();
  await consumer.subscribe({ topic, fromBeginning: true });
  try {
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, 20_000);
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

const createdEvent = (transactionExternalId: string, value: number) => ({
  eventId: randomUUID(),
  type: 'transaction.created',
  version: 1,
  occurredAt: new Date().toISOString(),
  payload: { transactionExternalId, value },
});

describe('Antifraude (Kafka real)', () => {
  const config = loadAppConfig({
    KAFKA_BROKERS: inject('kafkaBrokers'),
    KAFKA_CLIENT_ID: 'integration-test',
    KAFKA_GROUP_ID_ANTI_FRAUD: `anti-fraud-${randomUUID()}`,
    KAFKA_TOPIC_PARTITIONS: '1',
  });
  const kafka = new Kafka({
    clientId: 'integration-test-client',
    brokers: config.KAFKA_BROKERS,
    logLevel: logLevel.NOTHING,
  });
  const transactions = new KafkaPublisher(kafka);
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(APP_CONFIG)
      .useValue(config)
      .compile();
    app = moduleRef.createNestApplication();
    app.connectMicroservice(kafkaConsumerOptions(config), { inheritAppConfig: true });
    await app.init();
    await startKafkaConsumer(app, app.get(KAFKA), config);
  });

  afterAll(async () => {
    await transactions.disconnect();
    await app.close();
  });

  it('aprova até 1000 e rejeita acima, publicando com a transação como chave', async () => {
    const approvedId = randomUUID();
    const rejectedId = randomUUID();

    await transactions.publish([
      { topic: 'transaction.created', key: approvedId, value: createdEvent(approvedId, 1000) },
      { topic: 'transaction.created', key: rejectedId, value: createdEvent(rejectedId, 1000.01) },
    ]);

    const results = await readUntil(kafka, 'transaction.status.updated', (received) =>
      [approvedId, rejectedId].every((id) => received.some((message) => message.key === id)),
    );
    expect(results.find((message) => message.key === approvedId)?.value).toMatchObject({
      payload: { transactionExternalId: approvedId, status: 'approved' },
    });
    expect(results.find((message) => message.key === rejectedId)?.value).toMatchObject({
      payload: { transactionExternalId: rejectedId, status: 'rejected' },
    });
  });

  it('desvia evento malformado para a dead letter e continua processando', async () => {
    const afterBadMessage = randomUUID();

    await transactions.publish([
      { topic: 'transaction.created', key: 'mensagem-ruim', value: { value: 'abc' } },
      {
        topic: 'transaction.created',
        key: afterBadMessage,
        value: createdEvent(afterBadMessage, 10),
      },
    ]);

    const deadLetters = await readUntil(kafka, 'transaction.created.dlq', (received) =>
      received.some((message) => message.key === 'mensagem-ruim'),
    );
    expect(deadLetters.some((message) => message.key === 'mensagem-ruim')).toBe(true);
    const results = await readUntil(kafka, 'transaction.status.updated', (received) =>
      received.some((message) => message.key === afterBadMessage),
    );
    expect(results.some((message) => message.key === afterBadMessage)).toBe(true);
  });
});
