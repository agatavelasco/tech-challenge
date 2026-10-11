import { Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, KafkaContext, Payload } from '@nestjs/microservices';
import { TOPICS, transactionStatusUpdatedEventSchema } from '@tech-challenge/contracts';
import { DeadLetterPublisher } from '@tech-challenge/messaging';
import { z } from 'zod';
import { TransactionsService } from './transactions.service.js';

/**
 * Consome o resultado do antifraude.
 * - Mensagem inválida: vai para a dead letter e o consumo segue (nunca vai passar).
 * - Falha ao gravar (ex.: banco fora): o erro sobe, o offset não é confirmado e o
 *   Kafka entrega de novo — falha transitória se resolve com nova tentativa.
 */
@Controller()
export class TransactionStatusConsumer {
  private readonly logger = new Logger(TransactionStatusConsumer.name);

  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly deadLetters: DeadLetterPublisher,
  ) {}

  // O tipo explícito escolhe a sobrecarga sem payload tipado (a validação é do zod);
  // sem ele, o Nest exige `unknown` no parâmetro de contexto.
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-arguments
  @EventPattern<string>(TOPICS.transactionStatusUpdated)
  async handle(@Payload() message: unknown, @Ctx() context: KafkaContext): Promise<void> {
    const parsed = transactionStatusUpdatedEventSchema.safeParse(message);
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

    const { transactionExternalId, status } = parsed.data.payload;
    await this.transactionsService.applyAntiFraudResult(transactionExternalId, status);
  }
}
