import Link from 'next/link';
import { Suspense } from 'react';
import { LoadingState } from '@/components/states';
import { TransactionDetail } from '@/components/transactions/transaction-detail';

export default function TransactionDetailPage() {
  return (
    <div className="flex flex-col gap-4">
      <Link href="/transactions" className="text-sm text-indigo-600 hover:underline">
        ← Voltar para transações
      </Link>
      <Suspense fallback={<LoadingState label="Carregando transação" />}>
        <TransactionDetail />
      </Suspense>
    </div>
  );
}
