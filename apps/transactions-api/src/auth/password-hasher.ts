import { randomBytes, scrypt, type ScryptOptions, timingSafeEqual } from 'node:crypto';
import { Injectable } from '@nestjs/common';

const KEY_LENGTH = 64;
// Parâmetros de custo do scrypt recomendados pela OWASP (N = 2^17, r = 8, p = 1).
const COST = { N: 2 ** 17, r: 8, p: 1, maxmem: 256 * 1024 * 1024 } satisfies ScryptOptions;

function deriveKey(password: string, salt: Buffer, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, options, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

/**
 * Hash de senha com scrypt (node:crypto): sem dependência nativa para compilar.
 * Formato armazenado: `scrypt$N$r$p$<sal base64>$<hash base64>` — os parâmetros
 * viajam com o hash, então o custo pode subir sem invalidar senhas antigas.
 */
@Injectable()
export class PasswordHasher {
  async hash(password: string): Promise<string> {
    const salt = randomBytes(16);
    const key = await deriveKey(password, salt, COST);
    return ['scrypt', COST.N, COST.r, COST.p, salt.toString('base64'), key.toString('base64')].join(
      '$',
    );
  }

  async verify(password: string, stored: string): Promise<boolean> {
    const [algorithm, n, r, p, salt, hash] = stored.split('$');
    if (algorithm !== 'scrypt' || !n || !r || !p || !salt || !hash) return false;

    const expected = Buffer.from(hash, 'base64');
    const key = await deriveKey(password, Buffer.from(salt, 'base64'), {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      maxmem: COST.maxmem,
    });
    // Comparação em tempo constante: o tempo de resposta não revela quantos bytes bateram.
    return key.length === expected.length && timingSafeEqual(key, expected);
  }
}
