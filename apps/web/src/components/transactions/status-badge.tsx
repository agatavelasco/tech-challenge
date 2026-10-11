import type { TransactionStatus } from '@tech-challenge/contracts';
import { cn } from '@/lib/cn';
import { STATUS_LABELS } from '@/lib/format';

const STYLES: Record<TransactionStatus, string> = {
  pending: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  approved: 'bg-emerald-50 text-emerald-800 ring-emerald-600/20',
  rejected: 'bg-red-50 text-red-800 ring-red-600/20',
};

export function StatusBadge({ status }: { status: TransactionStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        STYLES[status],
      )}
    >
      {status === 'pending' && (
        <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-amber-500" />
      )}
      {STATUS_LABELS[status]}
    </span>
  );
}
