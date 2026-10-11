import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { FAST_SCRYPT_COST } from '../../test/support/fast-scrypt.js';
import { InMemoryUsersRepository } from '../../test/support/in-memory-users.repository.js';
import { AuthService } from './auth.service.js';
import { PasswordHasher } from './password-hasher.js';

describe('AuthService', () => {
  const jwt = new JwtService({
    secret: 'segredo-de-teste-com-mais-de-32-caracteres',
    signOptions: { expiresIn: 600 },
  });
  const hasher = new PasswordHasher(FAST_SCRYPT_COST);
  let users: InMemoryUsersRepository;
  let service: AuthService;

  beforeEach(async () => {
    users = new InMemoryUsersRepository();
    await users.createIfMissing('demo@desafio.local', await hasher.hash('demo12345'));
    service = new AuthService(users, hasher, jwt);
  });

  it('emite um token assinado com o usuário e a validade', async () => {
    const { accessToken, expiresIn } = await service.login({
      email: 'demo@desafio.local',
      password: 'demo12345',
    });

    expect(expiresIn).toBe(600);
    const payload = await jwt.verifyAsync<{ sub: string; email: string }>(accessToken);
    expect(payload).toMatchObject({ sub: users.users[0]?.id, email: 'demo@desafio.local' });
  });

  it('aceita o e-mail em maiúsculas', async () => {
    await expect(
      service.login({ email: 'DEMO@desafio.local', password: 'demo12345' }),
    ).resolves.toHaveProperty('accessToken');
  });

  it.each([
    ['senha errada', 'demo@desafio.local', 'errada'],
    ['e-mail desconhecido', 'ninguem@desafio.local', 'demo12345'],
  ])('recusa %s com a mesma mensagem', async (_case, email, password) => {
    const attempt = service.login({ email, password });

    await expect(attempt).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(attempt).rejects.toThrow('E-mail ou senha inválidos');
  });
});
