import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Transações',
  description: 'Dashboard de transações com validação antifraude',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen">
        <header className="border-b border-slate-200 bg-white">
          <nav
            aria-label="Principal"
            className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3"
          >
            <Link href="/transactions" className="font-semibold text-slate-900">
              Transações
            </Link>
            <Link
              href="/transactions/new"
              className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500"
            >
              Nova transação
            </Link>
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">
          <Providers>{children}</Providers>
        </main>
      </body>
    </html>
  );
}
