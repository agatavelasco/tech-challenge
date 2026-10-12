import { Suspense } from 'react';
import { LoadingState } from '@/components/states';
import { TransactionsDashboard } from '@/components/transactions/transactions-dashboard';

export default function TransactionsPage() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="text-xs font-semibold tracking-[0.14em] text-brand-600 uppercase">Painel</p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Transações
        </h1>
        <p className="text-sm text-slate-500">
          Cada transação nasce pendente e recebe o resultado da análise antifraude em segundos — a
          lista se atualiza sozinha.
        </p>
      </header>
      {/* Os filtros vêm da URL (useSearchParams): o restante da página é pré-renderizado. */}
      <Suspense fallback={<LoadingState label="Carregando transações" />}>
        <TransactionsDashboard />
      </Suspense>
    </div>
  );
}
