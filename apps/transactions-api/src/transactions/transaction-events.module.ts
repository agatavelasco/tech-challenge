import { Module } from '@nestjs/common';
import { TransactionStatusConsumer } from './transaction-status.consumer.js';
import { TransactionsModule } from './transactions.module.js';

@Module({
  imports: [TransactionsModule],
  controllers: [TransactionStatusConsumer],
})
export class TransactionEventsModule {}
