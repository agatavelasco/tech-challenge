import { Controller, Get } from '@nestjs/common';
import type { TransferType } from '@tech-challenge/contracts';
import { TransactionsService } from './transactions.service.js';

@Controller('transfer-types')
export class TransferTypesController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  list(): Promise<TransferType[]> {
    return this.transactionsService.listTransferTypes();
  }
}
