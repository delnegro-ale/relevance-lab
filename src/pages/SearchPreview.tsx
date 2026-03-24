import { useState, useEffect, useCallback, useRef } from 'react';
import { VariantConfig, SearchHit, VARIANT_COLORS, DEFAULT_BASELINE_ENDPOINT, DEFAULT_ES_ENDPOINT, DEFAULT_ES_PAYLOAD } from '@/types/experiment';
import { searchBaseline, searchElasticsearch } from '@/lib/search-api';
import { loadLastConfig } from '@/lib/experiment-persistence';
import { ProductCardSimple } from '@/components/benchmark/ProductCardSimple';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2, Clock, X, ChevronDown, ChevronRight, List } from 'lucide-react';
import { SearchHeartFill } from '@/components/icons/BootstrapIcons';
import { NavLink } from '@/components/NavLink';
import { Textarea } from '@/components/ui/textarea';

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

interface KeywordSearchGroup {
  keyword: string;
  results: VariantSearchResult[];
}

export default function SearchPreview() {
  const [query, setQuery] = useState('');
  const [multiMode, setMultiMode] = useState(false);
  const [recent, setRecent] = useState<string[]>(loadRecent);
  const [variants, setVariants] = useState<VariantConfig[]>([]);
  const [searchGroups, setSearchGroups] = useState<KeywordSearchGroup[]>([]);
  const [expandedKeyword, setExpandedKeyword] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const saved = loadLastConfig();
    const v = saved.variants?.length ? saved.variants : [
      { id: 'baseline', name: 'Baseline (Produção)', type: 'baseline' as const, endpoint: DEFAULT_BASELINE_ENDPOINT, color: VARIANT_COLORS[0] },
      { id: 'variant-1', name: 'OpenSearch Default', type: 'elasticsearch' as const, endpoint: DEFAULT_ES_ENDPOINT, payload: DEFAULT_ES_PAYLOAD, color: VARIANT_COLORS[1] },
    ];
    setVariants(v);
  }, []);

  const searchSingleKeyword = useCallback(async (keyword: string): Promise<KeywordSearchGroup> => {
    const results: VariantSearchResult[] = await Promise.all(
      variants.map(async (variant) => {
        try {
          let hits: SearchHit[];
          if (variant.type === 'baseline') {
            hits = await searchBaseline(keyword);
          } else {
            hits = await searchElasticsearch(keyword, variant.endpoint, variant.payload || '');
          }
          return { variant, hits, loading: false };
        } catch (err: any) {
          return { variant, hits: [], loading: false, error: err?.message || 'Erro desconhecido' };
        }
      })
    );
    return { keyword, results };
  }, [variants]);

  const executeSearch = useCallback(async (rawQuery: string) => {
    if (!rawQuery.trim() || variants.length === 0) return;

    const keywords = rawQuery
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean);

    if (keywords.length === 0) return;

    setIsSearching(true);

    // Save to recent (unique, most recent first)
    const updatedRecent = [
      ...keywords,
      ...recent.filter(r => !keywords.includes(r)),
    ].slice(0, MAX_RECENT);
    setRecent(updatedRecent);
    saveRecent(updatedRecent);

    // Initialize with loading state
    const initialGroups: KeywordSearchGroup[] = keywords.map(kw => ({
      keyword: kw,
      results: variants.map(v => ({ variant: v, hits: [], loading: true })),
    }));
    setSearchGroups(initialGroups);
    setExpandedKeyword(keywords[0]);

    // Execute searches sequentially per keyword to avoid overwhelming APIs
    const completedGroups: KeywordSearchGroup[] = [];
    for (const kw of keywords) {
      const group = await searchSingleKeyword(kw);
      completedGroups.push(group);
      setSearchGroups([...completedGroups, ...initialGroups.slice(completedGroups.length)]);
    }

    setIsSearching(false);
  }, [variants, recent, searchSingleKeyword]);

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // In single mode, Enter submits; in multi mode, Enter adds a line
    if (!multiMode && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      executeSearch(query);
    }
  };

  const toggleMultiMode = () => {
    setMultiMode(prev => !prev);
    // Focus textarea after toggle
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const keywordCount = query.split('\n').map(l => l.trim()).filter(Boolean).length;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center gap-4">
          <NavLink to="/" className="flex items-center gap-2 shrink-0 hover:opacity-80 transition-opacity">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <SearchHeartFill className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">← Voltar</span>
          </NavLink>

          <form onSubmit={handleSubmit} className="flex-1 max-w-2xl flex items-start gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
              {multiMode ? (
                <Textarea
                  ref={textareaRef}
                  placeholder="Uma keyword por linha..."
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="pl-9 min-h-[80px] max-h-[200px] text-sm resize-y"
                  autoFocus
                />
              ) : (
                <Textarea
                  ref={textareaRef}
                  placeholder="Digite uma keyword para buscar..."
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="pl-9 min-h-[40px] max-h-[40px] text-sm resize-none py-2"
                  rows={1}
                  autoFocus
                />
              )}
            </div>
            <div className="flex flex-col gap-1 shrink-0">
              <Button
                type="button"
                variant={multiMode ? 'secondary' : 'outline'}
                size="sm"
                className="h-8 px-2"
                onClick={toggleMultiMode}
                title={multiMode ? 'Modo single' : 'Multi-search: buscar múltiplas keywords'}
              >
                <List className="h-3.5 w-3.5" />
              </Button>
              <Button type="submit" size="sm" className="h-8" disabled={!query.trim() || isSearching}>
                {isSearching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </form>

          {multiMode && keywordCount > 1 && (
            <Badge variant="outline" className="text-[10px] shrink-0">{keywordCount} keywords</Badge>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        {/* Empty state */}
        {searchGroups.length === 0 && (
          <div className="max-w-xl mx-auto mt-12 space-y-6">
            <div className="text-center space-y-2">
              <Search className="h-12 w-12 text-muted-foreground/30 mx-auto" />
              <h2 className="text-lg font-semibold text-muted-foreground">Search Preview</h2>
              <p className="text-sm text-muted-foreground/70">
                Visualize os resultados de busca em cada motor configurado.
              </p>
              <p className="text-xs text-muted-foreground/50">
                Clique em <List className="inline h-3 w-3" /> para ativar o modo multi-search (uma keyword por linha).
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

        {/* Results - accordion style */}
        {searchGroups.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-sm font-medium text-muted-foreground">
                {searchGroups.length === 1 ? (
                  <>Resultados para <span className="text-foreground font-semibold">"{searchGroups[0].keyword}"</span></>
                ) : (
                  <>{searchGroups.length} keywords pesquisadas</>
                )}
              </h2>
              {recent.length > 0 && (
                <div className="flex items-center gap-1 ml-4">
                  {recent.filter(r => !searchGroups.some(g => g.keyword === r)).slice(0, 5).map(kw => (
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

            {searchGroups.map(group => {
              const isOpen = expandedKeyword === group.keyword;
              const allLoading = group.results.every(r => r.loading);
              const totalHits = group.results.reduce((sum, r) => sum + r.hits.length, 0);

              return (
                <Card key={group.keyword} className="overflow-hidden">
                  <button
                    className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-muted/30 transition-colors"
                    onClick={() => setExpandedKeyword(isOpen ? null : group.keyword)}
                  >
                    {isOpen ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                    <span className="text-sm font-semibold flex-1">{group.keyword}</span>
                    {allLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    {!allLoading && (
                      <Badge variant="secondary" className="text-[10px]">
                        {group.results.length} motores · {totalHits} resultados
                      </Badge>
                    )}
                  </button>

                  {isOpen && (
                    <CardContent className="pt-0 pb-4 px-4">
                      <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${group.results.length}, 1fr)` }}>
                        {group.results.map(r => (
                          <div key={r.variant.id} className="space-y-3">
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
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
