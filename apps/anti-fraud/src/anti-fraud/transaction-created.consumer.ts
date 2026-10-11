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

/**
 * Avalia cada transação criada e publica o resultado.
 * - Mensagem inválida: dead letter, e o consumo segue.
 * - Falha ao publicar o resultado: o erro sobe e o Kafka entrega a transação de novo.
 *   Como a regra é determinística, reavaliar produz o mesmo resultado.
 */
@Controller()
export class TransactionCreatedConsumer {
  private readonly logger = new Logger(TransactionCreatedConsumer.name);

  constructor(
    private readonly publisher: KafkaPublisher,
    private readonly deadLetters: DeadLetterPublisher,
  ) {}

  // O tipo explícito escolhe a sobrecarga sem payload tipado (a validação é do zod);
  // sem ele, o Nest exige `unknown` no parâmetro de contexto.
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
