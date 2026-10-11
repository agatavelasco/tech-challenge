import { randomBytes, scrypt, type ScryptOptions, timingSafeEqual } from 'node:crypto';
import { Inject, Injectable, Optional } from '@nestjs/common';

const KEY_LENGTH = 64;
const MAX_MEMORY = 256 * 1024 * 1024;

export interface ScryptCost {
  N: number;
  r: number;
  p: number;
}

/** Parâmetros recomendados pela OWASP para o scrypt (N = 2^17, r = 8, p = 1). */
export const DEFAULT_SCRYPT_COST: ScryptCost = { N: 2 ** 17, r: 8, p: 1 };

/** Permite aos testes de regra usar um custo baixo; a produção usa sempre o padrão. */
export const SCRYPT_COST = Symbol('SCRYPT_COST');

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
  constructor(
    @Optional() @Inject(SCRYPT_COST) private readonly cost: ScryptCost = DEFAULT_SCRYPT_COST,
  ) {}

  async hash(password: string): Promise<string> {
    const salt = randomBytes(16);
    const { N, r, p } = this.cost;
    const key = await deriveKey(password, salt, { N, r, p, maxmem: MAX_MEMORY });
    return ['scrypt', N, r, p, salt.toString('base64'), key.toString('base64')].join('$');
  }

  async verify(password: string, stored: string): Promise<boolean> {
    const [algorithm, n, r, p, salt, hash] = stored.split('$');
    if (algorithm !== 'scrypt' || !n || !r || !p || !salt || !hash) return false;

    const expected = Buffer.from(hash, 'base64');
    const key = await deriveKey(password, Buffer.from(salt, 'base64'), {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      maxmem: MAX_MEMORY,
    });
    // Comparação em tempo constante: o tempo de resposta não revela quantos bytes bateram.
    return key.length === expected.length && timingSafeEqual(key, expected);
  }
}
