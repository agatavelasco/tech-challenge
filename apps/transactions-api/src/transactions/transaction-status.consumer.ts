import { Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, KafkaContext, Payload } from '@nestjs/microservices';
import { TOPICS, transactionStatusUpdatedEventSchema } from '@tech-challenge/contracts';
import { DeadLetterPublisher } from '@tech-challenge/messaging';
import { z } from 'zod';
import { TransactionsService } from './transactions.service.js';

@Controller()
export class TransactionStatusConsumer {
  private readonly logger = new Logger(TransactionStatusConsumer.name);

  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly deadLetters: DeadLetterPublisher,
  ) {}

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
