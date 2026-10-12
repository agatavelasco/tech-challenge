'use client';

import { Inbox, Plus, SearchX } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  filtersToSearchParams,
  hasActiveFilters,
  parseFilters,
  type TransactionFilters,
} from '@/lib/transaction-filters';
import { isAnalysisDelayed, isServiceUnavailable } from '@/lib/service-status';
import { useTransactions } from '@/lib/transaction-queries';
import { useNow } from '@/lib/use-now';
import { DelayedAnalysisNotice, ServiceUnavailableState } from '../service-notices';
import { EmptyState, ErrorState, LoadingState } from '../states';
import { Button, buttonVariants } from '../ui/button';
import { Pagination } from './pagination';
import { TransactionFiltersBar } from './transaction-filters-bar';
import { TransactionsTable } from './transactions-table';

export function TransactionsDashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = parseFilters(new URLSearchParams(searchParams.toString()));
  const transactions = useTransactions(filters);
  const now = useNow(1_000);
  const hasDelayedAnalysis =
    transactions.data?.data.some((transaction) => isAnalysisDelayed(transaction, now)) ?? false;

  const navigate = (next: TransactionFilters) => {
    const query = filtersToSearchParams(next).toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  return (
    // Sem overflow-hidden no card: ele cortaria o calendário e os dropdowns abertos.
    // Os cantos arredondados ficam nas partes de cima (filtros) e de baixo (tabela/paginação).
    <section className="rounded-2xl border border-slate-200 bg-white shadow-xs">
      <TransactionFiltersBar filters={filters} onChange={navigate} />

      <p aria-live="polite" className="sr-only">
        {transactions.isFetching && !transactions.isPending ? 'Atualizando transações' : ''}
      </p>

      {transactions.isPending ? (
        <LoadingState label="Carregando transações" />
      ) : transactions.isError ? (
        isServiceUnavailable(transactions.error) ? (
          <ServiceUnavailableState onRetry={() => void transactions.refetch()} />
        ) : (
          <ErrorState
            message={transactions.error.message}
            onRetry={() => void transactions.refetch()}
          />
        )
      ) : transactions.data.data.length === 0 ? (
        hasActiveFilters(filters) ? (
          <EmptyState
            icon={<SearchX />}
            title="Nenhuma transação encontrada"
            description="Nenhuma transação corresponde aos filtros aplicados."
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  navigate({ page: 1, pageSize: filters.pageSize });
                }}
              >
                Limpar filtros
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={<Inbox />}
            title="Nenhuma transação ainda"
            description="As transações criadas aparecem aqui, com o status atualizado automaticamente."
            action={
              <Link href="/transactions/new" className={buttonVariants()}>
                <Plus aria-hidden />
                Criar transação
              </Link>
            }
          />
        )
      ) : (
        <>
          {hasDelayedAnalysis && (
            <div className="border-b border-slate-200 p-4 sm:px-5">
              <DelayedAnalysisNotice plural />
            </div>
          )}
          <TransactionsTable transactions={transactions.data.data} />
          <Pagination
            {...transactions.data.meta}
            onPageChange={(page) => {
              navigate({ ...filters, page });
            }}
            // Outro tamanho muda o que cabe em cada página: volta para a primeira.
            onPageSizeChange={(pageSize) => {
              navigate({ ...filters, page: 1, pageSize });
            }}
          />
        </>
      )}
    </section>
  );
}
