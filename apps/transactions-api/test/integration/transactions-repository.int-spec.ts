import type { CreateTransactionInput } from '@tech-challenge/contracts';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { PrismaTransactionsRepository } from '../../src/transactions/prisma-transactions.repository.js';
import { transactionCreatedMessage } from '../../src/transactions/transaction-events.js';
import { integrationConfig, resetDatabase } from './support/environment.js';

const input: CreateTransactionInput = {
  accountExternalIdDebit: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  accountExternalIdCredit: '9c1b6f3e-2a4d-4e8b-9f7a-1d2c3b4a5e6f',
  transferTypeId: 1,
  value: 120.55,
};

describe('PrismaTransactionsRepository (Postgres real)', () => {
  let prisma: PrismaService;
  let repository: PrismaTransactionsRepository;

  beforeAll(() => {
    prisma = new PrismaService(integrationConfig());
    repository = new PrismaTransactionsRepository(prisma);
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('grava a transação pendente e o evento do outbox juntos', async () => {
    const record = await repository.create(input, transactionCreatedMessage);

    expect(record).toMatchObject({
      status: 'pending',
      value: 120.55,
      transferType: { name: 'Pix' },
    });
    const outbox = await prisma.outboxEvent.findMany();
    expect(outbox).toEqual([
      expect.objectContaining({
        topic: 'transaction.created',
        messageKey: record.id,
        publishedAt: null,
      }),
    ]);
  });

  it('não grava a transação se o evento do outbox falhar', async () => {
    await expect(
      repository.create(input, () => {
        throw new Error('falha ao montar o evento');
      }),
    ).rejects.toThrow();

    expect(await prisma.transaction.count()).toBe(0);
  });

  it('o banco recusa valor não positivo mesmo fora da API', async () => {
    await expect(
      repository.create({ ...input, value: 0 }, transactionCreatedMessage),
    ).rejects.toThrow(/transactions_value_positive_check/);
  });

  it('lista com filtros e ordena da mais recente para a mais antiga', async () => {
    const first = await repository.create(input, transactionCreatedMessage);
    const second = await repository.create(
      { ...input, transferTypeId: 2 },
      transactionCreatedMessage,
    );
    await repository.create(input, transactionCreatedMessage);
    await repository.resolvePending(first.id, 'approved');

    const pendingPix = await repository.list(
      { status: 'pending', transferTypeId: 1 },
      { skip: 0, take: 10 },
    );
    const all = await repository.list({}, { skip: 0, take: 2 });

    expect(pendingPix.total).toBe(1);
    expect(all.total).toBe(3);
    expect(all.items).toHaveLength(2);
    expect(all.items[1]?.id).toBe(second.id);
  });

  it('resolvePending só altera transação pendente', async () => {
    const record = await repository.create(input, transactionCreatedMessage);

    await expect(repository.resolvePending(record.id, 'rejected')).resolves.toBe(true);
    await expect(repository.resolvePending(record.id, 'approved')).resolves.toBe(false);
    expect((await repository.findById(record.id))?.status).toBe('rejected');
  });
});
