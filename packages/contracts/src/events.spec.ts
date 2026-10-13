import {
  deadLetterTopic,
  TOPICS,
  transactionCreatedEventSchema,
  transactionStatusUpdatedEventSchema,
} from './events.js';

const envelope = {
  eventId: '0b7e7c1a-4f3d-4c2b-8a1e-5d6f7a8b9c0d',
  version: 1,
  occurredAt: '2026-10-11T12:00:00.000Z',
};
const transactionExternalId = '3fa85f64-5717-4562-b3fc-2c963f66afa6';

describe('eventos de transação', () => {
  it('valida o evento de criação', () => {
    const result = transactionCreatedEventSchema.safeParse({
      ...envelope,
      type: TOPICS.transactionCreated,
      payload: { transactionExternalId, value: 1500 },
    });

    expect(result.success).toBe(true);
  });

  it('rejeita evento com tipo trocado', () => {
    const result = transactionCreatedEventSchema.safeParse({
      ...envelope,
      type: TOPICS.transactionStatusUpdated,
      payload: { transactionExternalId, value: 1500 },
    });

    expect(result.success).toBe(false);
  });

  it('não aceita pendente como resultado do antifraude', () => {
    const result = transactionStatusUpdatedEventSchema.safeParse({
      ...envelope,
      type: TOPICS.transactionStatusUpdated,
      payload: { transactionExternalId, status: 'pending' },
    });

    expect(result.success).toBe(false);
  });

  it('nomeia o tópico de mensagens mortas a partir do original', () => {
    expect(deadLetterTopic(TOPICS.transactionCreated)).toBe('transaction.created.dlq');
  });
});
