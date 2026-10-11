import { FAST_SCRYPT_COST } from '../../test/support/fast-scrypt.js';
import { DEFAULT_SCRYPT_COST, PasswordHasher } from './password-hasher.js';

describe('PasswordHasher', () => {
  const hasher = new PasswordHasher(FAST_SCRYPT_COST);

  it('usa por padrão o custo recomendado pela OWASP e o grava junto do hash', async () => {
    const stored = await new PasswordHasher().hash('demo12345');

    expect(DEFAULT_SCRYPT_COST).toEqual({ N: 131_072, r: 8, p: 1 });
    expect(stored.startsWith('scrypt$131072$8$1$')).toBe(true);
  });

  it('confere hash gerado com outro custo, lendo os parâmetros gravados', async () => {
    const stored = await hasher.hash('demo12345');

    await expect(new PasswordHasher().verify('demo12345', stored)).resolves.toBe(true);
  });

  it('não guarda a senha e confere a senha certa', async () => {
    const stored = await hasher.hash('demo12345');

    expect(stored).not.toContain('demo12345');
    expect(stored.startsWith('scrypt$')).toBe(true);
    await expect(hasher.verify('demo12345', stored)).resolves.toBe(true);
    await expect(hasher.verify('demo1234', stored)).resolves.toBe(false);
  });

  it('gera hashes diferentes para a mesma senha (sal aleatório)', async () => {
    expect(await hasher.hash('igual')).not.toBe(await hasher.hash('igual'));
  });

  it('recusa hash em formato desconhecido sem lançar erro', async () => {
    await expect(hasher.verify('qualquer', 'md5$abc')).resolves.toBe(false);
  });
});
