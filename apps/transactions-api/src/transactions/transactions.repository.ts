import type { CreateTransactionInput, TransferType } from '@tech-challenge/contracts';
import type { PageRequest, TransactionFilters, TransactionRecord } from './transaction-record.js';

/**
 * Porta de persistência. Classe abstrata (e não interface) para servir de token
 * de injeção do Nest; os testes de regra de negócio usam uma implementação em memória.
 */
export abstract class TransactionsRepository {
  abstract create(input: CreateTransactionInput): Promise<TransactionRecord>;
  abstract findById(id: string): Promise<TransactionRecord | null>;
  abstract list(
    filters: TransactionFilters,
    page: PageRequest,
  ): Promise<{ items: TransactionRecord[]; total: number }>;
  abstract findTransferType(id: number): Promise<TransferType | null>;
  abstract listTransferTypes(): Promise<TransferType[]>;
}
