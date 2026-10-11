import { Module } from '@nestjs/common';
import { TransactionCreatedConsumer } from './transaction-created.consumer.js';

@Module({
  controllers: [TransactionCreatedConsumer],
})
export class AntiFraudModule {}
