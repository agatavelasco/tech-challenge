import { QueryClient, type QueryClientConfig } from '@tanstack/react-query';
import { ApiError } from './api-client';

function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
  return failureCount < 2;
}

export function createQueryClient(
  config: Omit<QueryClientConfig, 'defaultOptions'> = {},
): QueryClient {
  return new QueryClient({
    ...config,
    defaultOptions: {
      queries: { retry: shouldRetry, staleTime: 5_000, refetchOnWindowFocus: true },
    },
  });
}
