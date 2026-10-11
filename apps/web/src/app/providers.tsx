'use client';

import { MutationCache, QueryCache, QueryClientProvider } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { z } from 'zod';
import { ApiError } from '@/lib/api-client';
import { createQueryClient } from '@/lib/query-client';

// Mensagens padrão do zod em português, para erros sem mensagem própria no schema.
z.config(z.locales.ptBR());

export function Providers({ children }: { children: ReactNode }) {
  const router = useRouter();

  // Um cliente por montagem: nunca compartilhado entre requisições no servidor.
  const [queryClient] = useState(() => {
    // Sessão expirada no meio do uso: volta para o login e retorna à mesma tela depois.
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
