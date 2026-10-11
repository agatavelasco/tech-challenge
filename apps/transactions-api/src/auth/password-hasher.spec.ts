import { PasswordHasher } from './password-hasher.js';

describe('PasswordHasher', () => {
  const hasher = new PasswordHasher();

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
