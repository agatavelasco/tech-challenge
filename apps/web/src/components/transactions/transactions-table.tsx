import type { Transaction } from '@tech-challenge/contracts';
import Link from 'next/link';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { StatusBadge } from './status-badge';

export function TransactionsTable({ transactions }: { transactions: Transaction[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Transações</caption>
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">
              Transação
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Tipo
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              Valor
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Status
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Criada em
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {transactions.map((transaction) => (
            <tr key={transaction.transactionExternalId} className="hover:bg-slate-50">
              <td className="px-4 py-3">
                <Link
                  href={`/transactions/${transaction.transactionExternalId}`}
                  className="font-mono text-xs text-indigo-600 hover:underline"
                  aria-label={`Ver transação ${transaction.transactionExternalId}`}
                >
                  {transaction.transactionExternalId.slice(0, 8)}…
                </Link>
              </td>
              <td className="px-4 py-3">{transaction.transactionType.name}</td>
              <td className="px-4 py-3 text-right tabular-nums">
                {formatCurrency(transaction.value)}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={transaction.transactionStatus.name} />
              </td>
              <td className="px-4 py-3 text-slate-600">{formatDateTime(transaction.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
