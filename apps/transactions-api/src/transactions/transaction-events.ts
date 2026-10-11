import { randomUUID } from 'node:crypto';
import { TOPICS, type TransactionCreatedEvent } from '@tech-challenge/contracts';
import type { OutboxMessage, TransactionRecord } from './transaction-record.js';

export function transactionCreatedMessage(record: TransactionRecord): OutboxMessage {
  const event: TransactionCreatedEvent = {
    eventId: randomUUID(),
    type: TOPICS.transactionCreated,
    version: 1,
    occurredAt: record.createdAt.toISOString(),
    payload: { transactionExternalId: record.id, value: record.value },
  };
  // Chave = id da transação: todos os eventos dela caem na mesma partição, em ordem.
  return { eventId: event.eventId, topic: event.type, key: record.id, payload: event };
}
