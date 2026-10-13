import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { TransactionsModule } from '../src/transactions/transactions.module.js';
import { TransactionsRepository } from '../src/transactions/transactions.repository.js';
import { InMemoryTransactionsRepository } from './support/in-memory-transactions.repository.js';

const validBody = {
  accountExternalIdDebit: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  accountExternalIdCredit: '9c1b6f3e-2a4d-4e8b-9f7a-1d2c3b4a5e6f',
  transferTypeId: 1,
  value: 120,
};

describe('API HTTP de transações', () => {
  let app: INestApplication<App>;
  const http = () => request(app.getHttpServer());

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [TransactionsModule] })
      .overrideProvider(TransactionsRepository)
      .useValue(new InMemoryTransactionsRepository())
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('POST /transactions cria pendente e responde 201', async () => {
    const response = await http().post('/transactions').send(validBody);

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ transactionStatus: { name: 'pending' }, value: 120 });
  });

  it('POST /transactions responde 400 com os erros por campo', async () => {
    const response = await http()
      .post('/transactions')
      .send({ ...validBody, value: 0, accountExternalIdDebit: 'nao-e-guid' });

    expect(response.status).toBe(400);
    const body = response.body as { errors: Record<string, string[]> };
    expect(Object.keys(body.errors).sort()).toEqual(['accountExternalIdDebit', 'value']);
  });

  it('GET /transactions/:id devolve a transação criada', async () => {
    const created = await http().post('/transactions').send(validBody);
    const id = (created.body as { transactionExternalId: string }).transactionExternalId;

    const response = await http().get(`/transactions/${id}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(created.body);
  });

  it('GET /transactions/:id responde 400 para identificador mal formado', async () => {
    const response = await http().get('/transactions/abc');

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ message: 'Identificador inválido' });
  });

  it('GET /transactions/:id responde 404 para transação inexistente', async () => {
    const response = await http().get('/transactions/0b7e7c1a-4f3d-4c2b-8a1e-5d6f7a8b9c0d');

    expect(response.status).toBe(404);
  });

  it('GET /transactions converte a query string e pagina', async () => {
    await http().post('/transactions').send(validBody);

    const response = await http().get('/transactions?page=1&pageSize=5');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ meta: { page: 1, pageSize: 5, total: 1 } });
  });

  it('GET /transactions responde 400 em português para filtro inválido', async () => {
    const status = await http().get('/transactions?status=cancelled');
    const pageSize = await http().get('/transactions?pageSize=500');

    expect(status.status).toBe(400);
    expect(status.body).toMatchObject({
      errors: { status: ['Status inválido: use pending, approved ou rejected'] },
    });
    expect(pageSize.body).toMatchObject({
      errors: { pageSize: ['O tamanho da página deve ser no máximo 100'] },
    });
  });

  it('GET /transfer-types lista os tipos', async () => {
    const response = await http().get('/transfer-types');

    expect(response.body).toEqual([
      { id: 1, name: 'Pix' },
      { id: 2, name: 'TED' },
    ]);
  });
});
