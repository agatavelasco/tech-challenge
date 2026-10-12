import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import {
  isPageSizeOption,
  PAGE_SIZE_OPTIONS,
  type PageSizeOption,
} from '@/lib/transaction-filters';
import { Button } from '../ui/button';

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: PageSizeOption) => void;
}

const SIBLINGS = 1;

/** Primeira, última e as vizinhas da atual; `null` marca um intervalo omitido. */
export function visiblePages(page: number, totalPages: number): (number | null)[] {
  const pages: (number | null)[] = [];
  for (let candidate = 1; candidate <= totalPages; candidate++) {
    const isEdge = candidate === 1 || candidate === totalPages;
    const isNear = Math.abs(candidate - page) <= SIBLINGS;
    if (isEdge || isNear) pages.push(candidate);
    else if (pages.at(-1) !== null) pages.push(null);
  }
  return pages;
}

export function Pagination({
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  // Com até 10 itens, nenhuma opção muda o que aparece na tela.
  if (total <= PAGE_SIZE_OPTIONS[0]) return null;

  const firstItem = (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, total);

  return (
    <nav
      aria-label="Paginação"
      className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/50 px-5 py-3 sm:flex-row"
    >
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-500">
        <p>
          Mostrando{' '}
          <strong className="font-semibold text-slate-900 tabular-nums">
            {firstItem}–{lastItem}
          </strong>{' '}
          de <strong className="font-semibold text-slate-900 tabular-nums">{total}</strong>
        </p>
        <label className="flex items-center gap-2">
          Itens por página
          <select
            className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-sm font-medium text-slate-700 shadow-xs focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 focus:outline-none"
            value={pageSize}
            onChange={(event) => {
              const next = Number(event.target.value);
              if (isPageSizeOption(next)) onPageSizeChange(next);
            }}
          >
            {PAGE_SIZE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>
      {totalPages > 1 && (
        <ul className="flex items-center gap-1">
          <li>
            <Button
              variant="ghost"
              size="sm"
              disabled={page === 1}
              onClick={() => {
                onPageChange(page - 1);
              }}
            >
              <ChevronLeft aria-hidden />
              Anterior
            </Button>
          </li>
          {visiblePages(page, totalPages).map((candidate, index) =>
            candidate === null ? (
              <li key={`gap-${String(index)}`} aria-hidden className="px-2 text-slate-400">
                …
              </li>
            ) : (
              <li key={candidate}>
                <Button
                  variant={candidate === page ? 'primary' : 'ghost'}
                  size="sm"
                  aria-current={candidate === page ? 'page' : undefined}
                  aria-label={`Página ${String(candidate)}`}
                  className={cn('min-w-8 tabular-nums', candidate !== page && 'text-slate-600')}
                  onClick={() => {
                    onPageChange(candidate);
                  }}
                >
                  {candidate}
                </Button>
              </li>
            ),
          )}
          <li>
            <Button
              variant="ghost"
              size="sm"
              disabled={page === totalPages}
              onClick={() => {
                onPageChange(page + 1);
              }}
            >
              Próxima
              <ChevronRight aria-hidden />
            </Button>
          </li>
        </ul>
      )}
    </nav>
  );
}
