import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api-client';

/** Erro do cliente (4xx) não melhora com nova tentativa; rede e 5xx podem melhorar. */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
  return failureCount < 2;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: shouldRetry, staleTime: 5_000, refetchOnWindowFocus: true },
    },
  });
}
