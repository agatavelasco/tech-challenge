import Link from 'next/link';
import type { ReactNode } from 'react';
import { LogoutButton } from '@/components/auth/logout-button';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="border-b border-slate-200 bg-white">
        <nav
          aria-label="Principal"
          className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3"
        >
          <Link href="/transactions" className="font-semibold text-slate-900">
            Transações
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/transactions/new"
              className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500"
            >
              Nova transação
            </Link>
            <LogoutButton />
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </>
  );
}
