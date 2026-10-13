'use client';

import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';

interface DatePickerProps {
  id?: string;
  value?: string | undefined;
  onChange: (value: string | undefined) => void;
  min?: string | undefined;
  max?: string | undefined;
  placeholder?: string;
}

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const WEEKDAY_NAMES = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const monthFormat = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });
const longFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' });
const shortFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' });

function parseIsoDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function toIsoDate(date: Date): string {
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${String(date.getFullYear())}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function monthGrid(month: Date): Date[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

export function DatePicker({
  id,
  value,
  onChange,
  min,
  max,
  placeholder = 'dd/mm/aaaa',
}: DatePickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const selected = parseIsoDate(value);
  const [visibleMonth, setVisibleMonth] = useState(() => selected ?? new Date());

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
    };
  }, [open]);

  const today = toIsoDate(new Date());
  const isOutOfRange = (iso: string) =>
    (min !== undefined && iso < min) || (max !== undefined && iso > max);

  const choose = (iso: string | undefined) => {
    onChange(iso);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const shiftMonth = (delta: number) => {
    setVisibleMonth((month) => new Date(month.getFullYear(), month.getMonth() + delta, 1));
  };

  return (
    <div
      ref={containerRef}
      className="relative"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          event.preventDefault();
          setOpen(false);
          triggerRef.current?.focus();
        }
      }}
    >
      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          if (!open) setVisibleMonth(selected ?? new Date());
          setOpen((current) => !current);
        }}
        className="flex h-10 w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-left text-sm text-slate-900 shadow-xs transition-colors hover:border-slate-300 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 focus:outline-none aria-expanded:border-brand-500 aria-expanded:ring-4 aria-expanded:ring-brand-500/15"
      >
        <CalendarDays
          aria-hidden
          className={cn('size-4 shrink-0', selected ? 'text-brand-600' : 'text-slate-400')}
        />
        <span className={cn('flex-1 tabular-nums', !selected && 'text-slate-400')}>
          {selected ? shortFormat.format(selected) : placeholder}
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Escolher data"
          className="absolute top-full left-0 z-30 mt-1.5 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-lg shadow-slate-900/10 motion-safe:animate-fade-up"
        >
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              aria-label="Mês anterior"
              onClick={() => {
                shiftMonth(-1);
              }}
              className="flex size-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            >
              <ChevronLeft aria-hidden className="size-4" />
            </button>
            <p aria-live="polite" className="text-sm font-semibold text-slate-900">
              {capitalize(monthFormat.format(visibleMonth))}
            </p>
            <button
              type="button"
              aria-label="Próximo mês"
              onClick={() => {
                shiftMonth(1);
              }}
              className="flex size-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            >
              <ChevronRight aria-hidden className="size-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 text-center">
            {WEEKDAYS.map((weekday, index) => (
              <abbr
                key={WEEKDAY_NAMES[index]}
                title={WEEKDAY_NAMES[index]}
                className="pb-1 text-[11px] font-semibold text-slate-400 no-underline"
              >
                {weekday}
              </abbr>
            ))}

            {monthGrid(visibleMonth).map((day) => {
              const iso = toIsoDate(day);
              const inMonth = day.getMonth() === visibleMonth.getMonth();
              const isSelected = iso === value;
              const isToday = iso === today;
              const disabled = isOutOfRange(iso);
              return (
                <button
                  key={iso}
                  type="button"
                  disabled={disabled}
                  aria-pressed={isSelected}
                  aria-label={longFormat.format(day)}
                  onClick={() => {
                    choose(iso);
                  }}
                  className={cn(
                    'relative flex h-9 items-center justify-center rounded-lg text-sm tabular-nums transition-colors',
                    inMonth ? 'text-slate-700' : 'text-slate-300',
                    !isSelected && !disabled && 'hover:bg-brand-50 hover:text-brand-700',
                    isToday && !isSelected && 'font-semibold text-brand-600',
                    isSelected &&
                      'bg-brand-600 font-semibold text-white shadow-sm shadow-brand-900/20',
                    disabled && 'cursor-not-allowed text-slate-200 line-through',
                  )}
                >
                  {day.getDate()}
                  {isToday && !isSelected && (
                    <span
                      aria-hidden
                      className="absolute bottom-1 size-1 rounded-full bg-brand-500"
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex justify-between border-t border-slate-100 pt-2">
            <button
              type="button"
              disabled={isOutOfRange(today)}
              onClick={() => {
                choose(today);
              }}
              className="rounded-md px-2 py-1 text-sm font-semibold text-brand-600 hover:bg-brand-50 disabled:text-slate-300"
            >
              Hoje
            </button>
            <button
              type="button"
              disabled={!value}
              onClick={() => {
                choose(undefined);
              }}
              className="rounded-md px-2 py-1 text-sm font-medium text-slate-500 hover:bg-slate-100 disabled:text-slate-300"
            >
              Limpar data
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
