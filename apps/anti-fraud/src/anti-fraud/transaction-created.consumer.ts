import { randomUUID } from 'node:crypto';
import { Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, KafkaContext, Payload } from '@nestjs/microservices';
import {
  TOPICS,
  transactionCreatedEventSchema,
  type TransactionStatusUpdatedEvent,
} from '@tech-challenge/contracts';
import { DeadLetterPublisher, KafkaPublisher } from '@tech-challenge/messaging';
import { z } from 'zod';
import { evaluateTransaction } from './anti-fraud.rule.js';

@Controller()
export class TransactionCreatedConsumer {
  private readonly logger = new Logger(TransactionCreatedConsumer.name);

  constructor(
    private readonly publisher: KafkaPublisher,
    private readonly deadLetters: DeadLetterPublisher,
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-arguments
  @EventPattern<string>(TOPICS.transactionCreated)
  async handle(@Payload() message: unknown, @Ctx() context: KafkaContext): Promise<void> {
    const parsed = transactionCreatedEventSchema.safeParse(message);
    if (!parsed.success) {
      const reason = z.prettifyError(parsed.error);
      this.logger.warn(`Evento inválido enviado para a dead letter:\n${reason}`);
      await this.deadLetters.send({
        sourceTopic: context.getTopic(),
        key: context.getMessage().key?.toString() ?? null,
        reason,
        originalValue: message,
      });
      return;
    }

    const { transactionExternalId, value } = parsed.data.payload;
    const result: TransactionStatusUpdatedEvent = {
      eventId: randomUUID(),
      type: TOPICS.transactionStatusUpdated,
      version: 1,
      occurredAt: new Date().toISOString(),
      payload: { transactionExternalId, status: evaluateTransaction(value) },
    };

    await this.publisher.publish([
      { topic: result.type, key: transactionExternalId, value: result },
    ]);
  }
}
