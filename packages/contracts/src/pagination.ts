import { z } from 'zod';
import { transactionSchema, transactionStatusSchema } from './transaction.js';

export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;

/**
 * Query string chega como texto: os campos numéricos e de data são convertidos
 * aqui para que o mesmo schema sirva à API e aos filtros do dashboard.
 */
export const listTransactionsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
    status: transactionStatusSchema.optional(),
    transferTypeId: z.coerce.number().int().positive().optional(),
    createdFrom: z.iso.datetime().optional(),
    createdTo: z.iso.datetime().optional(),
  })
  .refine(
    (query) =>
      query.createdFrom === undefined ||
      query.createdTo === undefined ||
      Date.parse(query.createdFrom) <= Date.parse(query.createdTo),
    { message: 'A data inicial deve ser anterior à final', path: ['createdTo'] },
  );
export type ListTransactionsQuery = z.infer<typeof listTransactionsQuerySchema>;

export const paginationMetaSchema = z.object({
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
});
export type PaginationMeta = z.infer<typeof paginationMetaSchema>;

export const transactionPageSchema = z.object({
  data: z.array(transactionSchema),
  meta: paginationMetaSchema,
});
export type TransactionPage = z.infer<typeof transactionPageSchema>;
