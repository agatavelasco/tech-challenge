'use client';

import { FileQuestionMark } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ApiError } from '@/lib/api-client';
import { cn } from '@/lib/cn';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { isAnalysisDelayed, isServiceUnavailable } from '@/lib/service-status';
import { useTransaction } from '@/lib/transaction-queries';
import { useNow } from '@/lib/use-now';
import { DelayedAnalysisNotice, ServiceUnavailableState } from '../service-notices';
import { EmptyState, ErrorState, LoadingState } from '../states';
import { buttonVariants } from '../ui/button';
import { AnalysisTimeline } from './analysis-timeline';
import { StatusBadge } from './status-badge';
import { TransferTypeIcon } from './transfer-type-icon';

export function TransactionDetail() {
  const { id } = useParams<{ id: string }>();
  const transaction = useTransaction(id);
  const now = useNow(1_000);

  if (transaction.isPending) return <LoadingState label="Carregando transação" />;

  if (transaction.isError) {
    if (transaction.error instanceof ApiError && transaction.error.status === 404) {
      return (
        <EmptyState
          icon={<FileQuestionMark />}
          title="Transação não encontrada"
          description="Confira o identificador ou volte para a listagem."
          action={
            <Link href="/transactions" className={buttonVariants({ variant: 'secondary' })}>
              Ver transações
            </Link>
          }
        />
      );
    }
    if (isServiceUnavailable(transaction.error)) {
      return <ServiceUnavailableState onRetry={() => void transaction.refetch()} />;
    }
    return (
      <ErrorState message={transaction.error.message} onRetry={() => void transaction.refetch()} />
    );
  }

  const { data } = transaction;
  const isPending = data.transactionStatus.name === 'pending';

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs motion-safe:animate-fade-up">
      {/* Faixa no topo na cor do status: muda junto com o resultado da análise. */}
      <div
        aria-hidden
        className={cn(
          'h-1 transition-colors duration-700',
          STATUS_STRIP[data.transactionStatus.name],
        )}
      />

      <header className="flex flex-wrap items-start justify-between gap-4 px-6 pt-6 sm:px-8 sm:pt-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-sm font-medium text-slate-500">Transação</h1>
          <p className="text-4xl font-semibold tracking-tight text-slate-900 tabular-nums">
            {formatCurrency(data.value)}
          </p>
          <span className="mt-1 inline-flex items-center gap-1.5 text-sm text-slate-600">
            <TransferTypeIcon name={data.transactionType.name} className="size-4 text-slate-400" />
            {data.transactionType.name}
          </span>
        </div>
        <StatusBadge status={data.transactionStatus.name} />
      </header>

      <section className="px-6 py-8 sm:px-8">
        <AnalysisTimeline status={data.transactionStatus.name} createdAt={data.createdAt} />
      </section>

      <div className="px-6 sm:px-8">
        {isAnalysisDelayed(data, now) ? (
          <DelayedAnalysisNotice />
        ) : (
          <p
            aria-live="polite"
            className={cn(
              'rounded-xl px-4 py-3 text-center text-sm transition-colors duration-500',
              isPending ? 'bg-amber-50/70 text-amber-800' : 'bg-slate-50 text-slate-600',
            )}
          >
            {isPending
              ? 'Aguardando a análise antifraude. Esta página atualiza sozinha.'
              : 'Análise antifraude concluída.'}
          </p>
        )}
      </div>

      <dl className="mt-6 grid gap-x-8 gap-y-4 border-t border-slate-100 bg-slate-50/50 px-6 py-6 sm:grid-cols-[2fr_1fr] sm:px-8">
        <div>
          <dt className="text-xs font-medium text-slate-500">Identificador</dt>
          <dd className="mt-1 font-mono text-sm break-all text-slate-800">
            {data.transactionExternalId}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-slate-500">Criada em</dt>
          <dd className="mt-1 text-sm text-slate-800 tabular-nums">
            {formatDateTime(data.createdAt)}
          </dd>
        </div>
      </dl>
    </article>
  );
}

const STATUS_STRIP = {
  pending: 'bg-amber-400',
  approved: 'bg-emerald-500',
  rejected: 'bg-red-500',
};
