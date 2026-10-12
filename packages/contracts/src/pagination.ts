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
    page: z.coerce
      .number({ error: 'A página deve ser um número' })
      .int('A página deve ser um número inteiro')
      .min(1, 'A página deve ser 1 ou maior')
      .default(1),
    pageSize: z.coerce
      .number({ error: 'O tamanho da página deve ser um número' })
      .int('O tamanho da página deve ser um número inteiro')
      .min(1, 'O tamanho da página deve ser 1 ou maior')
      .max(MAX_PAGE_SIZE, `O tamanho da página deve ser no máximo ${String(MAX_PAGE_SIZE)}`)
      .default(DEFAULT_PAGE_SIZE),
    status: z
      .enum(transactionStatusSchema.options, {
        error: 'Status inválido: use pending, approved ou rejected',
      })
      .optional(),
    transferTypeId: z.coerce
      .number({ error: 'O tipo de transferência deve ser um número' })
      .int('Tipo de transferência inválido')
      .positive('Tipo de transferência inválido')
      .optional(),
    createdFrom: z.iso
      .datetime('Data inicial inválida: use o formato ISO 8601 (ex.: 2026-10-01T00:00:00Z)')
      .optional(),
    createdTo: z.iso
      .datetime('Data final inválida: use o formato ISO 8601 (ex.: 2026-10-31T23:59:59Z)')
      .optional(),
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
