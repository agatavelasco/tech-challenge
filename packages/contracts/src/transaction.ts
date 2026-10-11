import { z } from 'zod';

export const TRANSACTION_STATUSES = ['pending', 'approved', 'rejected'] as const;
export const transactionStatusSchema = z.enum(TRANSACTION_STATUSES);
export type TransactionStatus = z.infer<typeof transactionStatusSchema>;

/** Valores acima deste limite são rejeitados pelo antifraude. */
export const ANTI_FRAUD_MAX_APPROVED_VALUE = 1000;

const CENTS_TOLERANCE = 1e-9;

function hasAtMostTwoDecimals(value: number): boolean {
  const cents = value * 100;
  return Math.abs(cents - Math.round(cents)) < CENTS_TOLERANCE;
}

export const transactionValueSchema = z
  .number()
  .positive('O valor deve ser maior que zero')
  .max(999_999_999_999.99, 'Valor acima do máximo suportado')
  .refine(hasAtMostTwoDecimals, 'O valor deve ter no máximo duas casas decimais');

export const createTransactionSchema = z
  .object({
    accountExternalIdDebit: z.guid('Conta de débito inválida'),
    accountExternalIdCredit: z.guid('Conta de crédito inválida'),
    transferTypeId: z.number().int().positive('Tipo de transferência inválido'),
    value: transactionValueSchema,
  })
  .refine((input) => input.accountExternalIdDebit !== input.accountExternalIdCredit, {
    message: 'As contas de débito e crédito devem ser diferentes',
    path: ['accountExternalIdCredit'],
  });
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;

export const transactionSchema = z.object({
  transactionExternalId: z.guid(),
  transactionType: z.object({ id: z.number().int(), name: z.string() }),
  transactionStatus: z.object({ name: transactionStatusSchema }),
  value: z.number(),
  createdAt: z.iso.datetime(),
});
export type Transaction = z.infer<typeof transactionSchema>;

export const transferTypeSchema = z.object({
  id: z.number().int(),
  name: z.string(),
});
export type TransferType = z.infer<typeof transferTypeSchema>;
