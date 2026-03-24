import { useState, useEffect, useRef } from 'react';
import { useExperiment } from '@/hooks/useExperiment';
import { CsvUploader } from '@/components/benchmark/CsvUploader';
import { VariantEditor } from '@/components/benchmark/VariantEditor';
import { ExecutiveDashboard } from '@/components/benchmark/ExecutiveDashboard';
import { KeywordBreakdown } from '@/components/benchmark/KeywordBreakdown';
import { HistoryPanel } from '@/components/benchmark/HistoryPanel';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { saveToHistory, createHistoryEntry, HistoryEntry } from '@/lib/history';
import { sanitizeResults } from '@/lib/sanitize-results';
import { SavedVariant } from '@/lib/variant-library';
import { VARIANT_COLORS } from '@/types/experiment';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { FlaskConical, Play, RotateCcw, Upload, Loader2, Beaker, Clock, Eraser, Search } from 'lucide-react';
import { NavLink } from '@/components/NavLink';

export default function Index() {
  const { experiment, setTestCases, addVariant, updateVariant, removeVariant, duplicateVariant, runBenchmark, setExperiment } = useExperiment();
  const [activeView, setActiveView] = useState<'setup' | 'results'>('setup');
  const [showHistory, setShowHistory] = useState(false);
  const prevStatusRef = useRef(experiment.status);

  const canRun = experiment.testCases.length > 0 && experiment.variants.length > 0 && experiment.status !== 'running';

  // Auto-save to history when benchmark completes
  useEffect(() => {
    if (experiment.status === 'complete' && prevStatusRef.current === 'running' && experiment.results.length > 0) {
      const entry = createHistoryEntry(experiment.results, experiment.testCases, experiment.variants);
      saveToHistory(entry);
    }
    prevStatusRef.current = experiment.status;
  }, [experiment.status, experiment.results, experiment.testCases, experiment.variants]);

  const handleRun = async () => {
    // Assign colors by order before running
    setExperiment(prev => ({
      ...prev,
      variants: prev.variants.map((v, i) => ({
        ...v,
        color: VARIANT_COLORS[i % VARIANT_COLORS.length],
      })),
    }));
    setActiveView('results');
    await runBenchmark();
  };

  const handleLoadHistory = (entry: HistoryEntry) => {
    const safeResults = sanitizeResults(entry.results);
    setExperiment(prev => ({
      ...prev,
      testCases: entry.testCases || [],
      variants: entry.variants || [],
      results: safeResults,
      status: 'complete' as const,
    }));
    setActiveView('results');
    setShowHistory(false);
  };

  const handleNewTest = () => {
    // "Novo Teste" keeps current config (copy of last state) but clears results
    setExperiment(prev => ({
      ...prev,
      results: [],
      status: 'setup' as const,
      progress: { current: 0, total: 0, keyword: '' },
    }));
    setActiveView('setup');
  };

  const handleClearConfig = () => {
    setExperiment(prev => ({
      ...prev,
      variants: [prev.variants[0]], // Keep only baseline
      results: [],
      status: 'setup' as const,
      progress: { current: 0, total: 0, keyword: '' },
    }));
  };

  const handleLoadFromLibrary = (saved: SavedVariant) => {
    setExperiment(prev => {
      const idx = prev.variants.length;
      return {
        ...prev,
        variants: [...prev.variants, {
          id: `variant-${Date.now()}`,
          name: saved.name,
          type: 'elasticsearch' as const,
          endpoint: saved.endpoint,
          payload: saved.payload,
          color: VARIANT_COLORS[idx % VARIANT_COLORS.length],
        }],
      };
    });
  };

  const progress = experiment.progress.total > 0 ? (experiment.progress.current / experiment.progress.total) * 100 : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <FlaskConical className="h-4 w-4 text-primary" />
            </div>
            <h1 className="text-base font-semibold tracking-tight">Ubook Search Insights</h1>
          </div>
          <div className="flex items-center gap-2">
            <NavLink to="/search">
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                <Search className="h-3.5 w-3.5 mr-1.5" /> Search Preview
              </Button>
            </NavLink>
            <Button
              variant={showHistory ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              className="text-muted-foreground"
            >
              <Clock className="h-3.5 w-3.5 mr-1.5" /> Histórico
            </Button>
            {activeView === 'results' && (
              <Button variant="outline" size="sm" onClick={handleNewTest}>
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Novo Teste
              </Button>
            )}
            {activeView === 'setup' && (
              <Button size="sm" onClick={handleRun} disabled={!canRun}>
                <Play className="h-3.5 w-3.5 mr-1.5" /> Executar Benchmark
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        {showHistory && (
          <div className="mb-6">
            <HistoryPanel onLoad={handleLoadHistory} />
          </div>
        )}

        {activeView === 'setup' && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <Beaker className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">Configurar Experimento</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Upload className="h-4 w-4 text-primary" />
                    Casos de Teste
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CsvUploader onUpload={setTestCases} testCases={experiment.testCases} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Variantes de Busca</CardTitle>
                </CardHeader>
                <CardContent>
                  <VariantEditor
                    variants={experiment.variants}
                    onUpdate={updateVariant}
                    onRemove={removeVariant}
                    onDuplicate={duplicateVariant}
                    onAdd={addVariant}
                    onLoadFromLibrary={handleLoadFromLibrary}
                  />
                </CardContent>
              </Card>
            </div>

            {!canRun && experiment.testCases.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Carregue um CSV com casos de teste ou adicione keywords manualmente para começar.
              </p>
            )}
          </div>
        )}

        {activeView === 'results' && experiment.status === 'running' && (
          <Card className="max-w-md mx-auto mt-24">
            <CardContent className="p-8 text-center space-y-4">
              <Loader2 className="h-10 w-10 text-primary animate-spin mx-auto" />
              <p className="font-semibold text-lg">Executando benchmark...</p>
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-muted-foreground">
                {experiment.progress.current} / {experiment.progress.total}
              </p>
              <p className="text-xs text-muted-foreground font-mono-data">
                {experiment.progress.keyword}
              </p>
            </CardContent>
          </Card>
        )}

        {activeView === 'results' && experiment.status === 'complete' && (
          <div className="space-y-6">
            <ErrorBoundary fallbackTitle="Erro ao renderizar o dashboard de resultados">
              <ExecutiveDashboard results={experiment.results} />
            </ErrorBoundary>
            <ErrorBoundary fallbackTitle="Erro ao renderizar a análise por keyword">
              <KeywordBreakdown results={experiment.results} />
            </ErrorBoundary>
          </div>
        )}
      </main>
    </div>
  );
}
