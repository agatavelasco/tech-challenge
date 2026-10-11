'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { z } from 'zod';
import { createQueryClient } from '@/lib/query-client';

// Mensagens padrão do zod em português, para erros sem mensagem própria no schema.
z.config(z.locales.ptBR());

export function Providers({ children }: { children: ReactNode }) {
  // Um cliente por montagem: nunca compartilhado entre requisições no servidor.
  const [queryClient] = useState(createQueryClient);
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
