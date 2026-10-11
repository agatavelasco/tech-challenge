import { vi } from 'vitest';

/**
 * Substitui o roteador do Next nos testes: a URL é um estado em memória, e
 * replace/push a alteram como no navegador.
 */
export const navigation = {
  pathname: '/transactions',
  searchParams: new URLSearchParams(),
  params: {} as Record<string, string>,
  push: vi.fn((href: string) => {
    navigation.setUrl(href);
  }),
  replace: vi.fn((href: string) => {
    navigation.setUrl(href);
  }),
  setUrl(href: string) {
    const url = new URL(href, 'http://localhost');
    navigation.pathname = url.pathname;
    navigation.searchParams = url.searchParams;
  },
  reset() {
    navigation.setUrl('/transactions');
    navigation.params = {};
    navigation.push.mockClear();
    navigation.replace.mockClear();
  },
};
