import { cn } from '@/lib/cn';
import { Button } from '../ui/button';

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
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

export function Pagination({ page, pageSize, total, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const firstItem = (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, total);

  return (
    <nav
      aria-label="Paginação"
      className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row"
    >
      <p className="text-sm text-slate-600">
        Mostrando <strong>{firstItem}</strong>–<strong>{lastItem}</strong> de{' '}
        <strong>{total}</strong>
      </p>
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
                className={cn('min-w-8')}
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
          </Button>
        </li>
      </ul>
    </nav>
  );
}
