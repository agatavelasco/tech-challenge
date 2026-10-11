import type { ReactNode } from 'react';
import { Button } from './ui/button';

export function LoadingState({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="flex flex-col gap-3 p-6">
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} className="h-10 animate-pulse rounded-md bg-slate-100" />
      ))}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 p-10 text-center">
      <p className="font-medium text-slate-900">Não foi possível carregar os dados</p>
      <p className="text-sm text-slate-600">{message}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
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
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 p-10 text-center">
      <p className="font-medium text-slate-900">{title}</p>
      <p className="text-sm text-slate-600">{description}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
