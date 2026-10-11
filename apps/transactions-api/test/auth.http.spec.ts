import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AuthModule } from '../src/auth/auth.module.js';
import { SCRYPT_COST } from '../src/auth/password-hasher.js';
import { UsersRepository } from '../src/auth/users.repository.js';
import { APP_CONFIG, loadAppConfig } from '../src/config/app-config.js';
import { ConfigModule } from '../src/config/config.module.js';
import { TransactionsModule } from '../src/transactions/transactions.module.js';
import { TransactionsRepository } from '../src/transactions/transactions.repository.js';
import { FAST_SCRYPT_COST } from './support/fast-scrypt.js';
import { InMemoryTransactionsRepository } from './support/in-memory-transactions.repository.js';
import { InMemoryUsersRepository } from './support/in-memory-users.repository.js';

const credentials = { email: 'demo@desafio.local', password: 'demo12345' };

describe('Autenticação na API HTTP', () => {
  let app: INestApplication<App>;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule, AuthModule, TransactionsModule],
    })
      .overrideProvider(APP_CONFIG)
      .useValue(
        loadAppConfig({
          DATABASE_URL: 'postgresql://nao-usado',
          KAFKA_BROKERS: 'nao-usado:9092',
          JWT_SECRET: 'segredo-de-teste-com-mais-de-32-caracteres',
          DEMO_USER_EMAIL: credentials.email,
          DEMO_USER_PASSWORD: credentials.password,
        }),
      )
      .overrideProvider(SCRYPT_COST)
      .useValue(FAST_SCRYPT_COST)
      .overrideProvider(UsersRepository)
      .useValue(new InMemoryUsersRepository())
      .overrideProvider(TransactionsRepository)
      .useValue(new InMemoryTransactionsRepository())
      .compile();
    app = moduleRef.createNestApplication();
    // init dispara o DemoUserSeeder, que cria o usuário de demonstração.
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('nega acesso sem token', async () => {
    const response = await http().get('/transactions');

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({ message: 'Autenticação necessária' });
  });

  it('nega acesso com token inválido', async () => {
    const response = await http().get('/transactions').set('authorization', 'Bearer abc.def.ghi');

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({ message: 'Sessão inválida ou expirada' });
  });

  it('entra com o usuário de demonstração e acessa as rotas protegidas', async () => {
    const login = await http().post('/auth/login').send(credentials);
    expect(login.status).toBe(200);
    const { accessToken } = login.body as { accessToken: string };

    const response = await http()
      .get('/transfer-types')
      .set('authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
  });

  it('recusa senha errada', async () => {
    const response = await http()
      .post('/auth/login')
      .send({ ...credentials, password: 'errada' });

    expect(response.status).toBe(401);
  });

  it('valida o corpo do login', async () => {
    const response = await http().post('/auth/login').send({ email: 'x' });

    expect(response.status).toBe(400);
  });
});
