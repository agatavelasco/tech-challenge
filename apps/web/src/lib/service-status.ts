import type { Transaction } from '@tech-challenge/contracts';
import { ApiError } from './api-client';

/**
 * A análise antifraude costuma levar poucos segundos. Passado este tempo, a demora
 * indica serviço fora do ar ou se recuperando, e vale avisar quem está olhando.
 */
export const PENDING_DELAY_NOTICE_MS = 15_000;

/** Enquanto a API não responde, a tela tenta de novo sozinha neste intervalo. */
export const RECONNECT_INTERVAL_MS = 5_000;

export function isAnalysisDelayed(transaction: Transaction, now: number): boolean {
  return (
    transaction.transactionStatus.name === 'pending' &&
    now - Date.parse(transaction.createdAt) > PENDING_DELAY_NOTICE_MS
  );
}

/** Falha de rede ou do servidor: passa sozinha quando o serviço volta. 4xx não passa. */
export function isServiceUnavailable(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 0 || error.status >= 500);
}
