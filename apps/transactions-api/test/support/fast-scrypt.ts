import type { ScryptCost } from '../../src/auth/password-hasher.js';

/** Custo baixo nos testes de regra: a lógica é a mesma, sem pagar ~1s de CPU por hash. */
export const FAST_SCRYPT_COST: ScryptCost = { N: 2 ** 10, r: 8, p: 1 };
