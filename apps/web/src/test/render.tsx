import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderResult } from '@testing-library/react';
import type { ReactElement } from 'react';

export function renderWithProviders(ui: ReactElement): RenderResult & { queryClient: QueryClient } {
  // Sem novas tentativas: o teste de erro não deve esperar o backoff.
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const result = render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
  return { ...result, queryClient };
}
