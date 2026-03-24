import { useState } from 'react';
import { BookOpen, ChevronDown, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const GUIDE_ITEMS = [
  {
    emoji: '🎯',
    title: 'Hit Rate @10',
    text: 'Dos produtos que você esperava encontrar, quantos apareceram nos 10 primeiros resultados? 100% = perfeito.',
  },
  {
    emoji: '🏆',
    title: 'MRR (Rank Recíproco)',
    text: 'O primeiro resultado correto apareceu em qual posição? MRR 1.0 = primeiro resultado é correto. MRR 0.5 = apareceu em segundo.',
  },
  {
    emoji: '📊',
    title: 'Cobertura',
    text: 'Em quantas buscas pelo menos um resultado esperado foi encontrado? Indica quantas keywords a busca "entende".',
  },
  {
    emoji: '📍',
    title: 'Posição Média',
    text: 'Em média, em que posição os resultados corretos aparecem. Menor é melhor (1 = topo).',
  },
  {
    emoji: '✅',
    title: 'Match Perfeito',
    text: 'Em quantas buscas TODOS os produtos esperados foram encontrados. É a métrica mais rigorosa.',
  },
  {
    emoji: '🔄',
    title: 'Comparação entre motores',
    text: 'O primeiro motor é sempre o "baseline" (referência). Os demais mostram a diferença (+ ou −) em relação a ele.',
  },
];

export function HowToReadReport() {
  const [open, setOpen] = useState(false);

  return (
    <Card className="border-border/50">
      <button
        onClick={() => setOpen(!open)}
        className="w-full p-4 flex items-center gap-2 text-left hover:bg-muted/30 transition-colors rounded-lg"
      >
        <BookOpen className="h-4 w-4 text-primary shrink-0" />
        <span className="text-sm font-medium text-foreground">Como ler este relatório</span>
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground ml-auto" /> : <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />}
      </button>
      {open && (
        <CardContent className="pt-0 pb-4 px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {GUIDE_ITEMS.map(item => (
              <div key={item.title} className="p-3 rounded-md bg-muted/30 border border-border/50">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-sm">{item.emoji}</span>
                  <span className="text-xs font-semibold text-foreground">{item.title}</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
