'use client';

import { MutationCache, QueryCache, QueryClientProvider } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { ApiError } from '@/lib/api-client';
import { createQueryClient } from '@/lib/query-client';

export function Providers({ children }: { children: ReactNode }) {
  const router = useRouter();

  const [queryClient] = useState(() => {
    const redirectToLoginOnUnauthorized = (error: unknown) => {
      if (!(error instanceof ApiError) || error.status !== 401) return;
      const next = `${window.location.pathname}${window.location.search}`;
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    };
    return createQueryClient({
      queryCache: new QueryCache({ onError: redirectToLoginOnUnauthorized }),
      mutationCache: new MutationCache({ onError: redirectToLoginOnUnauthorized }),
    });
  });

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
