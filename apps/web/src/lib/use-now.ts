'use client';

import { useEffect, useState } from 'react';

/**
 * Hora atual que se atualiza sozinha. Necessária para avisos que dependem do tempo
 * passado: o polling não re-renderiza a tela quando os dados vêm iguais.
 */
export function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, intervalMs);
    return () => {
      clearInterval(timer);
    };
  }, [intervalMs]);
  return now;
}
