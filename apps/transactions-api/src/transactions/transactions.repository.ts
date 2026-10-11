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

/**
 * Porta de persistência. Classe abstrata (e não interface) para servir de token
 * de injeção do Nest; os testes de regra de negócio usam uma implementação em memória.
 */
export abstract class TransactionsRepository {
  /** Grava a transação e o evento do outbox atomicamente: ou os dois, ou nenhum. */
  abstract create(
    input: CreateTransactionInput,
    eventFor: (record: TransactionRecord) => OutboxMessage,
  ): Promise<TransactionRecord>;
  /**
   * Muda o status apenas se a transação ainda estiver pendente. Devolve se houve
   * mudança: evento repetido ou fora de ordem não sobrescreve um resultado já gravado.
   */
  abstract resolvePending(id: string, status: ResolvedTransactionStatus): Promise<boolean>;
  abstract findById(id: string): Promise<TransactionRecord | null>;
  abstract list(
    filters: TransactionFilters,
    page: PageRequest,
  ): Promise<{ items: TransactionRecord[]; total: number }>;
  abstract findTransferType(id: number): Promise<TransferType | null>;
  abstract listTransferTypes(): Promise<TransferType[]>;
}
