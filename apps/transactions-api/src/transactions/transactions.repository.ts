import type {
  CreateTransactionInput,
  ResolvedTransactionStatus,
  TransferType,
} from '@tech-challenge/contracts';
import type {
  OutboxMessage,
  PageRequest,
  TransactionFilters,
  TransactionRecord,
} from './transaction-record.js';

export abstract class TransactionsRepository {
  abstract create(
    input: CreateTransactionInput,
    eventFor: (record: TransactionRecord) => OutboxMessage,
  ): Promise<TransactionRecord>;
  abstract resolvePending(id: string, status: ResolvedTransactionStatus): Promise<boolean>;
  abstract findById(id: string): Promise<TransactionRecord | null>;
  abstract list(
    filters: TransactionFilters,
    page: PageRequest,
  ): Promise<{ items: TransactionRecord[]; total: number }>;
  abstract findTransferType(id: number): Promise<TransferType | null>;
  abstract listTransferTypes(): Promise<TransferType[]>;
}
