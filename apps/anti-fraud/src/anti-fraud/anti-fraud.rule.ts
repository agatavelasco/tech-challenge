import {
  ANTI_FRAUD_MAX_APPROVED_VALUE,
  type ResolvedTransactionStatus,
} from '@tech-challenge/contracts';

export function evaluateTransaction(value: number): ResolvedTransactionStatus {
  return value > ANTI_FRAUD_MAX_APPROVED_VALUE ? 'rejected' : 'approved';
}
