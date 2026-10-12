import type { TransactionStatus } from '@tech-challenge/contracts';
import { ArrowLeftRight, CircleCheck, CircleDashed, CircleX, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/cn';

const timeFormat = new Intl.DateTimeFormat('pt-BR', { timeStyle: 'short' });

interface AnalysisTimelineProps {
  status: TransactionStatus;
  createdAt: string;
}

const RESULT = {
  pending: {
    icon: CircleDashed,
    node: 'bg-white text-slate-300 ring-slate-200 ring-dashed',
    fill: 'bg-slate-200',
    description: 'Aguardando',
  },
  approved: {
    icon: CircleCheck,
    node: 'bg-emerald-500 text-white ring-emerald-500 shadow-[0_0_0_6px] shadow-emerald-500/15',
    fill: 'bg-emerald-500',
    description: 'Dentro do limite',
  },
  rejected: {
    icon: CircleX,
    node: 'bg-red-500 text-white ring-red-500 shadow-[0_0_0_6px] shadow-red-500/15',
    fill: 'bg-red-500',
    description: 'Acima do limite',
  },
} satisfies Record<TransactionStatus, unknown>;

/**
 * Criada → Análise antifraude → Resultado. Os nós e conexões continuam no DOM quando
 * o status muda pelo polling, então a passagem de "em análise" para o resultado é uma
 * transição: o trecho final se preenche na cor da decisão e o ícone do resultado entra.
 */
export function AnalysisTimeline({ status, createdAt }: AnalysisTimelineProps) {
  const isPending = status === 'pending';
  const result = RESULT[status];
  const ResultIcon = result.icon;

  return (
    <ol aria-label="Andamento da análise" className="grid grid-cols-3 gap-2">
      <Step
        icon={<ArrowLeftRight />}
        nodeClassName="bg-brand-600 text-white ring-brand-600"
        label="Transação criada"
        description={timeFormat.format(new Date(createdAt))}
      />

      <Step
        connector={<span className="absolute inset-0 bg-brand-600" />}
        icon={<ShieldCheck />}
        nodeClassName={cn(
          'transition-colors duration-500',
          isPending
            ? 'bg-amber-50 text-amber-600 ring-amber-400'
            : 'bg-brand-600 text-white ring-brand-600',
        )}
        pulse={isPending}
        label="Análise antifraude"
        description={isPending ? 'Em andamento' : 'Concluída'}
      />

      <Step
        connector={
          <>
            {/* Em análise: faixas correndo, indicando trabalho em andamento. */}
            <span
              className={cn(
                'absolute inset-0 bg-[repeating-linear-gradient(90deg,var(--color-amber-400)_0_8px,transparent_8px_16px)] bg-[length:32px_100%] transition-opacity duration-300 motion-safe:animate-flow',
                isPending ? 'opacity-100' : 'opacity-0',
              )}
            />
            {/* Resolvida: o trecho se preenche da esquerda para a direita. */}
            <span
              className={cn(
                'absolute inset-y-0 left-0 transition-[width] duration-700 ease-out',
                result.fill,
                isPending ? 'w-0' : 'w-full',
              )}
            />
          </>
        }
        icon={
          <span key={status} className={cn(!isPending && 'motion-safe:animate-node-pop')}>
            <ResultIcon />
          </span>
        }
        nodeClassName={cn(
          'transition-[background-color,box-shadow] duration-500 delay-500',
          result.node,
        )}
        label="Resultado"
        description={result.description}
      />
    </ol>
  );
}

function Step({
  connector,
  icon,
  nodeClassName,
  pulse = false,
  label,
  description,
}: {
  connector?: React.ReactNode;
  icon: React.ReactNode;
  nodeClassName: string;
  pulse?: boolean;
  label: string;
  description: string;
}) {
  return (
    <li className="relative flex flex-col items-center gap-2 text-center">
      {connector && (
        <span
          aria-hidden
          className="absolute top-5 right-[calc(50%+1.75rem)] left-[calc(-50%+1.75rem)] h-1 -translate-y-1/2 overflow-hidden rounded-full bg-slate-100"
        >
          {connector}
        </span>
      )}
      <span
        aria-hidden
        className={cn(
          'relative flex size-10 items-center justify-center rounded-full ring-2 [&_svg]:size-5',
          nodeClassName,
        )}
      >
        {pulse && (
          <span className="absolute inset-0 rounded-full ring-2 ring-amber-400 motion-safe:animate-ping" />
        )}
        {icon}
      </span>
      <span className="flex flex-col">
        <span className="text-sm font-semibold text-slate-800">{label}</span>
        <span className="text-xs text-slate-500">{description}</span>
      </span>
    </li>
  );
}
