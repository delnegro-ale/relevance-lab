import { useState } from 'react';
import { VariantResult } from '@/types/experiment';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, Check, X, Search, AlertTriangle, ImageOff, BookOpen, Headphones, FileText as FileIcon } from 'lucide-react';
import { MetricTooltip } from './MetricTooltip';

interface Props {
  results: VariantResult[];
}

function getFormatIcon(format: string) {
  const f = (format || '').toLowerCase();
  if (f.includes('audio') || f.includes('audiobook') || f.includes('mp3')) return Headphones;
  if (f.includes('ebook') || f.includes('epub') || f.includes('pdf')) return FileIcon;
  return BookOpen;
}

function ProductCard({ hit, isExpected }: {
  hit: { productId: string; title?: string; position: number; score?: number | null; publisher?: string; format?: string; coverUrl?: string };
  isExpected: boolean;
}) {
  const coverUrl = hit.coverUrl || `https://media3.ubook.com/catalog/book-cover-image/${hit.productId}/400x600/`;
  const FormatIcon = getFormatIcon(hit.format || '');

  return (
    <div className={`flex gap-2.5 p-2 rounded-lg transition-colors ${isExpected ? 'bg-success/10 ring-1 ring-success/30' : 'hover:bg-muted/20'}`}>
      {/* Position */}
      <div className="flex flex-col items-center justify-start pt-1 shrink-0 w-5">
        <span className="text-[10px] font-mono-data text-muted-foreground font-semibold">{hit.position}</span>
      </div>

      {/* Cover */}
      <div className="w-10 h-14 rounded overflow-hidden bg-muted/50 shrink-0 relative">
        <img
          src={coverUrl}
          alt={hit.title || hit.productId}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            if (target.nextElementSibling) {
              (target.nextElementSibling as HTMLElement).style.display = 'flex';
            }
          }}
        />
        <div className="absolute inset-0 items-center justify-center hidden">
          <ImageOff className="h-4 w-4 text-muted-foreground/40" />
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <p
          className={`text-xs leading-tight truncate ${isExpected ? 'font-semibold text-success' : 'text-foreground'}`}
          title={hit.title || 'Sem título'}
        >
          {(hit.title || 'Sem título').length > 40 ? `${(hit.title || 'Sem título').slice(0, 40)}…` : (hit.title || 'Sem título')}
        </p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-[10px] font-mono-data text-muted-foreground">ID: {hit.productId}</span>
          {hit.publisher && (
            <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">{hit.publisher}</span>
          )}
          {hit.format && (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground/70">
              <FormatIcon className="h-3 w-3" />
              {hit.format}
            </span>
          )}
          {typeof hit.score === 'number' && !isNaN(hit.score) && (
            <span className="text-[10px] font-mono-data text-muted-foreground/50">score: {hit.score.toFixed(1)}</span>
          )}
        </div>
      </div>

      {/* Match indicator */}
      {isExpected && (
        <div className="shrink-0 flex items-center">
          <div className="w-5 h-5 rounded-full bg-success/20 flex items-center justify-center">
            <Check className="h-3 w-3 text-success" />
          </div>
        </div>
      )}
    </div>
  );
}

export function KeywordBreakdown({ results }: Props) {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Defensive: ensure results array is valid and has keywordResults
  const safeResults = results.filter(r => r && r.variant && Array.isArray(r.keywordResults));
  if (safeResults.length === 0) return null;

  const keywords = (safeResults[0].keywordResults || []).map(kr => kr?.keyword).filter(Boolean) as string[];
  const filtered = keywords.filter(k => k.toLowerCase().includes(search.toLowerCase()));

  const toggle = (k: string) => {
    const next = new Set(expanded);
    next.has(k) ? next.delete(k) : next.add(k);
    setExpanded(next);
  };

  const colTemplate = `2fr ${safeResults.map(() => '1fr').join(' ')}`;

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
            <span>Keyword</span>
            {safeResults.map(r => (
              <span key={r.variant.id} className="text-center flex items-center justify-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: `hsl(${r.variant.color || '0 0% 50%'})` }} />
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
                  {safeResults.map(r => {
                    const kr = (r.keywordResults || []).find(k => k?.keyword === keyword);
                    if (!kr) return <div key={r.variant.id} className="text-center text-xs text-muted-foreground">—</div>;
                    if (kr.error) {
                      return (
                        <div key={r.variant.id} className="text-center">
                          <span className="inline-flex items-center gap-1 text-xs text-danger font-medium">
                            <AlertTriangle className="h-3 w-3" /> Erro
                          </span>
                        </div>
                      );
                    }
                    const hitRate = typeof kr.hitRate === 'number' && !isNaN(kr.hitRate) ? kr.hitRate : 0;
                    return (
                      <div key={r.variant.id} className="text-center">
                        <span className={`font-mono-data text-sm font-semibold ${hitRate === 1 ? 'text-success' : hitRate > 0 ? 'text-warning' : 'text-danger'}`}>
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
                              <div className="bg-danger/10 border border-danger/20 rounded-md p-3">
                                <div className="flex items-center gap-2 text-danger text-xs font-medium mb-1">
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

                            {/* Summary metrics */}
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

                            {/* Product cards */}
                            <div className="space-y-1">
                              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Top 10 resultados</p>
                              <div className="space-y-1">
                                {hits.slice(0, 10).map((hit, i) => {
                                  const isExpected = expectedIds.includes(hit.productId);
                                  return (
                                    <ProductCard
                                      key={i}
                                      hit={hit}
                                      isExpected={isExpected}
                                    />
                                  );
                                })}
                              </div>
                            </div>

                            {/* Missing */}
                            {missingIds.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-border/50">
                                <p className="text-[10px] text-danger flex items-center gap-1 mb-1.5">
                                  <X className="h-3 w-3" /> Não encontrados no top 10
                                </p>
                                <div className="space-y-1">
                                  {missingIds.map(id => (
                                    <div key={id} className="flex items-center gap-2 p-1.5 rounded bg-danger/5">
                                      <div className="w-6 h-9 rounded overflow-hidden bg-muted/50 shrink-0 relative">
                                        <img
                                          src={`https://media3.ubook.com/catalog/book-cover-image/${id}/400x600/`}
                                          alt={id}
                                          className="w-full h-full object-cover"
                                          loading="lazy"
                                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                        />
                                      </div>
                                      <span className="text-xs font-mono-data text-danger/70">{id}</span>
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
