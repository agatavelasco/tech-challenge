import { TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from './ui/button';

export function LoadingState({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="flex flex-col divide-y divide-slate-100">
      {Array.from({ length: 6 }, (_, index) => (
        <div
          key={index}
          className="flex items-center gap-4 px-5 py-4 motion-safe:animate-pulse"
          style={{ animationDelay: `${String(index * 90)}ms` }}
        >
          <div className="h-3 w-20 rounded-full bg-slate-200/80" />
          <div className="h-3 w-16 rounded-full bg-slate-100" />
          <div className="ml-auto h-3 w-24 rounded-full bg-slate-200/80" />
          <div className="h-6 w-24 rounded-full bg-slate-100" />
          <div className="hidden h-3 w-28 rounded-full bg-slate-100 sm:block" />
        </div>
      ))}
    </div>
  );
}

/** Ícone grande num quadro suave: dá rosto aos estados sem ilustração genérica. */
export function StateIcon({
  children,
  tone = 'slate',
}: {
  children: ReactNode;
  tone?: 'slate' | 'brand' | 'red';
}) {
  const tones = {
    slate: 'bg-slate-100 text-slate-500 ring-slate-200',
    brand: 'bg-brand-50 text-brand-600 ring-brand-100',
    red: 'bg-red-50 text-red-600 ring-red-100',
  };
  return (
    <div
      aria-hidden
      className={`mb-2 flex size-14 items-center justify-center rounded-2xl ring-1 ring-inset [&_svg]:size-6 ${tones[tone]}`}
    >
      {children}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-2 px-6 py-14 text-center">
      <StateIcon tone="red">
        <TriangleAlert />
      </StateIcon>
      <p className="font-semibold text-slate-900">Não foi possível carregar os dados</p>
      <p className="max-w-sm text-sm text-slate-600">{message}</p>
      {onRetry && (
        <Button variant="secondary" className="mt-3" onClick={onRetry}>
          Tentar novamente
        </Button>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-14 text-center motion-safe:animate-fade-up">
      {icon && <StateIcon tone="brand">{icon}</StateIcon>}
      <p className="font-semibold text-slate-900">{title}</p>
      <p className="max-w-sm text-sm text-slate-600">{description}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
