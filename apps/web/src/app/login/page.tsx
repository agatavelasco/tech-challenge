import { ArrowLeftRight, BadgeCheck, ShieldCheck } from 'lucide-react';
import Image from 'next/image';
import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/login-form';

const FLOW = [
  { icon: ArrowLeftRight, title: 'Transação criada' },
  { icon: ShieldCheck, title: 'Análise antifraude' },
  { icon: BadgeCheck, title: 'Status atualizado' },
];

export default function LoginPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-brand-600 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        {/* Logo em branco sobre a cor da marca. */}
        <Image
          src="/biud-logo.svg"
          alt="BIUD"
          width={112}
          height={40}
          priority
          unoptimized
          className="brightness-0 invert"
        />

        <div className="flex max-w-md flex-col gap-10">
          <p className="text-3xl leading-tight font-semibold tracking-tight">
            Transações validadas em tempo real, do registro à decisão.
          </p>
          <ol className="flex flex-col">
            {FLOW.map(({ icon: Icon, title }, index) => (
              <li key={title} className="relative flex gap-4 pb-6 last:pb-0">
                {index < FLOW.length - 1 && (
                  <span aria-hidden className="absolute top-10 bottom-0 left-5 w-px bg-white/25" />
                )}
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/12 ring-1 ring-white/25 ring-inset">
                  <Icon aria-hidden className="size-5" />
                </span>
                <span className="self-center font-semibold">{title}</span>
              </li>
            ))}
          </ol>
        </div>

        <p className="text-xs text-white/60">Desafio técnico BIUD</p>
        {/* Símbolo da marca, grande e vazado, como textura de fundo. */}
        <Image
          src="/biud-symbol.svg"
          alt=""
          aria-hidden
          width={420}
          height={460}
          unoptimized
          className="pointer-events-none absolute -right-24 -bottom-24 opacity-[0.08] brightness-0 invert"
        />
      </aside>

      <main className="flex items-center justify-center px-6 py-12">
        <div className="flex w-full max-w-sm flex-col gap-8">
          <Image
            src="/biud-logo.svg"
            alt="BIUD"
            width={88}
            height={32}
            priority
            unoptimized
            className="lg:hidden"
          />
          {/* O destino depois do login vem da URL (?next=), lida no cliente. */}
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
