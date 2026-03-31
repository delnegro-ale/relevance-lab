import { useState, useEffect, useRef } from 'react';
import { useExperiment } from '@/hooks/useExperiment';
import { CsvUploader } from '@/components/benchmark/CsvUploader';
import { VariantEditor } from '@/components/benchmark/VariantEditor';
import { ExecutiveDashboard } from '@/components/benchmark/ExecutiveDashboard';
import { KeywordBreakdown } from '@/components/benchmark/KeywordBreakdown';
import { HistoryPanel } from '@/components/benchmark/HistoryPanel';
import { ExportPdfButton } from '@/components/benchmark/ExportPdfButton';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { saveToHistory, createHistoryEntry, HistoryEntry } from '@/lib/history';
import { sanitizeResults } from '@/lib/sanitize-results';
import { SavedVariant } from '@/lib/variant-library';
import { VARIANT_COLORS } from '@/types/experiment';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Play, RotateCcw, Loader2, Clock, Search, AlertTriangle } from 'lucide-react';
import { SearchHeartFill, InputCursorText, BracesAsterisk } from '@/components/icons/BootstrapIcons';
import { NavLink } from '@/components/NavLink';

export default function Index() {
  const { experiment, setTestCases, addVariant, updateVariant, removeVariant, duplicateVariant, reorderVariants, runBenchmark, setExperiment } = useExperiment();
  const [activeView, setActiveView] = useState<'setup' | 'results'>('setup');
  const [showHistory, setShowHistory] = useState(false);
  const [uiError, setUiError] = useState<string | null>(null);
  const prevStatusRef = useRef(experiment.status);

  const canRun = experiment.testCases.length > 0 && experiment.variants.length > 0 && experiment.status !== 'running';

  useEffect(() => {
    const shouldPersistHistory = experiment.status === 'complete' && prevStatusRef.current === 'running' && experiment.results.length > 0;

    if (shouldPersistHistory) {
      const entry = createHistoryEntry(experiment.results, experiment.testCases, experiment.variants);
      const saveResult = saveToHistory(entry);
      if (!saveResult.ok && saveResult.error) {
        setUiError(saveResult.error);
      } else if (saveResult.warning) {
        setUiError(saveResult.warning);
      }
    }

    prevStatusRef.current = experiment.status;
  }, [experiment.status, experiment.results, experiment.testCases, experiment.variants]);

  const handleRun = async () => {
    setUiError(null);
    setExperiment(prev => ({
      ...prev,
      variants: prev.variants.map((v, i) => ({
        ...v,
        color: VARIANT_COLORS[i % VARIANT_COLORS.length],
      })),
    }));
    setActiveView('results');

    try {
      await runBenchmark();
    } catch (err: any) {
      setUiError(err?.message || 'Falha inesperada ao executar o benchmark.');
    }
  };

  const handleLoadHistory = (entry: HistoryEntry) => {
    setUiError(null);
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
    setUiError(null);
    setExperiment(prev => ({
      ...prev,
      results: [],
      status: 'setup' as const,
      progress: { current: 0, total: 0, keyword: '' },
    }));
    setActiveView('setup');
  };

  const handleClearConfig = () => {
    setUiError(null);
    setExperiment(prev => ({
      ...prev,
      variants: [prev.variants[0]],
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
  const hasRenderableResults = experiment.results.length > 0 && (experiment.status === 'complete' || experiment.status === 'error');

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <SearchHeartFill className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-2xl tracking-tight" style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 600 }}>Ubook Search Insights</h1>
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
              <>
                {experiment.results.length > 0 && <ExportPdfButton results={experiment.results} />}
                <Button variant="outline" size="sm" onClick={handleNewTest}>
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Novo Teste
                </Button>
              </>
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

        {uiError && (
          <Card className="mb-6 border-danger/30 bg-danger/5">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-danger mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-danger">Erro detectado durante a execução</p>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap mt-1">{uiError}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {activeView === 'setup' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold">Configurar Benchmark</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="flex flex-col">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <InputCursorText className="h-5 w-5 text-primary" />
                    Keywords
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1">
                  <CsvUploader onUpload={setTestCases} testCases={experiment.testCases} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BracesAsterisk className="h-5 w-5 text-primary" />
                    Motores de Busca
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <VariantEditor
                    variants={experiment.variants}
                    onUpdate={updateVariant}
                    onRemove={removeVariant}
                    onDuplicate={duplicateVariant}
                    onAdd={addVariant}
                    onLoadFromLibrary={handleLoadFromLibrary}
                    onClearVariants={handleClearConfig}
                    onReorder={reorderVariants}
                  />
                </CardContent>
              </Card>
            </div>

            {!canRun && experiment.testCases.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Carregue um CSV com keywords ou adicione manualmente para começar.
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

        {hasRenderableResults && (
          <div className="space-y-6">
            <ErrorBoundary fallbackTitle="Erro ao renderizar o dashboard de resultados">
              <ExecutiveDashboard results={experiment.results} />
            </ErrorBoundary>
            <ErrorBoundary fallbackTitle="Erro ao renderizar a análise por keyword">
              <KeywordBreakdown results={experiment.results} />
            </ErrorBoundary>
          </div>
        )}

        {activeView === 'results' && experiment.status === 'error' && experiment.results.length === 0 && (
          <Card className="max-w-2xl mx-auto mt-12 border-danger/30 bg-danger/5">
            <CardContent className="p-6 space-y-2">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-danger mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-danger">O benchmark falhou antes de gerar resultados</p>
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap mt-1">
                    {uiError || 'Veja a mensagem acima para identificar em que etapa a execução falhou.'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
