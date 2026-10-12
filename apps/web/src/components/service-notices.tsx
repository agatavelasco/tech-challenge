import { Button } from './ui/button';

/** Análise demorando: a transação está salva e será processada quando o serviço voltar. */
export function DelayedAnalysisNotice({ plural = false }: { plural?: boolean }) {
  return (
    <div
      role="status"
      className="flex gap-3 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
    >
      <span aria-hidden className="mt-1 size-2 shrink-0 animate-pulse rounded-full bg-amber-500" />
      <div className="flex flex-col gap-1">
        <p className="font-medium">A análise antifraude está demorando mais que o normal.</p>
        <p>
          O serviço de análise pode estar temporariamente indisponível ou voltando ao ar.{' '}
          {plural
            ? 'As transações estão registradas e serão analisadas'
            : 'Sua transação está registrada e será analisada'}{' '}
          automaticamente assim que ele retornar — não é preciso criá-la de novo. O status aparece
          aqui sozinho.
        </p>
      </div>
    </div>
  );
}

/** Serviço fora do ar: a tela tenta reconectar sozinha e avisa que vai voltar. */
export function ServiceUnavailableState({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 p-10 text-center">
      <p className="font-medium text-slate-900">O serviço está temporariamente indisponível</p>
      <p className="max-w-md text-sm text-slate-600">
        Estamos tentando reconectar automaticamente e os dados aparecem aqui assim que o serviço
        voltar. Nenhuma transação já registrada é perdida.
      </p>
      <p className="flex items-center gap-2 text-xs text-slate-500">
        <span aria-hidden className="size-2 animate-pulse rounded-full bg-slate-400" />
        Tentando reconectar…
      </p>
      <Button variant="secondary" onClick={onRetry}>
        Tentar agora
      </Button>
    </div>
  );
}
