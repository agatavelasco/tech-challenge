import type { TransactionStatus } from '@tech-challenge/contracts';
import { CircleCheck, CircleX, Hourglass } from 'lucide-react';
import type { ReactNode } from 'react';

/** Ícone de cada status nas opções de filtro (o badge da tabela usa o próprio). */
export const STATUS_OPTION_ICONS: Record<TransactionStatus, ReactNode> = {
  pending: <Hourglass className="text-amber-500" />,
  approved: <CircleCheck className="text-emerald-600" />,
  rejected: <CircleX className="text-red-600" />,
};
