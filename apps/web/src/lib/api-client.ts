import {
  type LoginInput,
  transactionPageSchema,
  transactionSchema,
  transferTypeSchema,
  type CreateTransactionInput,
  type ListTransactionsQuery,
  type Transaction,
  type TransactionPage,
  type TransferType,
} from '@tech-challenge/contracts';
import { z } from 'zod';

export type FieldErrors = Partial<Record<string, string[]>>;

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly fieldErrors: FieldErrors = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const errorBodySchema = z.object({
  message: z.union([z.string(), z.array(z.string())]).optional(),
  errors: z.record(z.string(), z.array(z.string())).optional(),
});

const DEFAULT_ERROR_MESSAGE = 'Algo deu errado. Tente novamente.';

async function request<T>(path: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> {
  const url = new URL(`/api${path}`, window.location.origin);

  const headers = new Headers(init?.headers);
  headers.set('accept', 'application/json');

  let response: Response;
  try {
    response = await fetch(url, { ...init, headers });
  } catch {
    throw new ApiError(0, 'Não foi possível conectar ao servidor. Verifique sua conexão.');
  }

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const parsed = errorBodySchema.safeParse(body);
    const message = parsed.success ? parsed.data.message : undefined;
    throw new ApiError(
      response.status,
      (Array.isArray(message) ? message[0] : message) ?? DEFAULT_ERROR_MESSAGE,
      parsed.success ? (parsed.data.errors ?? {}) : {},
    );
  }

  return schema.parse(body);
}

function toSearchParams(query: Partial<ListTransactionsQuery>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query) as [string, string | number | undefined][]) {
    if (value !== undefined) params.set(key, String(value));
  }
  return params.toString();
}

export const apiClient = {
  listTransactions: (query: Partial<ListTransactionsQuery>): Promise<TransactionPage> =>
    request(`/transactions?${toSearchParams(query)}`, transactionPageSchema),

  getTransaction: (transactionExternalId: string): Promise<Transaction> =>
    request(`/transactions/${encodeURIComponent(transactionExternalId)}`, transactionSchema),

  createTransaction: (input: CreateTransactionInput): Promise<Transaction> =>
    request('/transactions', transactionSchema, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    }),

  listTransferTypes: (): Promise<TransferType[]> =>
    request('/transfer-types', z.array(transferTypeSchema)),

  login: (input: LoginInput): Promise<null> =>
    request('/auth/login', z.null(), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    }),

  logout: (): Promise<null> => request('/auth/logout', z.null(), { method: 'POST' }),
};
