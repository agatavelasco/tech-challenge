import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { CreateTransactionInput } from '@tech-challenge/contracts';
import { InMemoryTransactionsRepository } from '../../test/support/in-memory-transactions.repository.js';
import { TransactionsService } from './transactions.service.js';

const input: CreateTransactionInput = {
  accountExternalIdDebit: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  accountExternalIdCredit: '9c1b6f3e-2a4d-4e8b-9f7a-1d2c3b4a5e6f',
  transferTypeId: 1,
  value: 120,
};

describe('TransactionsService', () => {
  let repository: InMemoryTransactionsRepository;
  let service: TransactionsService;

  beforeEach(() => {
    repository = new InMemoryTransactionsRepository();
    service = new TransactionsService(repository);
  });

  describe('create', () => {
    it('cria a transação como pendente, no formato do contrato', async () => {
      const transaction = await service.create(input);

      expect(transaction).toEqual({
        transactionExternalId: expect.any(String),
        transactionType: { id: 1, name: 'Pix' },
        transactionStatus: { name: 'pending' },
        value: 120,
        createdAt: expect.any(String),
      });
    });

    it('grava o evento de criação no outbox, com a transação como chave', async () => {
      const transaction = await service.create(input);

      expect(repository.outbox).toEqual([
        {
          eventId: expect.any(String),
          topic: 'transaction.created',
          key: transaction.transactionExternalId,
          payload: expect.objectContaining({
            type: 'transaction.created',
            version: 1,
            payload: { transactionExternalId: transaction.transactionExternalId, value: 120 },
          }),
        },
      ]);
    });

    it('recusa tipo de transferência inexistente sem gravar nada', async () => {
      await expect(service.create({ ...input, transferTypeId: 99 })).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(repository.records).toHaveLength(0);
      expect(repository.outbox).toHaveLength(0);
    });
  });

  describe('applyAntiFraudResult', () => {
    it('resolve a transação pendente com o resultado do antifraude', async () => {
      const created = await service.create(input);

      await service.applyAntiFraudResult(created.transactionExternalId, 'rejected');

      const transaction = await service.findByExternalId(created.transactionExternalId);
      expect(transaction.transactionStatus.name).toBe('rejected');
    });

    it('ignora resultado repetido ou atrasado sem sobrescrever o status já resolvido', async () => {
      const created = await service.create(input);
      await service.applyAntiFraudResult(created.transactionExternalId, 'approved');

      await service.applyAntiFraudResult(created.transactionExternalId, 'rejected');

      const transaction = await service.findByExternalId(created.transactionExternalId);
      expect(transaction.transactionStatus.name).toBe('approved');
    });

    it('não falha para transação desconhecida', async () => {
      await expect(
        service.applyAntiFraudResult('0b7e7c1a-4f3d-4c2b-8a1e-5d6f7a8b9c0d', 'approved'),
      ).resolves.toBeUndefined();
    });
  });

  describe('findByExternalId', () => {
    it('devolve a transação criada', async () => {
      const created = await service.create(input);

      await expect(service.findByExternalId(created.transactionExternalId)).resolves.toEqual(
        created,
      );
    });

    it('lança NotFound para identificador desconhecido', async () => {
      await expect(
        service.findByExternalId('0b7e7c1a-4f3d-4c2b-8a1e-5d6f7a8b9c0d'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('list', () => {
    it('pagina da mais recente para a mais antiga e calcula o total de páginas', async () => {
      for (const value of [10, 20, 30]) await service.create({ ...input, value });

      const page = await service.list({ page: 2, pageSize: 2 });

      expect(page.data.map((transaction) => transaction.value)).toEqual([10]);
      expect(page.meta).toEqual({ page: 2, pageSize: 2, total: 3, totalPages: 2 });
    });

    it('filtra por status e tipo', async () => {
      await service.create(input);
      await service.create({ ...input, transferTypeId: 2 });
      const approved = await service.create(input);
      const record = repository.records.find(({ id }) => id === approved.transactionExternalId);
      if (record) record.status = 'approved';

      const page = await service.list({
        page: 1,
        pageSize: 10,
        status: 'pending',
        transferTypeId: 1,
      });

      expect(page.meta.total).toBe(1);
      expect(page.data[0]?.transactionStatus.name).toBe('pending');
      expect(page.data[0]?.transactionType.id).toBe(1);
    });

    it('filtra pelo período de criação', async () => {
      await service.create(input);
      const second = await service.create(input);

      const page = await service.list({
        page: 1,
        pageSize: 10,
        createdFrom: second.createdAt,
      });

      expect(page.data.map((transaction) => transaction.transactionExternalId)).toEqual([
        second.transactionExternalId,
      ]);
    });

    it('devolve página vazia com zero páginas quando nada corresponde', async () => {
      const page = await service.list({ page: 1, pageSize: 10 });

      expect(page).toEqual({ data: [], meta: { page: 1, pageSize: 10, total: 0, totalPages: 0 } });
    });
  });
});
