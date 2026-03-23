import { useState } from 'react';
import { VariantResult } from '@/types/experiment';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ChevronDown, ChevronRight, Check, X, Search } from 'lucide-react';

interface Props {
  results: VariantResult[];
}

export function KeywordBreakdown({ results }: Props) {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  if (results.length === 0) return null;

  const keywords = results[0].keywordResults.map(kr => kr.keyword);
  const filtered = keywords.filter(k => k.toLowerCase().includes(search.toLowerCase()));

  const toggle = (k: string) => {
    const next = new Set(expanded);
    next.has(k) ? next.delete(k) : next.add(k);
    setExpanded(next);
  };

  const colTemplate = `2fr ${results.map(() => '1fr').join(' ')}`;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-sm">Análise por Keyword</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Filtrar keywords..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-8 text-sm" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border border-border overflow-x-auto">
          {/* Header */}
          <div className="grid bg-muted/50 p-3 text-xs text-muted-foreground font-medium min-w-[600px]" style={{ gridTemplateColumns: colTemplate }}>
            <span>Keyword</span>
            {results.map(r => (
              <span key={r.variant.id} className="text-center flex items-center justify-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: `hsl(${r.variant.color})` }} />
                <span className="truncate">{r.variant.name}</span>
              </span>
            ))}
          </div>

          {/* Rows */}
          {filtered.map(keyword => {
            const isExpanded = expanded.has(keyword);

            return (
              <div key={keyword}>
                <div
                  className="grid p-3 text-sm border-t border-border hover:bg-muted/30 cursor-pointer transition-colors min-w-[600px]"
                  style={{ gridTemplateColumns: colTemplate }}
                  onClick={() => toggle(keyword)}
                >
                  <div className="flex items-center gap-2">
                    {isExpanded ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                    <span className="font-medium">{keyword}</span>
                  </div>
                  {results.map(r => {
                    const kr = r.keywordResults.find(k => k.keyword === keyword)!;
                    return (
                      <div key={r.variant.id} className="text-center">
                        <span className={`font-mono-data text-sm font-semibold ${kr.hitRate === 1 ? 'text-success' : kr.hitRate > 0 ? 'text-warning' : 'text-danger'}`}>
                          {(kr.hitRate * 100).toFixed(0)}%
                        </span>
                        <span className="text-[10px] text-muted-foreground ml-1">
                          ({kr.foundIds.length}/{kr.expectedIds.length})
                        </span>
                      </div>
                    );
                  })}
                </div>

                {isExpanded && (
                  <div className="border-t border-border bg-muted/20 p-4">
                    <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${results.length}, 1fr)` }}>
                      {results.map(r => {
                        const kr = r.keywordResults.find(k => k.keyword === keyword)!;
                        return (
                          <div key={r.variant.id} className="space-y-3">
                            <div className="flex items-center gap-2 pb-2 border-b border-border">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: `hsl(${r.variant.color})` }} />
                              <span className="text-xs font-semibold">{r.variant.name}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div><span className="text-muted-foreground">MRR:</span> <span className="font-mono-data font-medium">{kr.mrr.toFixed(3)}</span></div>
                              <div><span className="text-muted-foreground">Pos. Média:</span> <span className="font-mono-data font-medium">{kr.avgPosition?.toFixed(1) || 'N/A'}</span></div>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Top 10 resultados</p>
                              {kr.hits.slice(0, 10).map((hit, i) => {
                                const isExpected = kr.expectedIds.includes(hit.productId);
                                return (
                                  <div key={i} className={`flex items-center gap-2 text-xs py-1 px-2 rounded ${isExpected ? 'bg-success/10' : ''}`}>
                                    <span className="text-muted-foreground w-4 text-right font-mono-data">{hit.position}.</span>
                                    <span className={`font-mono-data ${isExpected ? 'text-success font-semibold' : ''}`}>{hit.productId}</span>
                                    {hit.score && <span className="text-muted-foreground/50 ml-auto font-mono-data">{hit.score.toFixed(1)}</span>}
                                    {isExpected && <Check className="h-3 w-3 text-success shrink-0" />}
                                  </div>
                                );
                              })}
                              {kr.missingIds.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-border/50">
                                  <p className="text-[10px] text-danger flex items-center gap-1 mb-1">
                                    <X className="h-3 w-3" /> Não encontrados no top 10
                                  </p>
                                  {kr.missingIds.map(id => (
                                    <span key={id} className="text-xs font-mono-data text-danger/70 block pl-4">{id}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
