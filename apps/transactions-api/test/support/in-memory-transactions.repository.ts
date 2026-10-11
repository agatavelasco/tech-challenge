import { randomUUID } from 'node:crypto';
import type { CreateTransactionInput, TransferType } from '@tech-challenge/contracts';
import type {
  PageRequest,
  TransactionFilters,
  TransactionRecord,
} from '../../src/transactions/transaction-record.js';
import { TransactionsRepository } from '../../src/transactions/transactions.repository.js';

export const TRANSFER_TYPES: TransferType[] = [
  { id: 1, name: 'Pix' },
  { id: 2, name: 'TED' },
];

/** Implementação em memória da porta de persistência, para testar regras sem banco. */
export class InMemoryTransactionsRepository extends TransactionsRepository {
  readonly records: TransactionRecord[] = [];
  private clock = Date.parse('2026-10-11T12:00:00.000Z');

  create(input: CreateTransactionInput): Promise<TransactionRecord> {
    const transferType = TRANSFER_TYPES.find((type) => type.id === input.transferTypeId);
    if (!transferType) throw new Error(`Tipo ${input.transferTypeId} não existe`);

    const record: TransactionRecord = {
      id: randomUUID(),
      accountExternalIdDebit: input.accountExternalIdDebit,
      accountExternalIdCredit: input.accountExternalIdCredit,
      transferType,
      value: input.value,
      status: 'pending',
      createdAt: new Date((this.clock += 1000)),
    };
    this.records.push(record);
    return Promise.resolve(record);
  }

  findById(id: string): Promise<TransactionRecord | null> {
    return Promise.resolve(this.records.find((record) => record.id === id) ?? null);
  }

  list(
    filters: TransactionFilters,
    page: PageRequest,
  ): Promise<{ items: TransactionRecord[]; total: number }> {
    const matching = this.records
      .filter((record) => !filters.status || record.status === filters.status)
      .filter(
        (record) =>
          filters.transferTypeId === undefined || record.transferType.id === filters.transferTypeId,
      )
      .filter((record) => !filters.createdFrom || record.createdAt >= filters.createdFrom)
      .filter((record) => !filters.createdTo || record.createdAt <= filters.createdTo)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return Promise.resolve({
      items: matching.slice(page.skip, page.skip + page.take),
      total: matching.length,
    });
  }

  findTransferType(id: number): Promise<TransferType | null> {
    return Promise.resolve(TRANSFER_TYPES.find((type) => type.id === id) ?? null);
  }

  listTransferTypes(): Promise<TransferType[]> {
    return Promise.resolve(TRANSFER_TYPES);
  }
}
