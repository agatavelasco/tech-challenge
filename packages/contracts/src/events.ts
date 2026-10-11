import { z } from 'zod';
import { transactionStatusSchema, transactionValueSchema } from './transaction.js';

export const TOPICS = {
  transactionCreated: 'transaction.created',
  transactionStatusUpdated: 'transaction.status.updated',
} as const;

/** Mensagens que não passam na validação vão para `<tópico>.dlq` em vez de travar o consumidor. */
export function deadLetterTopic(topic: string): string {
  return `${topic}.dlq`;
}

/**
 * Envelope comum a todos os eventos. `eventId` permite deduplicar,
 * `version` permite evoluir o payload sem quebrar consumidores antigos.
 */
function eventEnvelopeSchema<TType extends string, TPayload extends z.ZodType>(
  type: TType,
  payload: TPayload,
) {
  return z.object({
    eventId: z.guid(),
    type: z.literal(type),
    version: z.literal(1),
    occurredAt: z.iso.datetime(),
    payload,
  });
}

export const transactionCreatedEventSchema = eventEnvelopeSchema(
  TOPICS.transactionCreated,
  z.object({
    transactionExternalId: z.guid(),
    value: transactionValueSchema,
  }),
);
export type TransactionCreatedEvent = z.infer<typeof transactionCreatedEventSchema>;

export const transactionStatusUpdatedEventSchema = eventEnvelopeSchema(
  TOPICS.transactionStatusUpdated,
  z.object({
    transactionExternalId: z.guid(),
    status: transactionStatusSchema.exclude(['pending']),
  }),
);
export type TransactionStatusUpdatedEvent = z.infer<typeof transactionStatusUpdatedEventSchema>;
export type ResolvedTransactionStatus = TransactionStatusUpdatedEvent['payload']['status'];
