import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module.js';
import { MessagingModule } from './messaging/messaging.module.js';
import { OutboxModule } from './outbox/outbox.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { TransactionEventsModule } from './transactions/transaction-events.module.js';
import { TransactionsModule } from './transactions/transactions.module.js';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    MessagingModule,
    TransactionsModule,
    TransactionEventsModule,
    OutboxModule,
  ],
})
export class AppModule {}
