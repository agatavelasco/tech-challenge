import type { KafkaContext } from '@nestjs/microservices';
import type { DeadLetter, DeadLetterPublisher } from '@tech-challenge/messaging';
import { InMemoryTransactionsRepository } from '../../test/support/in-memory-transactions.repository.js';
import { TransactionStatusConsumer } from './transaction-status.consumer.js';
import { TransactionsService } from './transactions.service.js';

const kafkaContext = (key: string) =>
  ({
    getTopic: () => 'transaction.status.updated',
    getMessage: () => ({ key: Buffer.from(key) }),
  }) as unknown as KafkaContext;

describe('TransactionStatusConsumer', () => {
  let service: TransactionsService;
  let deadLetters: DeadLetter[];
  let consumer: TransactionStatusConsumer;

  beforeEach(() => {
    service = new TransactionsService(new InMemoryTransactionsRepository());
    deadLetters = [];
    const deadLetterPublisher = {
      send: (deadLetter: DeadLetter) => {
        deadLetters.push(deadLetter);
        return Promise.resolve();
      },
    } as DeadLetterPublisher;
    consumer = new TransactionStatusConsumer(service, deadLetterPublisher);
  });

  it('aplica o resultado de um evento válido', async () => {
    const created = await service.create({
      accountExternalIdDebit: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      accountExternalIdCredit: '9c1b6f3e-2a4d-4e8b-9f7a-1d2c3b4a5e6f',
      transferTypeId: 1,
      value: 500,
    });

    await consumer.handle(
      {
        eventId: '0b7e7c1a-4f3d-4c2b-8a1e-5d6f7a8b9c0d',
        type: 'transaction.status.updated',
        version: 1,
        occurredAt: '2026-10-11T12:00:00.000Z',
        payload: { transactionExternalId: created.transactionExternalId, status: 'approved' },
      },
      kafkaContext(created.transactionExternalId),
    );

    const transaction = await service.findByExternalId(created.transactionExternalId);
    expect(transaction.transactionStatus.name).toBe('approved');
    expect(deadLetters).toHaveLength(0);
  });

  it('envia evento inválido para a dead letter sem lançar erro', async () => {
    await expect(consumer.handle({ bad: true }, kafkaContext('chave'))).resolves.toBeUndefined();

    expect(deadLetters).toEqual([
      {
        sourceTopic: 'transaction.status.updated',
        key: 'chave',
        reason: expect.any(String),
        originalValue: { bad: true },
      },
    ]);
  });
});
