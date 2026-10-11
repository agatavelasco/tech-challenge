'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { Button } from '../ui/button';

export function LogoutButton() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const logout = async () => {
    await apiClient.logout();
    // Nada da sessão anterior pode aparecer para o próximo usuário.
    queryClient.clear();
    router.replace('/login');
  };

  return (
    <Button variant="ghost" onClick={() => void logout()}>
      Sair
    </Button>
  );
}
