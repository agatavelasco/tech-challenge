import type { Transaction } from '@tech-challenge/contracts';
import type { TransactionRecord } from './transaction-record.js';

export function toTransactionResponse(record: TransactionRecord): Transaction {
  return {
    transactionExternalId: record.id,
    transactionType: record.transferType,
    transactionStatus: { name: record.status },
    value: record.value,
    createdAt: record.createdAt.toISOString(),
  };
}
