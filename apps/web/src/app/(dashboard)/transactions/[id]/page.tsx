import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';
import { LoadingState } from '@/components/states';
import { TransactionDetail } from '@/components/transactions/transaction-detail';

export default function TransactionDetailPage() {
  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/transactions"
        className="group inline-flex w-fit items-center gap-1.5 rounded-md text-sm font-medium text-slate-500 transition-colors hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-brand-600"
      >
        <ArrowLeft
          aria-hidden
          className="size-4 transition-transform group-hover:-translate-x-0.5"
        />
        Voltar para transações
      </Link>
      <Suspense fallback={<LoadingState label="Carregando transação" />}>
        <TransactionDetail />
      </Suspense>
    </div>
  );
}
