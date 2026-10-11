import type { KafkaContext } from '@nestjs/microservices';
import { transactionStatusUpdatedEventSchema } from '@tech-challenge/contracts';
import type {
  DeadLetter,
  DeadLetterPublisher,
  KafkaPublisher,
  OutgoingMessage,
} from '@tech-challenge/messaging';
import { TransactionCreatedConsumer } from './transaction-created.consumer.js';

const transactionExternalId = '01a12c49-2a9b-7529-b23c-05f14ddd4710';

const createdEvent = (value: number) => ({
  eventId: '45660408-7f41-4453-9899-ba4b4909392d',
  type: 'transaction.created',
  version: 1,
  occurredAt: '2026-10-11T12:00:00.000Z',
  payload: { transactionExternalId, value },
});

const kafkaContext = {
  getTopic: () => 'transaction.created',
  getMessage: () => ({ key: Buffer.from(transactionExternalId) }),
} as unknown as KafkaContext;

describe('TransactionCreatedConsumer', () => {
  let published: OutgoingMessage[];
  let deadLetters: DeadLetter[];
  let publish: (messages: OutgoingMessage[]) => Promise<void>;
  let consumer: TransactionCreatedConsumer;

  beforeEach(() => {
    published = [];
    deadLetters = [];
    publish = (messages) => {
      published.push(...messages);
      return Promise.resolve();
    };
    const publisher = { publish: (messages: OutgoingMessage[]) => publish(messages) };
    const deadLetterPublisher = {
      send: (deadLetter: DeadLetter) => {
        deadLetters.push(deadLetter);
        return Promise.resolve();
      },
    };
    consumer = new TransactionCreatedConsumer(
      publisher as KafkaPublisher,
      deadLetterPublisher as DeadLetterPublisher,
    );
  });

  it.each([
    [1000, 'approved'],
    [1000.01, 'rejected'],
  ])('publica o resultado da transação de %s como %s', async (value, status) => {
    await consumer.handle(createdEvent(value), kafkaContext);

    expect(published).toHaveLength(1);
    const [message] = published;
    expect(message?.topic).toBe('transaction.status.updated');
    expect(message?.key).toBe(transactionExternalId);
    const event = transactionStatusUpdatedEventSchema.parse(message?.value);
    expect(event.payload).toEqual({ transactionExternalId, status });
  });

  it('envia evento inválido para a dead letter e não publica resultado', async () => {
    await consumer.handle({ ...createdEvent(100), payload: { value: -5 } }, kafkaContext);

    expect(published).toHaveLength(0);
    expect(deadLetters).toEqual([
      expect.objectContaining({ sourceTopic: 'transaction.created', key: transactionExternalId }),
    ]);
  });

  it('propaga a falha de publicação para o Kafka entregar a mensagem de novo', async () => {
    publish = () => Promise.reject(new Error('broker indisponível'));

    await expect(consumer.handle(createdEvent(100), kafkaContext)).rejects.toThrow(
      'broker indisponível',
    );
  });
});
