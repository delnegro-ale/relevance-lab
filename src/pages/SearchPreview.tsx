import { useState, useEffect, useCallback } from 'react';
import { VariantConfig, SearchHit, VARIANT_COLORS, DEFAULT_BASELINE_ENDPOINT, DEFAULT_ES_ENDPOINT, DEFAULT_ES_PAYLOAD } from '@/types/experiment';
import { searchBaseline, searchElasticsearch } from '@/lib/search-api';
import { loadLastConfig } from '@/lib/experiment-persistence';
import { ProductCardSimple } from '@/components/benchmark/ProductCardSimple';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2, Clock, X } from 'lucide-react';
import { SearchHeartFill } from '@/components/icons/BootstrapIcons';
import { NavLink } from '@/components/NavLink';

const RECENT_KEY = 'search-preview-recent';
const MAX_RECENT = 15;

function loadRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch { return []; }
}

function saveRecent(keywords: string[]) {
  localStorage.setItem(RECENT_KEY, JSON.stringify(keywords.slice(0, MAX_RECENT)));
}

interface VariantSearchResult {
  variant: VariantConfig;
  hits: SearchHit[];
  loading: boolean;
  error?: string;
}

export default function SearchPreview() {
  const [query, setQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [recent, setRecent] = useState<string[]>(loadRecent);
  const [variants, setVariants] = useState<VariantConfig[]>([]);
  const [results, setResults] = useState<VariantSearchResult[]>([]);

  // Load variants from last config
  useEffect(() => {
    const saved = loadLastConfig();
    const v = saved.variants?.length ? saved.variants : [
      { id: 'baseline', name: 'Baseline (Produção)', type: 'baseline' as const, endpoint: DEFAULT_BASELINE_ENDPOINT, color: VARIANT_COLORS[0] },
      { id: 'variant-1', name: 'OpenSearch Default', type: 'elasticsearch' as const, endpoint: DEFAULT_ES_ENDPOINT, payload: DEFAULT_ES_PAYLOAD, color: VARIANT_COLORS[1] },
    ];
    setVariants(v);
  }, []);

  const executeSearch = useCallback(async (keyword: string) => {
    if (!keyword.trim() || variants.length === 0) return;
    const trimmed = keyword.trim();
    setActiveQuery(trimmed);

    // Save to recent
    const updated = [trimmed, ...recent.filter(r => r !== trimmed)].slice(0, MAX_RECENT);
    setRecent(updated);
    saveRecent(updated);

    // Init results
    const initial: VariantSearchResult[] = variants.map(v => ({ variant: v, hits: [], loading: true }));
    setResults(initial);

    // Search all variants in parallel
    const promises = variants.map(async (variant) => {
      try {
        let hits: SearchHit[];
        if (variant.type === 'baseline') {
          hits = await searchBaseline(trimmed);
        } else {
          hits = await searchElasticsearch(trimmed, variant.endpoint, variant.payload || '');
        }
        return { variant, hits, loading: false };
      } catch (err: any) {
        return { variant, hits: [], loading: false, error: err?.message || 'Erro desconhecido' };
      }
    });

    const settled = await Promise.all(promises);
    setResults(settled);
  }, [variants, recent]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(query);
  };

  const handleRecentClick = (keyword: string) => {
    setQuery(keyword);
    executeSearch(keyword);
  };

  const clearRecent = () => {
    setRecent([]);
    saveRecent([]);
  };

  const isSearching = results.some(r => r.loading);

  return (
    <div className="min-h-screen bg-background">
      {/* Header with search */}
      <header className="border-b border-border sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center gap-4">
          <NavLink to="/" className="flex items-center gap-2 shrink-0 hover:opacity-80 transition-opacity">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <SearchHeartFill className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">← Voltar</span>
          </NavLink>

          <form onSubmit={handleSubmit} className="flex-1 max-w-2xl relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Digite uma keyword para buscar..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="pl-9 pr-24 h-10"
              autoFocus
            />
            <Button type="submit" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 h-8" disabled={!query.trim() || isSearching}>
              {isSearching ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Search className="h-3.5 w-3.5 mr-1" />}
              Buscar
            </Button>
          </form>

          <Badge variant="outline" className="text-[10px] shrink-0">Search Preview</Badge>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        {/* No results yet - show recent */}
        {!activeQuery && (
          <div className="max-w-xl mx-auto mt-12 space-y-6">
            <div className="text-center space-y-2">
              <Search className="h-12 w-12 text-muted-foreground/30 mx-auto" />
              <h2 className="text-lg font-semibold text-muted-foreground">Search Preview</h2>
              <p className="text-sm text-muted-foreground/70">
                Visualize os resultados de busca em cada variante configurada.
              </p>
            </div>

            {recent.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    Pesquisas recentes
                  </div>
                  <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={clearRecent}>
                    <X className="h-3 w-3 mr-1" /> Limpar
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recent.map(kw => (
                    <Badge
                      key={kw}
                      variant="secondary"
                      className="cursor-pointer hover:bg-primary/10 transition-colors"
                      onClick={() => handleRecentClick(kw)}
                    >
                      {kw}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {activeQuery && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-medium text-muted-foreground">
                Resultados para <span className="text-foreground font-semibold">"{activeQuery}"</span>
              </h2>
              {recent.length > 0 && (
                <div className="flex items-center gap-1 ml-4">
                  {recent.filter(r => r !== activeQuery).slice(0, 5).map(kw => (
                    <Badge
                      key={kw}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary/10 transition-colors text-[10px]"
                      onClick={() => handleRecentClick(kw)}
                    >
                      {kw}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${results.length}, 1fr)` }}>
              {results.map(r => (
                <Card key={r.variant.id}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-border">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: `hsl(${r.variant.color || '0 0% 50%'})` }} />
                      <span className="text-xs font-semibold">{r.variant.name}</span>
                      {!r.loading && !r.error && (
                        <Badge variant="secondary" className="text-[9px] ml-auto">{r.hits.length} resultados</Badge>
                      )}
                    </div>

                    {r.loading && (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    )}

                    {r.error && (
                      <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
                        <p className="text-xs text-destructive font-medium">Erro na busca</p>
                        <p className="text-xs text-muted-foreground font-mono mt-1 break-all">{r.error}</p>
                      </div>
                    )}

                    {!r.loading && !r.error && (
                      <div className="space-y-1">
                        {r.hits.slice(0, 10).map((hit, i) => (
                          <ProductCardSimple key={i} hit={hit} />
                        ))}
                        {r.hits.length === 0 && (
                          <p className="text-xs text-muted-foreground text-center py-4">Nenhum resultado</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}