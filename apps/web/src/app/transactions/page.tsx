import { Suspense } from 'react';
import { LoadingState } from '@/components/states';
import { TransactionsDashboard } from '@/components/transactions/transactions-dashboard';

export default function TransactionsPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Transações</h1>
      {/* Os filtros vêm da URL (useSearchParams): o restante da página é pré-renderizado. */}
      <Suspense fallback={<LoadingState label="Carregando transações" />}>
        <TransactionsDashboard />
      </Suspense>
    </div>
  );
}
