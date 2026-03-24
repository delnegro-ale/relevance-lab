import { useState, useMemo } from 'react';
import { VariantResult } from '@/types/experiment';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, X, Search, AlertTriangle, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { MetricTooltip } from './MetricTooltip';
import { ProductCardSimple } from './ProductCardSimple';

interface Props {
  results: VariantResult[];
}

type SortKey = 'keyword' | `variant-hitrate-${string}`;
type SortDir = 'asc' | 'desc';

export function KeywordBreakdown({ results }: Props) {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>('keyword');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const safeResults = results.filter(r => r && r.variant && Array.isArray(r.keywordResults));

  const keywords = safeResults.length > 0
    ? (safeResults[0].keywordResults || []).map(kr => kr?.keyword).filter(Boolean) as string[]
    : [];
  const filtered = keywords.filter(k => k.toLowerCase().includes(search.toLowerCase()));

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      if (sortKey === 'keyword') {
        const cmp = a.localeCompare(b, 'pt-BR', { sensitivity: 'base' });
        return sortDir === 'asc' ? cmp : -cmp;
      }
      // Sort by variant hitRate
      const variantId = sortKey.replace('variant-hitrate-', '');
      const vr = safeResults.find(r => r.variant.id === variantId);
      if (!vr) return 0;
      const krA = vr.keywordResults.find(k => k?.keyword === a);
      const krB = vr.keywordResults.find(k => k?.keyword === b);
      const valA = krA?.hitRate ?? -1;
      const valB = krB?.hitRate ?? -1;
      return sortDir === 'asc' ? valA - valB : valB - valA;
    });
    return arr;
  }, [filtered, sortKey, sortDir, safeResults]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir(key === 'keyword' ? 'asc' : 'desc');
    }
  };

  const toggle = (k: string) => {
    const next = new Set(expanded);
    next.has(k) ? next.delete(k) : next.add(k);
    setExpanded(next);
  };

  const colTemplate = `2fr ${safeResults.map(() => '1fr').join(' ')}`;

  const SortIcon = ({ colKey }: { colKey: SortKey }) => {
    if (sortKey !== colKey) return <ArrowUpDown className="h-3 w-3 text-muted-foreground/40" />;
    return sortDir === 'asc'
      ? <ArrowUp className="h-3 w-3 text-primary" />
      : <ArrowDown className="h-3 w-3 text-primary" />;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm">Análise por Keyword</CardTitle>
            <MetricTooltip
              label="Análise por Keyword"
              description="Mostra o desempenho de cada termo de busca individualmente. Clique em uma keyword para ver os resultados detalhados de cada variante."
              interpretation="Compare visualmente as capas e títulos para validar se a busca está retornando os produtos certos."
            />
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[10px]">{filtered.length} keywords</Badge>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Filtrar keywords..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-8 text-sm" />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border border-border overflow-x-auto">
          {/* Header */}
          <div className="grid bg-muted/50 p-3 text-xs text-muted-foreground font-medium min-w-[600px]" style={{ gridTemplateColumns: colTemplate }}>
            <button
              className="flex items-center gap-1 hover:text-foreground transition-colors text-left"
              onClick={() => handleSort('keyword')}
            >
              Keyword <SortIcon colKey="keyword" />
            </button>
            {safeResults.map(r => (
              <button
                key={r.variant.id}
                className="flex items-center justify-center gap-1.5 hover:text-foreground transition-colors"
                onClick={() => handleSort(`variant-hitrate-${r.variant.id}`)}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: `hsl(${r.variant.color || '0 0% 50%'})` }} />
                <span className="truncate">{r.variant.name}</span>
                <SortIcon colKey={`variant-hitrate-${r.variant.id}`} />
              </button>
            ))}
          </div>

          {/* Rows */}
          {sorted.map(keyword => {
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
                  {safeResults.map(r => {
                    const kr = (r.keywordResults || []).find(k => k?.keyword === keyword);
                    if (!kr) return <div key={r.variant.id} className="text-center text-xs text-muted-foreground">—</div>;
                    if (kr.error) {
                      return (
                        <div key={r.variant.id} className="text-center">
                          <span className="inline-flex items-center gap-1 text-xs text-destructive font-medium">
                            <AlertTriangle className="h-3 w-3" /> Erro
                          </span>
                        </div>
                      );
                    }
                    const hitRate = typeof kr.hitRate === 'number' && !isNaN(kr.hitRate) ? kr.hitRate : 0;
                    return (
                      <div key={r.variant.id} className="text-center">
                        <span className={`font-mono-data text-sm font-semibold ${hitRate === 1 ? 'text-success' : hitRate > 0 ? 'text-warning' : 'text-destructive'}`}>
                          {(hitRate * 100).toFixed(0)}%
                        </span>
                        <span className="text-[10px] text-muted-foreground ml-1">
                          ({(kr.foundIds || []).length}/{(kr.expectedIds || []).length})
                        </span>
                      </div>
                    );
                  })}
                </div>

                {isExpanded && (
                  <div className="border-t border-border bg-muted/20 p-4">
                    <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${safeResults.length}, 1fr)` }}>
                      {safeResults.map(r => {
                        const kr = (r.keywordResults || []).find(k => k?.keyword === keyword);
                        if (!kr) return <div key={r.variant.id} className="text-xs text-muted-foreground">Sem dados</div>;
                        if (kr.error) {
                          return (
                            <div key={r.variant.id} className="space-y-3">
                              <div className="flex items-center gap-2 pb-2 border-b border-border">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: `hsl(${r.variant.color || '0 0% 50%'})` }} />
                                <span className="text-xs font-semibold">{r.variant.name || 'Sem nome'}</span>
                              </div>
                              <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
                                <div className="flex items-center gap-2 text-destructive text-xs font-medium mb-1">
                                  <AlertTriangle className="h-3.5 w-3.5" />
                                  Falha na consulta
                                </div>
                                <p className="text-xs text-muted-foreground font-mono-data break-all">{kr.error}</p>
                              </div>
                            </div>
                          );
                        }
                        const hits = kr.hits || [];
                        const expectedIds = kr.expectedIds || [];
                        const missingIds = kr.missingIds || [];
                        return (
                          <div key={r.variant.id} className="space-y-3">
                            <div className="flex items-center gap-2 pb-2 border-b border-border">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: `hsl(${r.variant.color || '0 0% 50%'})` }} />
                              <span className="text-xs font-semibold">{r.variant.name || 'Sem nome'}</span>
                              <Badge variant={(kr.hitRate ?? 0) === 1 ? 'default' : 'secondary'} className="text-[9px] ml-auto">
                                {((kr.hitRate ?? 0) * 100).toFixed(0)}% hit rate
                              </Badge>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="flex items-center gap-1">
                                <span className="text-muted-foreground">MRR:</span>
                                <span className="font-mono-data font-medium">{(kr.mrr ?? 0).toFixed(3)}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-muted-foreground">Pos. Média:</span>
                                <span className="font-mono-data font-medium">{kr.avgPosition?.toFixed(1) || 'N/A'}</span>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Top 10 resultados</p>
                              <div className="space-y-1">
                                {hits.slice(0, 10).map((hit, i) => (
                                  <ProductCardSimple
                                    key={i}
                                    hit={hit}
                                    isExpected={expectedIds.includes(hit.productId)}
                                  />
                                ))}
                              </div>
                            </div>

                            {missingIds.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-border/50">
                                <p className="text-[10px] text-destructive flex items-center gap-1 mb-1.5">
                                  <X className="h-3 w-3" /> Não encontrados no top 10
                                </p>
                                <div className="space-y-1">
                                  {missingIds.map(id => (
                                    <div key={id} className="flex items-center gap-2 p-1.5 rounded bg-destructive/5">
                                      <div className="w-6 h-9 rounded overflow-hidden bg-muted/50 shrink-0 relative">
                                        <img
                                          src={`https://media3.ubook.com/catalog/book-cover-image/${id}/200x300/`}
                                          alt={id}
                                          className="w-full h-full object-cover"
                                          loading="lazy"
                                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                        />
                                      </div>
                                      <span className="text-xs font-mono-data text-destructive/70">{id}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
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