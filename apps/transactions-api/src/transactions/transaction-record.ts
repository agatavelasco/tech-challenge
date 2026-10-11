import type { TransactionStatus, TransferType } from '@tech-challenge/contracts';

/** Transação como o domínio a enxerga, independente do Prisma. */
export interface TransactionRecord {
  id: string;
  accountExternalIdDebit: string;
  accountExternalIdCredit: string;
  transferType: TransferType;
  value: number;
  status: TransactionStatus;
  createdAt: Date;
}

export interface TransactionFilters {
  status?: TransactionStatus | undefined;
  transferTypeId?: number | undefined;
  createdFrom?: Date | undefined;
  createdTo?: Date | undefined;
}

export interface PageRequest {
  skip: number;
  take: number;
}
