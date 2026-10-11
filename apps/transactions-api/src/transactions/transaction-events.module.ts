import { Module } from '@nestjs/common';
import { TransactionStatusConsumer } from './transaction-status.consumer.js';
import { TransactionsModule } from './transactions.module.js';

/** Lado assíncrono das transações: consumo dos resultados do antifraude. */
@Module({
  imports: [TransactionsModule],
  controllers: [TransactionStatusConsumer],
})
export class TransactionEventsModule {}
