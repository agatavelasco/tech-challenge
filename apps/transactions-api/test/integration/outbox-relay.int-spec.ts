import { KafkaPublisher } from '@tech-challenge/messaging';
import { Kafka, logLevel } from 'kafkajs';
import { OutboxRelay } from '../../src/outbox/outbox.relay.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { PrismaTransactionsRepository } from '../../src/transactions/prisma-transactions.repository.js';
import { transactionCreatedMessage } from '../../src/transactions/transaction-events.js';
import {
  integrationConfig,
  readMessages,
  resetDatabase,
  testKafka,
} from './support/environment.js';

const input = {
  accountExternalIdDebit: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  accountExternalIdCredit: '9c1b6f3e-2a4d-4e8b-9f7a-1d2c3b4a5e6f',
  transferTypeId: 1,
  value: 100,
};

describe('OutboxRelay (Postgres e Kafka reais)', () => {
  const config = integrationConfig();
  const kafka = testKafka();
  let prisma: PrismaService;
  let repository: PrismaTransactionsRepository;
  let publisher: KafkaPublisher;

  beforeAll(() => {
    prisma = new PrismaService(config);
    repository = new PrismaTransactionsRepository(prisma);
    publisher = new KafkaPublisher(kafka);
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await publisher.disconnect();
    await prisma.$disconnect();
  });

  it('publica o evento pendente no Kafka e o marca como publicado', async () => {
    const record = await repository.create(input, transactionCreatedMessage);
    const relay = new OutboxRelay(prisma, publisher, config);

    await expect(relay.publishPending()).resolves.toBe(1);

    const messages = await readMessages(kafka, 'transaction.created', {
      until: (received) => received.some((message) => message.key === record.id),
    });
    expect(messages.find((message) => message.key === record.id)?.value).toMatchObject({
      type: 'transaction.created',
      payload: { transactionExternalId: record.id, value: 100 },
    });
    expect(await prisma.outboxEvent.count({ where: { publishedAt: null } })).toBe(0);
  });

  it('mantém o evento pendente quando o Kafka está indisponível', async () => {
    await repository.create(input, transactionCreatedMessage);
    const unreachable = new Kafka({
      brokers: ['127.0.0.1:1'],
      connectionTimeout: 300,
      // O producer idempotente exige ao menos uma nova tentativa.
      retry: { retries: 1, initialRetryTime: 50 },
      logLevel: logLevel.NOTHING,
    });
    const relay = new OutboxRelay(prisma, new KafkaPublisher(unreachable), config);

    await expect(relay.publishPending()).rejects.toThrow();

    expect(await prisma.outboxEvent.count({ where: { publishedAt: null } })).toBe(1);
  });

  it('dois relays em paralelo não publicam o mesmo evento', async () => {
    const created = await Promise.all(
      Array.from({ length: 20 }, (_, index) =>
        repository.create({ ...input, value: index + 1 }, transactionCreatedMessage),
      ),
    );
    const smallBatches = integrationConfig({ OUTBOX_BATCH_SIZE: '5' });
    const relayA = new OutboxRelay(prisma, publisher, smallBatches);
    const relayB = new OutboxRelay(prisma, publisher, smallBatches);

    let published = 0;
    for (;;) {
      const [a, b] = await Promise.all([relayA.publishPending(), relayB.publishPending()]);
      if (a + b === 0) break;
      published += a + b;
    }

    expect(published).toBe(20);
    const ids = new Set(created.map((record) => record.id));
    // Lê por um tempo fixo, e não até achar as 20: uma duplicata chegaria depois delas.
    const messages = await readMessages(kafka, 'transaction.created', {
      until: () => false,
      timeoutMs: 8_000,
    });
    const keysFromThisTest = messages
      .map((message) => message.key)
      .filter((key) => key !== null && ids.has(key));
    expect(keysFromThisTest).toHaveLength(20);
    expect(new Set(keysFromThisTest).size).toBe(20);
  });

  it('remove só os eventos publicados há mais tempo que a retenção', async () => {
    const old = await repository.create(input, transactionCreatedMessage);
    const recent = await repository.create(input, transactionCreatedMessage);
    const pending = await repository.create(input, transactionCreatedMessage);
    const now = new Date();
    await prisma.outboxEvent.updateMany({
      where: { messageKey: old.id },
      data: { publishedAt: new Date(now.getTime() - 100 * 3_600_000) },
    });
    await prisma.outboxEvent.updateMany({
      where: { messageKey: recent.id },
      data: { publishedAt: new Date(now.getTime() - 3_600_000) },
    });
    const relay = new OutboxRelay(
      prisma,
      publisher,
      integrationConfig({ OUTBOX_RETENTION_HOURS: '72' }),
    );

    await expect(relay.purgePublished(now)).resolves.toBe(1);

    const remaining = await prisma.outboxEvent.findMany({ select: { messageKey: true } });
    expect(remaining.map((event) => event.messageKey).sort()).toEqual(
      [recent.id, pending.id].sort(),
    );
  });
});
