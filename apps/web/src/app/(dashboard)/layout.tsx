import { ArrowLeftRight, Plus } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { LogoutButton } from '@/components/auth/logout-button';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/75">
        <div aria-hidden className="h-0.5 bg-brand-600" />
        <nav
          aria-label="Principal"
          className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6"
        >
          <div className="flex items-center gap-4">
            <Link
              href="/transactions"
              className="flex items-center gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-600"
            >
              <Image src="/biud-logo.svg" alt="BIUD" width={72} height={26} priority unoptimized />
              <span aria-hidden className="h-5 w-px bg-slate-200" />
              <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                <ArrowLeftRight aria-hidden className="size-4 text-brand-600" />
                Transações
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <Link
              href="/transactions/new"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 text-sm font-semibold text-white shadow-sm shadow-brand-900/10 transition-colors hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
            >
              <Plus aria-hidden className="size-4" />
              Nova transação
            </Link>
            <LogoutButton />
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">{children}</main>
    </>
  );
}
