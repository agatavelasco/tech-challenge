import { Module } from '@nestjs/common';
import { PrismaTransactionsRepository } from './prisma-transactions.repository.js';
import { TransactionsController } from './transactions.controller.js';
import { TransactionsRepository } from './transactions.repository.js';
import { TransactionsService } from './transactions.service.js';
import { TransferTypesController } from './transfer-types.controller.js';

@Module({
  controllers: [TransactionsController, TransferTypesController],
  providers: [
    TransactionsService,
    { provide: TransactionsRepository, useClass: PrismaTransactionsRepository },
  ],
  exports: [TransactionsService],
})
export class TransactionsModule {}
