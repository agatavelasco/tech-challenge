import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Transaction } from '@tech-challenge/contracts';
import { KafkaPublisher } from '@tech-challenge/messaging';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../../src/app.module.js';
import { APP_CONFIG } from '../../src/config/app-config.js';
import { kafkaConsumerOptions, startKafkaConsumer } from '../../src/messaging/kafka-consumer.js';
import { KAFKA } from '../../src/messaging/messaging.module.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import {
  eventually,
  integrationConfig,
  readMessages,
  resetDatabase,
  testKafka,
} from './support/environment.js';

describe('Fluxo assíncrono da API de transações (Postgres e Kafka reais)', () => {
  const config = integrationConfig();
  const kafka = testKafka();
  const antiFraud = new KafkaPublisher(kafka);
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(APP_CONFIG)
      .useValue(config)
      .compile();
    app = moduleRef.createNestApplication();
    app.connectMicroservice(kafkaConsumerOptions(config), { inheritAppConfig: true });
    await app.init();
    await resetDatabase(app.get(PrismaService));
    await startKafkaConsumer(app, app.get(KAFKA), config);
  });

  afterAll(async () => {
    await antiFraud.disconnect();
    await app.close();
  });

  const fetchTransaction = async (id: string): Promise<Transaction> => {
    const response = await request(app.getHttpServer()).get(`/transactions/${id}`);
    return response.body as Transaction;
  };

  it('cria pendente, publica o evento e aplica o resultado do antifraude', async () => {
    const created = await request(app.getHttpServer()).post('/transactions').send({
      accountExternalIdDebit: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      accountExternalIdCredit: '9c1b6f3e-2a4d-4e8b-9f7a-1d2c3b4a5e6f',
      transferTypeId: 1,
      value: 1500,
    });
    const transaction = created.body as Transaction;
    expect(transaction.transactionStatus.name).toBe('pending');

    // O relay roda sozinho, no intervalo configurado.
    const isThisTransaction = (event: { key: string | null }) =>
      event.key === transaction.transactionExternalId;
    const events = await readMessages(kafka, 'transaction.created', {
      until: (received) => received.some(isThisTransaction),
    });
    expect(events.some(isThisTransaction)).toBe(true);

    await antiFraud.publish([
      {
        topic: 'transaction.status.updated',
        key: transaction.transactionExternalId,
        value: {
          eventId: '0b7e7c1a-4f3d-4c2b-8a1e-5d6f7a8b9c0d',
          type: 'transaction.status.updated',
          version: 1,
          occurredAt: new Date().toISOString(),
          payload: { transactionExternalId: transaction.transactionExternalId, status: 'rejected' },
        },
      },
    ]);

    await eventually(async () => {
      const current = await fetchTransaction(transaction.transactionExternalId);
      expect(current.transactionStatus.name).toBe('rejected');
    });
  });

  it('desvia evento malformado para a dead letter e segue consumindo', async () => {
    await antiFraud.publish([
      { topic: 'transaction.status.updated', key: 'mensagem-ruim', value: { bad: true } },
    ]);

    const deadLetters = await readMessages(kafka, 'transaction.status.updated.dlq', {
      until: (received) => received.some((message) => message.key === 'mensagem-ruim'),
    });
    expect(deadLetters.find((message) => message.key === 'mensagem-ruim')).toMatchObject({
      key: 'mensagem-ruim',
      value: { originalValue: { bad: true } },
    });
  });
});
