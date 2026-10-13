'use client';

import type { TransactionStatus } from '@tech-challenge/contracts';
import { CircleCheck, CircleX, LoaderCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { STATUS_LABELS } from '@/lib/format';

const STYLES: Record<TransactionStatus, string> = {
  pending: 'bg-amber-50 text-amber-800 ring-amber-500/30',
  approved: 'bg-emerald-50 text-emerald-800 ring-emerald-600/25',
  rejected: 'bg-red-50 text-red-700 ring-red-600/25',
};

const ICONS = {
  pending: <LoaderCircle aria-hidden className="size-3.5 motion-safe:animate-spin" />,
  approved: <CircleCheck aria-hidden className="size-3.5" />,
  rejected: <CircleX aria-hidden className="size-3.5" />,
} satisfies Record<TransactionStatus, React.ReactNode>;

export function StatusBadge({ status }: { status: TransactionStatus }) {
  const previous = useRef(status);
  const [justChanged, setJustChanged] = useState(false);

  useEffect(() => {
    if (previous.current === status) return;
    previous.current = status;
    setJustChanged(true);
    const timer = setTimeout(() => {
      setJustChanged(false);
    }, 700);
    return () => {
      clearTimeout(timer);
    };
  }, [status]);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 transition-colors duration-500 ring-inset',
        STYLES[status],
        justChanged && 'motion-safe:animate-status-settle',
      )}
    >
      {ICONS[status]}
      {STATUS_LABELS[status]}
    </span>
  );
}
