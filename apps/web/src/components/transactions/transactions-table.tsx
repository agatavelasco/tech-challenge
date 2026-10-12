import type { Transaction } from '@tech-challenge/contracts';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/cn';
import { formatCurrency } from '@/lib/format';
import { StatusBadge } from './status-badge';
import { TransferTypeIcon } from './transfer-type-icon';

const dateFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' });
const timeFormat = new Intl.DateTimeFormat('pt-BR', { timeStyle: 'medium' });

/** Faixa lateral da linha: pendentes se destacam enquanto aguardam a análise. */
const ROW_ACCENT = {
  pending: 'before:bg-amber-400',
  approved: 'before:bg-transparent',
  rejected: 'before:bg-transparent',
};

export function TransactionsTable({ transactions }: { transactions: Transaction[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Transações</caption>
        <thead className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
          <tr>
            <th scope="col" className="py-3 pr-4 pl-5 font-medium">
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
            <tr
              key={transaction.transactionExternalId}
              className="group transition-colors hover:bg-brand-50/40"
            >
              {/* A faixa fica na primeira célula: pseudo-elemento na <tr> viraria uma coluna. */}
              <td
                className={cn(
                  'relative py-3.5 pr-4 pl-5',
                  'before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:transition-colors before:duration-700',
                  ROW_ACCENT[transaction.transactionStatus.name],
                )}
              >
                <Link
                  href={`/transactions/${transaction.transactionExternalId}`}
                  className="inline-flex items-center gap-1 rounded-md font-mono text-xs text-slate-700 decoration-brand-300 underline-offset-4 group-hover:text-brand-700 hover:underline focus-visible:outline-2 focus-visible:outline-brand-600"
                  aria-label={`Ver transação ${transaction.transactionExternalId}`}
                >
                  {transaction.transactionExternalId.slice(0, 8)}…
                  <ChevronRight
                    aria-hidden
                    className="size-3.5 -translate-x-1 opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100"
                  />
                </Link>
              </td>
              <td className="px-4 py-3.5">
                <span className="inline-flex items-center gap-2 text-slate-700">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                    <TransferTypeIcon
                      name={transaction.transactionType.name}
                      className="size-3.5"
                    />
                  </span>
                  {transaction.transactionType.name}
                </span>
              </td>
              <td className="px-4 py-3.5 text-right font-semibold text-slate-900 tabular-nums">
                {formatCurrency(transaction.value)}
              </td>
              <td className="px-4 py-3.5">
                <StatusBadge status={transaction.transactionStatus.name} />
              </td>
              <td className="px-4 py-3.5 whitespace-nowrap tabular-nums">
                <span className="block text-slate-700">
                  {dateFormat.format(new Date(transaction.createdAt))}
                </span>
                <span className="block text-xs text-slate-400">
                  {timeFormat.format(new Date(transaction.createdAt))}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
