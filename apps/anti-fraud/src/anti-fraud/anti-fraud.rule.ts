import {
  ANTI_FRAUD_MAX_APPROVED_VALUE,
  type ResolvedTransactionStatus,
} from '@tech-challenge/contracts';

/** Regra do desafio: acima de 1000 é rejeitada; 1000 exatos ainda é aprovada. */
export function evaluateTransaction(value: number): ResolvedTransactionStatus {
  return value > ANTI_FRAUD_MAX_APPROVED_VALUE ? 'rejected' : 'approved';
}
