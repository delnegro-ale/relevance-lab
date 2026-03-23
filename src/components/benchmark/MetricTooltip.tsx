import { HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface MetricTooltipProps {
  label: string;
  description: string;
  interpretation?: string;
}

export function MetricTooltip({ label, description, interpretation }: MetricTooltipProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
            <HelpCircle className="h-3 w-3" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs p-3 space-y-1.5">
          <p className="text-xs font-semibold text-foreground">{label}</p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">{description}</p>
          {interpretation && (
            <p className="text-[11px] text-primary/80 leading-relaxed italic">
              💡 {interpretation}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export const METRIC_EXPLANATIONS: Record<string, { description: string; interpretation: string }> = {
  hitRate: {
    description: 'Porcentagem dos produtos esperados que apareceram nos 10 primeiros resultados da busca.',
    interpretation: '100% = todos os produtos esperados foram encontrados. Quanto mais alto, melhor a busca está funcionando.',
  },
  mrr: {
    description: 'Mean Reciprocal Rank — mede quão cedo o primeiro resultado correto aparece na lista.',
    interpretation: '1.0 = o primeiro resultado já é correto. 0.5 = apareceu na 2ª posição. Quanto mais próximo de 1, melhor.',
  },
  coverage: {
    description: 'Porcentagem de keywords que retornaram pelo menos um resultado esperado no top 10.',
    interpretation: '100% = todas as buscas encontraram algo relevante. Valores baixos indicam keywords "cegas".',
  },
  avgPosition: {
    description: 'Posição média em que os produtos esperados aparecem nos resultados.',
    interpretation: 'Quanto menor (mais perto de 1), melhor. Posição 1 = topo dos resultados.',
  },
  perfectMatchRate: {
    description: 'Porcentagem de keywords em que TODOS os produtos esperados foram encontrados no top 10.',
    interpretation: '100% = a busca acertou todos os alvos em todas as keywords. O indicador mais exigente.',
  },
};
