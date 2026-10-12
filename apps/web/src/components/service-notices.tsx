import { CloudOff, Hourglass, RefreshCw } from 'lucide-react';
import { StateIcon } from './states';
import { Button } from './ui/button';

/** Análise demorando: a transação está salva e será processada quando o serviço voltar. */
export function DelayedAnalysisNotice({ plural = false }: { plural?: boolean }) {
  return (
    <div
      role="status"
      className="flex gap-3 rounded-xl border border-amber-200/80 bg-amber-50/80 p-4 text-sm text-amber-900 motion-safe:animate-fade-up"
    >
      <span
        aria-hidden
        className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700"
      >
        <Hourglass className="size-4 motion-safe:animate-pulse" />
      </span>
      <div className="flex flex-col gap-1">
        <p className="font-semibold">A análise antifraude está demorando mais que o normal.</p>
        <p className="text-amber-800">
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
    <div role="alert" className="flex flex-col items-center gap-2 px-6 py-14 text-center">
      <StateIcon>
        <CloudOff />
      </StateIcon>
      <p className="font-semibold text-slate-900">O serviço está temporariamente indisponível</p>
      <p className="max-w-md text-sm text-slate-600">
        Estamos tentando reconectar automaticamente e os dados aparecem aqui assim que o serviço
        voltar. Nenhuma transação já registrada é perdida.
      </p>
      <p className="mt-1 flex items-center gap-2 text-xs font-medium text-slate-500">
        <RefreshCw
          aria-hidden
          className="size-3.5 motion-safe:animate-spin [animation-duration:2s]"
        />
        Tentando reconectar…
      </p>
      <Button variant="secondary" className="mt-3" onClick={onRetry}>
        Tentar agora
      </Button>
    </div>
  );
}
