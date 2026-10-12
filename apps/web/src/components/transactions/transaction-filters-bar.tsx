'use client';

import { TRANSACTION_STATUSES } from '@tech-challenge/contracts';
import { STATUS_LABELS } from '@/lib/format';
import type { TransactionFilters } from '@/lib/transaction-filters';
import { useTransferTypes } from '@/lib/transaction-queries';
import { CalendarDays, CircleDot, Shapes, X } from 'lucide-react';
import { Button } from '../ui/button';
import { InputIcon, inputClassName } from '../ui/field';

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
      className="grid gap-3 border-b border-slate-200 bg-white p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto]"
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-500">
        Status
        <span className="relative">
          <InputIcon>
            <CircleDot />
          </InputIcon>
          <select
            className={`${inputClassName} pl-9`}
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
        </span>
      </label>

      <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-500">
        Tipo
        <span className="relative">
          <InputIcon>
            <Shapes />
          </InputIcon>
          <select
            className={`${inputClassName} pl-9`}
            value={filters.transferTypeId ?? ''}
            disabled={!transferTypes.data}
            onChange={(event) => {
              update({
                transferTypeId: event.target.value ? Number(event.target.value) : undefined,
              });
            }}
          >
            <option value="">Todos</option>
            {transferTypes.data?.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </span>
      </label>

      <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-500">
        De
        <span className="relative">
          <InputIcon>
            <CalendarDays />
          </InputIcon>
          <input
            type="date"
            className={`${inputClassName} pl-9`}
            value={filters.from ?? ''}
            max={filters.to}
            onChange={(event) => {
              update({ from: event.target.value || undefined });
            }}
          />
        </span>
      </label>

      <label className="flex flex-col gap-1.5 text-xs font-medium text-slate-500">
        Até
        <span className="relative">
          <InputIcon>
            <CalendarDays />
          </InputIcon>
          <input
            type="date"
            className={`${inputClassName} pl-9`}
            value={filters.to ?? ''}
            min={filters.from}
            onChange={(event) => {
              update({ to: event.target.value || undefined });
            }}
          />
        </span>
      </label>

      <div className="flex items-end">
        <Button
          variant="ghost"
          className="w-full lg:w-auto"
          onClick={() => {
            onChange({ page: 1, pageSize: filters.pageSize });
          }}
        >
          <X aria-hidden />
          Limpar filtros
        </Button>
      </div>
    </form>
  );
}
