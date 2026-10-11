import { loginSchema } from './auth.js';

describe('loginSchema', () => {
  it('aceita e-mail e senha', () => {
    expect(loginSchema.safeParse({ email: 'demo@desafio.local', password: 'x' }).success).toBe(
      true,
    );
  });

  it('explica o que falta', () => {
    const result = loginSchema.safeParse({ email: 'nao-e-email', password: '' });

    expect(result.error?.issues.map((issue) => issue.message)).toEqual([
      'Informe um e-mail válido',
      'Informe a senha',
    ]);
  });
});
