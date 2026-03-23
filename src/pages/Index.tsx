import { useState } from 'react';
import { useExperiment } from '@/hooks/useExperiment';
import { CsvUploader } from '@/components/benchmark/CsvUploader';
import { VariantEditor } from '@/components/benchmark/VariantEditor';
import { ExecutiveDashboard } from '@/components/benchmark/ExecutiveDashboard';
import { KeywordBreakdown } from '@/components/benchmark/KeywordBreakdown';
import { DEMO_TEST_CASES, DEMO_VARIANTS, generateDemoResults } from '@/lib/demo-data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { FlaskConical, Play, RotateCcw, Upload, Loader2, Beaker, Sparkles } from 'lucide-react';

export default function Index() {
  const { experiment, setTestCases, addVariant, updateVariant, removeVariant, duplicateVariant, runBenchmark, setExperiment } = useExperiment();
  const [activeView, setActiveView] = useState<'setup' | 'results'>('setup');

  const canRun = experiment.testCases.length > 0 && experiment.variants.length > 0 && experiment.status !== 'running';

  const handleRun = async () => {
    setActiveView('results');
    await runBenchmark();
  };

  const handleLoadDemo = () => {
    setExperiment(prev => ({
      ...prev,
      testCases: DEMO_TEST_CASES,
      variants: DEMO_VARIANTS,
      results: generateDemoResults(),
      status: 'complete' as const,
    }));
    setActiveView('results');
  };

  const handleReset = () => {
    setActiveView('setup');
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
            <h1 className="text-base font-semibold tracking-tight">Search Relevance Lab</h1>
            <Badge variant="outline" className="text-[10px] font-normal border-border">Ubook</Badge>
          </div>
          <div className="flex items-center gap-2">
            {activeView === 'results' && (
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Novo Teste
              </Button>
            )}
            {activeView === 'setup' && (
              <>
                <Button variant="ghost" size="sm" onClick={handleLoadDemo} className="text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Demo
                </Button>
                <Button size="sm" onClick={handleRun} disabled={!canRun}>
                  <Play className="h-3.5 w-3.5 mr-1.5" /> Executar Benchmark
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        {/* Setup View */}
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
                  />
                </CardContent>
              </Card>
            </div>

            {!canRun && experiment.testCases.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Carregue um CSV com casos de teste para começar, ou clique em <strong>Demo</strong> para ver a ferramenta em ação.
              </p>
            )}
          </div>
        )}

        {/* Running */}
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

        {/* Results */}
        {activeView === 'results' && experiment.status === 'complete' && (
          <div className="space-y-6">
            <ExecutiveDashboard results={experiment.results} />
            <KeywordBreakdown results={experiment.results} />
          </div>
        )}
      </main>
    </div>
  );
}
