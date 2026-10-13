import type { Transaction } from '@tech-challenge/contracts';
import { ApiError } from './api-client';

export const PENDING_DELAY_NOTICE_MS = 15_000;

export const RECONNECT_INTERVAL_MS = 5_000;

export function isAnalysisDelayed(transaction: Transaction, now: number): boolean {
  return (
    transaction.transactionStatus.name === 'pending' &&
    now - Date.parse(transaction.createdAt) > PENDING_DELAY_NOTICE_MS
  );
}

export function isServiceUnavailable(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 0 || error.status >= 500);
}
