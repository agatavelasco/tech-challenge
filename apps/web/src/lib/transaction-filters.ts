import {
  DEFAULT_PAGE_SIZE,
  transactionStatusSchema,
  type ListTransactionsQuery,
  type TransactionStatus,
} from '@tech-challenge/contracts';
import { z } from 'zod';

/** Tamanhos de página oferecidos na listagem; o primeiro é o padrão. */
export const PAGE_SIZE_OPTIONS = [DEFAULT_PAGE_SIZE, 20, 30] as const;
export type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number];

export function isPageSizeOption(value: number): value is PageSizeOption {
  return (PAGE_SIZE_OPTIONS as readonly number[]).includes(value);
}

/** Filtros como aparecem na URL: compartilháveis e preservados pelo botão voltar. */
export interface TransactionFilters {
  page: number;
  /** Ausente = padrão (10). */
  pageSize?: PageSizeOption | undefined;
  status?: TransactionStatus | undefined;
  transferTypeId?: number | undefined;
  /** Datas no formato do <input type="date">: AAAA-MM-DD. */
  from?: string | undefined;
  to?: string | undefined;
}

const dateOnly = z.iso.date();

// URL editada à mão não pode quebrar a tela: valor inválido vira "sem filtro".
const filtersFromUrlSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  // Só os tamanhos oferecidos na tela; qualquer outro volta ao padrão.
  pageSize: z.coerce
    .number()
    .refine(isPageSizeOption)
    .transform((value) => (value === DEFAULT_PAGE_SIZE ? undefined : value))
    .optional()
    .catch(undefined),
  status: transactionStatusSchema.optional().catch(undefined),
  transferTypeId: z.coerce.number().int().positive().optional().catch(undefined),
  from: dateOnly.optional().catch(undefined),
  to: dateOnly.optional().catch(undefined),
});

export function parseFilters(searchParams: URLSearchParams): TransactionFilters {
  return filtersFromUrlSchema.parse(Object.fromEntries(searchParams));
}

export function filtersToSearchParams(filters: TransactionFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.page > 1) params.set('page', String(filters.page));
  if (filters.pageSize && filters.pageSize !== DEFAULT_PAGE_SIZE) {
    params.set('pageSize', String(filters.pageSize));
  }
  if (filters.status) params.set('status', filters.status);
  if (filters.transferTypeId !== undefined)
    params.set('transferTypeId', String(filters.transferTypeId));
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  return params;
}

export function hasActiveFilters(filters: TransactionFilters): boolean {
  return Boolean(filters.status ?? filters.transferTypeId ?? filters.from ?? filters.to);
}

/** O período é escolhido em dias do fuso de quem usa: do início do "de" ao fim do "até". */
export function filtersToQuery(filters: TransactionFilters): Partial<ListTransactionsQuery> {
  return {
    page: filters.page,
    pageSize: filters.pageSize ?? DEFAULT_PAGE_SIZE,
    status: filters.status,
    transferTypeId: filters.transferTypeId,
    createdFrom: filters.from && new Date(`${filters.from}T00:00:00`).toISOString(),
    createdTo: filters.to && new Date(`${filters.to}T23:59:59.999`).toISOString(),
  };
}
