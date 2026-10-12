'use client';

import { TRANSACTION_STATUSES } from '@tech-challenge/contracts';
import { STATUS_LABELS } from '@/lib/format';
import type { TransactionFilters } from '@/lib/transaction-filters';
import { useTransferTypes } from '@/lib/transaction-queries';
import { Button } from '../ui/button';
import { inputClassName } from '../ui/field';

interface FiltersBarProps {
  filters: TransactionFilters;
  onChange: (filters: TransactionFilters) => void;
}

export function TransactionFiltersBar({ filters, onChange }: FiltersBarProps) {
  const transferTypes = useTransferTypes();

  // Qualquer mudança de filtro volta para a primeira página.
  const update = (patch: Partial<TransactionFilters>) => {
    onChange({ ...filters, ...patch, page: 1 });
  };

  return (
    <form
      role="search"
      aria-label="Filtros"
      className="grid gap-3 border-b border-slate-200 p-4 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto]"
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        Status
        <select
          className={inputClassName}
          value={filters.status ?? ''}
          onChange={(event) => {
            const status = TRANSACTION_STATUSES.find((value) => value === event.target.value);
            update({ status });
          }}
        >
          <option value="">Todos</option>
          {TRANSACTION_STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        Tipo
        <select
          className={inputClassName}
          value={filters.transferTypeId ?? ''}
          disabled={!transferTypes.data}
          onChange={(event) => {
            update({ transferTypeId: event.target.value ? Number(event.target.value) : undefined });
          }}
        >
          <option value="">Todos</option>
          {transferTypes.data?.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        De
        <input
          type="date"
          className={inputClassName}
          value={filters.from ?? ''}
          max={filters.to}
          onChange={(event) => {
            update({ from: event.target.value || undefined });
          }}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        Até
        <input
          type="date"
          className={inputClassName}
          value={filters.to ?? ''}
          min={filters.from}
          onChange={(event) => {
            update({ to: event.target.value || undefined });
          }}
        />
      </label>

      <div className="flex items-end">
        <Button
          variant="ghost"
          onClick={() => {
            onChange({ page: 1, pageSize: filters.pageSize });
          }}
        >
          Limpar filtros
        </Button>
      </div>
    </form>
  );
}
