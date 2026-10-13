import type { ScryptCost } from '../../src/auth/password-hasher.js';

export const FAST_SCRYPT_COST: ScryptCost = { N: 2 ** 10, r: 8, p: 1 };
