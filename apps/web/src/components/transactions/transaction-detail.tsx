'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ApiError } from '@/lib/api-client';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { isAnalysisDelayed, isServiceUnavailable } from '@/lib/service-status';
import { useTransaction } from '@/lib/transaction-queries';
import { useNow } from '@/lib/use-now';
import { DelayedAnalysisNotice, ServiceUnavailableState } from '../service-notices';
import { EmptyState, ErrorState, LoadingState } from '../states';
import { buttonVariants } from '../ui/button';
import { StatusBadge } from './status-badge';

export function TransactionDetail() {
  const { id } = useParams<{ id: string }>();
  const transaction = useTransaction(id);
  const now = useNow(1_000);

  if (transaction.isPending) return <LoadingState label="Carregando transação" />;

  if (transaction.isError) {
    if (transaction.error instanceof ApiError && transaction.error.status === 404) {
      return (
        <EmptyState
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
    <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Transação</h1>
        <StatusBadge status={data.transactionStatus.name} />
      </header>

      {isAnalysisDelayed(data, now) ? (
        <div className="mb-6">
          <DelayedAnalysisNotice />
        </div>
      ) : (
        <p aria-live="polite" className="mb-6 text-sm text-slate-600">
          {isPending
            ? 'Aguardando a análise antifraude. Esta página atualiza sozinha.'
            : 'Análise antifraude concluída.'}
        </p>
      )}

      <dl className="grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-slate-500">Identificador</dt>
          <dd className="font-mono text-sm break-all">{data.transactionExternalId}</dd>
        </div>
        <div>
          <dt className="text-sm text-slate-500">Tipo</dt>
          <dd>{data.transactionType.name}</dd>
        </div>
        <div>
          <dt className="text-sm text-slate-500">Valor</dt>
          <dd className="text-lg font-semibold tabular-nums">{formatCurrency(data.value)}</dd>
        </div>
        <div>
          <dt className="text-sm text-slate-500">Criada em</dt>
          <dd>{formatDateTime(data.createdAt)}</dd>
        </div>
      </dl>
    </article>
  );
}
