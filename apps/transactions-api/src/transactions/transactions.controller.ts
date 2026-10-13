import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  createTransactionSchema,
  listTransactionsQuerySchema,
  type CreateTransactionInput,
  type ListTransactionsQuery,
  type Transaction,
  type TransactionPage,
} from '@tech-challenge/contracts';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { TransactionsService } from './transactions.service.js';

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  create(
    @Body(new ZodValidationPipe(createTransactionSchema)) input: CreateTransactionInput,
  ): Promise<Transaction> {
    return this.transactionsService.create(input);
  }

  @Get()
  list(
    @Query(new ZodValidationPipe(listTransactionsQuerySchema)) query: ListTransactionsQuery,
  ): Promise<TransactionPage> {
    return this.transactionsService.list(query);
  }

  @Get(':transactionExternalId')
  findOne(
    @Param('transactionExternalId', new ZodValidationPipe(z.guid('Identificador inválido')))
    transactionExternalId: string,
  ): Promise<Transaction> {
    return this.transactionsService.findByExternalId(transactionExternalId);
  }
}
