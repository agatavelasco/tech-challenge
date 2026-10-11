'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  filtersToSearchParams,
  hasActiveFilters,
  parseFilters,
  type TransactionFilters,
} from '@/lib/transaction-filters';
import { useTransactions } from '@/lib/transaction-queries';
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

  const navigate = (next: TransactionFilters) => {
    const query = filtersToSearchParams(next).toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <TransactionFiltersBar filters={filters} onChange={navigate} />

      <p aria-live="polite" className="sr-only">
        {transactions.isFetching && !transactions.isPending ? 'Atualizando transações' : ''}
      </p>

      {transactions.isPending ? (
        <LoadingState label="Carregando transações" />
      ) : transactions.isError ? (
        <ErrorState
          message={transactions.error.message}
          onRetry={() => void transactions.refetch()}
        />
      ) : transactions.data.data.length === 0 ? (
        hasActiveFilters(filters) ? (
          <EmptyState
            title="Nenhuma transação encontrada"
            description="Nenhuma transação corresponde aos filtros aplicados."
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  navigate({ page: 1 });
                }}
              >
                Limpar filtros
              </Button>
            }
          />
        ) : (
          <EmptyState
            title="Nenhuma transação ainda"
            description="As transações criadas aparecem aqui, com o status atualizado automaticamente."
            action={
              <Link href="/transactions/new" className={buttonVariants()}>
                Criar transação
              </Link>
            }
          />
        )
      ) : (
        <>
          <TransactionsTable transactions={transactions.data.data} />
          <Pagination
            {...transactions.data.meta}
            onPageChange={(page) => {
              navigate({ ...filters, page });
            }}
          />
        </>
      )}
    </section>
  );
}
