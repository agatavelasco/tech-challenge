import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type {
  CreateTransactionInput,
  ListTransactionsQuery,
  ResolvedTransactionStatus,
  Transaction,
  TransactionPage,
  TransferType,
} from '@tech-challenge/contracts';
import { transactionCreatedMessage } from './transaction-events.js';
import { toTransactionResponse } from './transaction.mapper.js';
import { TransactionsRepository } from './transactions.repository.js';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(private readonly repository: TransactionsRepository) {}

  /**
   * Nasce pendente: o resultado do antifraude chega depois, por evento. O evento de
   * criação vai para o outbox na mesma transação do banco; o relay o publica no Kafka.
   */
  async create(input: CreateTransactionInput): Promise<Transaction> {
    const transferType = await this.repository.findTransferType(input.transferTypeId);
    if (!transferType) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Dados inválidos',
        errors: { transferTypeId: ['Tipo de transferência inexistente'] },
      });
    }

    const record = await this.repository.create(input, transactionCreatedMessage);
    return toTransactionResponse(record);
  }

  async findByExternalId(transactionExternalId: string): Promise<Transaction> {
    const record = await this.repository.findById(transactionExternalId);
    if (!record) {
      throw new NotFoundException('Transação não encontrada');
    }
    return toTransactionResponse(record);
  }

  async list(query: ListTransactionsQuery): Promise<TransactionPage> {
    const { items, total } = await this.repository.list(
      {
        status: query.status,
        transferTypeId: query.transferTypeId,
        createdFrom: query.createdFrom === undefined ? undefined : new Date(query.createdFrom),
        createdTo: query.createdTo === undefined ? undefined : new Date(query.createdTo),
      },
      { skip: (query.page - 1) * query.pageSize, take: query.pageSize },
    );

    return {
      data: items.map(toTransactionResponse),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    };
  }

  /**
   * Aplica o resultado do antifraude. Idempotente: a entrega do Kafka é pelo menos
   * uma vez, então o mesmo resultado pode chegar repetido e deve ser inofensivo.
   */
  async applyAntiFraudResult(
    transactionExternalId: string,
    status: ResolvedTransactionStatus,
  ): Promise<void> {
    const changed = await this.repository.resolvePending(transactionExternalId, status);
    if (!changed) {
      this.logger.warn(
        `Resultado ${status} ignorado para ${transactionExternalId}: transação inexistente ou já resolvida`,
      );
    }
  }

  listTransferTypes(): Promise<TransferType[]> {
    return this.repository.listTransferTypes();
  }
}
