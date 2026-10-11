import type { Transaction, TransactionPage } from '@tech-challenge/contracts';

export function buildTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    transactionExternalId: '01a12c49-2a9b-7529-b23c-05f14ddd4710',
    transactionType: { id: 1, name: 'Pix' },
    transactionStatus: { name: 'approved' },
    value: 120,
    createdAt: '2026-10-11T12:00:00.000Z',
    ...overrides,
  };
}

export function buildPage(
  data: Transaction[],
  meta: Partial<TransactionPage['meta']> = {},
): TransactionPage {
  return {
    data,
    meta: { page: 1, pageSize: 10, total: data.length, totalPages: data.length ? 1 : 0, ...meta },
  };
}

export const TRANSFER_TYPES = [
  { id: 1, name: 'Pix' },
  { id: 2, name: 'TED' },
];
