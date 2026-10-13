import type { TransactionStatus } from '@tech-challenge/contracts';

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const dateTime = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'medium' });

export const formatCurrency = (value: number): string => currency.format(value);
export const formatDateTime = (iso: string): string => dateTime.format(new Date(iso));

export const STATUS_LABELS: Record<TransactionStatus, string> = {
  pending: 'Pendente',
  approved: 'Aprovada',
  rejected: 'Rejeitada',
};
