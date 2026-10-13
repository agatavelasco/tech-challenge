import { Injectable } from '@nestjs/common';
import type {
  CreateTransactionInput,
  ResolvedTransactionStatus,
  TransactionStatus,
  TransferType,
} from '@tech-challenge/contracts';
import {
  TransactionStatus as DbTransactionStatus,
  type Prisma,
} from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  OutboxMessage,
  PageRequest,
  TransactionFilters,
  TransactionRecord,
} from './transaction-record.js';
import { TransactionsRepository } from './transactions.repository.js';

const STATUS_TO_DB: Record<TransactionStatus, DbTransactionStatus> = {
  pending: DbTransactionStatus.PENDING,
  approved: DbTransactionStatus.APPROVED,
  rejected: DbTransactionStatus.REJECTED,
};
const STATUS_FROM_DB: Record<DbTransactionStatus, TransactionStatus> = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

const withTransferType = { transferType: true } as const;
type TransactionRow = Prisma.TransactionGetPayload<{ include: typeof withTransferType }>;

function toRecord(row: TransactionRow): TransactionRecord {
  return {
    id: row.id,
    accountExternalIdDebit: row.accountExternalIdDebit,
    accountExternalIdCredit: row.accountExternalIdCredit,
    transferType: { id: row.transferType.id, name: row.transferType.name },
    value: row.value.toNumber(),
    status: STATUS_FROM_DB[row.status],
    createdAt: row.createdAt,
  };
}

function toWhere(filters: TransactionFilters): Prisma.TransactionWhereInput {
  return {
    ...(filters.status && { status: STATUS_TO_DB[filters.status] }),
    ...(filters.transferTypeId !== undefined && { transferTypeId: filters.transferTypeId }),
    ...((filters.createdFrom ?? filters.createdTo) && {
      createdAt: {
        ...(filters.createdFrom && { gte: filters.createdFrom }),
        ...(filters.createdTo && { lte: filters.createdTo }),
      },
    }),
  };
}

@Injectable()
export class PrismaTransactionsRepository extends TransactionsRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(
    input: CreateTransactionInput,
    eventFor: (record: TransactionRecord) => OutboxMessage,
  ): Promise<TransactionRecord> {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.transaction.create({
        data: {
          accountExternalIdDebit: input.accountExternalIdDebit,
          accountExternalIdCredit: input.accountExternalIdCredit,
          transferTypeId: input.transferTypeId,
          value: input.value,
        },
        include: withTransferType,
      });
      const record = toRecord(row);
      const event = eventFor(record);

      await tx.outboxEvent.create({
        data: {
          id: event.eventId,
          topic: event.topic,
          messageKey: event.key,
          payload: event.payload as Prisma.InputJsonValue,
        },
      });
      return record;
    });
  }

  async resolvePending(id: string, status: ResolvedTransactionStatus): Promise<boolean> {
    const { count } = await this.prisma.transaction.updateMany({
      where: { id, status: DbTransactionStatus.PENDING },
      data: { status: STATUS_TO_DB[status] },
    });
    return count === 1;
  }

  async findById(id: string): Promise<TransactionRecord | null> {
    const row = await this.prisma.transaction.findUnique({
      where: { id },
      include: withTransferType,
    });
    return row && toRecord(row);
  }

  async list(
    filters: TransactionFilters,
    page: PageRequest,
  ): Promise<{ items: TransactionRecord[]; total: number }> {
    const where = toWhere(filters);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.transaction.findMany({
        where,
        include: withTransferType,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: page.skip,
        take: page.take,
      }),
      this.prisma.transaction.count({ where }),
    ]);
    return { items: rows.map(toRecord), total };
  }

  async findTransferType(id: number): Promise<TransferType | null> {
    return this.prisma.transferType.findUnique({ where: { id }, select: { id: true, name: true } });
  }

  async listTransferTypes(): Promise<TransferType[]> {
    return this.prisma.transferType.findMany({
      select: { id: true, name: true },
      orderBy: { id: 'asc' },
    });
  }
}
