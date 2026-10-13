'use client';

import { TRANSACTION_STATUSES } from '@tech-challenge/contracts';
import { CircleDot, Shapes, X } from 'lucide-react';
import { STATUS_LABELS } from '@/lib/format';
import { hasActiveFilters, type TransactionFilters } from '@/lib/transaction-filters';
import { useTransferTypes } from '@/lib/transaction-queries';
import { Button } from '../ui/button';
import { DatePicker } from '../ui/date-picker';
import { Select } from '../ui/select';
import { STATUS_OPTION_ICONS } from './option-icons';
import { TransferTypeIcon } from './transfer-type-icon';

interface FiltersBarProps {
  filters: TransactionFilters;
  onChange: (filters: TransactionFilters) => void;
}

const labelClassName = 'text-xs font-medium text-slate-500';

export function TransactionFiltersBar({ filters, onChange }: FiltersBarProps) {
  const transferTypes = useTransferTypes();

  const update = (patch: Partial<TransactionFilters>) => {
    onChange({ ...filters, ...patch, page: 1 });
  };

  return (
    <form
      role="search"
      aria-label="Filtros"
      className="grid gap-3 rounded-t-2xl border-b border-slate-200 bg-white p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-[repeat(4,minmax(0,1fr))_9.5rem]"
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="filter-status" className={labelClassName}>
          Status
        </label>
        <Select
          id="filter-status"
          value={filters.status ?? ''}
          icon={<CircleDot />}
          onChange={(value) => {
            update({ status: TRANSACTION_STATUSES.find((status) => status === value) });
          }}
          options={[
            { value: '', label: 'Todos', icon: <CircleDot /> },
            ...TRANSACTION_STATUSES.map((status) => ({
              value: status,
              label: STATUS_LABELS[status],
              icon: STATUS_OPTION_ICONS[status],
            })),
          ]}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="filter-type" className={labelClassName}>
          Tipo
        </label>
        <Select
          id="filter-type"
          value={filters.transferTypeId === undefined ? '' : String(filters.transferTypeId)}
          icon={<Shapes />}
          disabled={!transferTypes.data}
          onChange={(value) => {
            update({ transferTypeId: value ? Number(value) : undefined });
          }}
          options={[
            { value: '', label: 'Todos', icon: <Shapes /> },
            ...(transferTypes.data ?? []).map((type) => ({
              value: String(type.id),
              label: type.name,
              icon: <TransferTypeIcon name={type.name} />,
            })),
          ]}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="filter-from" className={labelClassName}>
          De
        </label>
        <DatePicker
          id="filter-from"
          value={filters.from}
          max={filters.to}
          onChange={(from) => {
            update({ from });
          }}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="filter-to" className={labelClassName}>
          Até
        </label>
        <DatePicker
          id="filter-to"
          value={filters.to}
          min={filters.from}
          onChange={(to) => {
            update({ to });
          }}
        />
      </div>

      <div className="flex items-end">
        {hasActiveFilters(filters) && (
          <Button
            variant="ghost"
            className="w-full motion-safe:animate-fade-up"
            onClick={() => {
              onChange({ page: 1, pageSize: filters.pageSize });
            }}
          >
            <X aria-hidden />
            Limpar filtros
          </Button>
        )}
      </div>
    </form>
  );
}
