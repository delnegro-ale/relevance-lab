import { useState } from 'react';
import { VariantResult } from '@/types/experiment';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Trophy, Target, Crosshair, TrendingUp, Award, Percent, AlertTriangle, Crown, Code2 } from 'lucide-react';
import { MetricTooltip, METRIC_EXPLANATIONS } from './MetricTooltip';
import { HowToReadReport } from './HowToReadReport';

interface Props {
  results: VariantResult[];
}

const METRIC_DEFS = [
  { key: 'perfectMatchRate' as const, label: 'Match Perfeito', icon: Trophy, pct: true, higherBetter: true },
  { key: 'mrr' as const, label: 'MRR', icon: Crosshair, pct: false, higherBetter: true },
  { key: 'coverage' as const, label: 'Cobertura', icon: TrendingUp, pct: true, higherBetter: true },
  { key: 'avgPosition' as const, label: 'Posição Média', icon: Award, pct: false, higherBetter: false },
];

function fmt(val: number, pct: boolean) {
  return pct ? `${(val * 100).toFixed(2)}%` : val.toFixed(2);
}

export function ExecutiveDashboard({ results }: Props) {
  const [payloadVariant, setPayloadVariant] = useState<VariantResult | null>(null);

  if (results.length === 0) return null;

  const hasErrors = results.some(r => r.errorCount > 0);
  const baseline = results[0];

  // Winner by hitRate
  const hitRateWinner = results.reduce((best, r) => {
    if (r.metrics.hitRate !== best.metrics.hitRate) return r.metrics.hitRate > best.metrics.hitRate ? r : best;
    if (r.metrics.mrr !== best.metrics.mrr) return r.metrics.mrr > best.metrics.mrr ? r : best;
    return r.metrics.perfectMatchRate > best.metrics.perfectMatchRate ? r : best;
  });

  const chartData = METRIC_DEFS.filter(m => m.key !== 'avgPosition').map(m => ({
    name: m.label,
    ...Object.fromEntries(results.map(r => [r.variant.name, parseFloat((r.metrics[m.key] * 100).toFixed(2))])),
  }));

  return (
    <div className="space-y-6">
      {/* How to read */}
      <HowToReadReport />

      {/* Error Banner */}
      {hasErrors && (
        <Card className="border-danger/30 bg-danger/5">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-danger mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-danger">Erros detectados na execução</p>
              <div className="mt-1 space-y-0.5">
                {results.filter(r => r.errorCount > 0).map(r => (
                  <p key={r.variant.id} className="text-xs text-muted-foreground">
                    <span className="font-medium" style={{ color: `hsl(${r.variant.color})` }}>{r.variant.name}</span>
                    {': '}{r.errorCount} de {r.keywordResults.length} consultas falharam — os resultados deste motor podem estar incompletos.
                  </p>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hit Rate - Hero KPI Section */}
      <Card className="border-primary/20 overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-accent" />
            <CardTitle className="text-sm">Hit Rate @10 — Critério de Vitória</CardTitle>
            <MetricTooltip
              label="Hit Rate @10"
              description={METRIC_EXPLANATIONS.hitRate?.description || ''}
              interpretation={METRIC_EXPLANATIONS.hitRate?.interpretation || ''}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Porcentagem média de produtos esperados encontrados no top 10. Quanto maior, melhor.
          </p>
        </CardHeader>
        <CardContent className="pb-6">
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {results.map(r => {
              const isWinner = r === hitRateWinner;
              const pct = (r.metrics.hitRate * 100).toFixed(2);
              const hitCount = r.keywordResults.filter(kr => kr.hitRate > 0).length;
              const totalCount = r.keywordResults.length;

              return (
                <div
                  key={r.variant.id}
                  className={`relative rounded-xl p-5 text-center transition-all ${
                    isWinner
                      ? 'bg-accent/10 ring-2 ring-accent/40 shadow-lg shadow-accent/10'
                      : 'bg-muted/30 ring-1 ring-border'
                  }`}
                >
                  {isWinner && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                      <span className="bg-accent text-accent-foreground text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                        Vencedor
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-center gap-1.5 mb-3 mt-1">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: `hsl(${r.variant.color})` }} />
                    <span className="text-xs font-medium truncate">{r.variant.name}</span>
                    {(r.variant.type === 'elasticsearch' && r.variant.payload) && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setPayloadVariant(r); }}
                        className="ml-1 p-0.5 rounded hover:bg-muted-foreground/20 transition-colors"
                        title="Ver query payload"
                      >
                        <Code2 className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                      </button>
                    )}
                  </div>
                  <p className={`text-4xl font-bold font-mono-data ${isWinner ? 'text-accent' : 'text-foreground'}`}>
                    {pct}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {hitCount} de {totalCount} keywords com hits
                  </p>
                  {typeof r.metrics.avgResponseTime === 'number' && (
                    <p className="text-[10px] text-muted-foreground/60 mt-1 font-mono-data">
                      ~{Math.round(r.metrics.avgResponseTime)}ms avg
                    </p>
                  )}
                  {/* Progress bar */}
                  <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${isWinner ? 'bg-accent' : 'bg-muted-foreground/30'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Other Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {METRIC_DEFS.map(m => {
          const explanation = METRIC_EXPLANATIONS[m.key];
          return (
            <Card key={m.key}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <m.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">{m.label}</span>
                  {explanation && (
                    <MetricTooltip label={m.label} description={explanation.description} interpretation={explanation.interpretation} />
                  )}
                </div>
                <div className="space-y-2">
                  {[...results].sort((a, b) => {
                    const aVal = a.metrics[m.key];
                    const bVal = b.metrics[m.key];
                    return m.higherBetter ? bVal - aVal : aVal - bVal;
                  }).map(r => {
                    const val = r.metrics[m.key];
                    const baseVal = baseline.metrics[m.key];
                    const delta = val - baseVal;
                    const isBaseline = r === baseline;
                    const isPositive = m.higherBetter ? delta > 0 : delta < 0;

                    return (
                      <div key={r.variant.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: `hsl(${r.variant.color})` }} />
                          <span className="text-xs truncate">{r.variant.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-sm font-mono-data font-semibold">{fmt(val, m.pct)}</span>
                          {!isBaseline && Math.abs(delta) > 0.001 && (
                            <span className={`text-[10px] font-mono-data ${isPositive ? 'text-success' : 'text-danger'}`}>
                              {delta > 0 ? '+' : ''}{m.pct ? `${(delta * 100).toFixed(1)}` : delta.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Chart */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Comparação Visual (%)</CardTitle></CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barCategoryGap="20%">
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(215 15% 50%)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(215 15% 50%)' }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(225 20% 9%)', border: '1px solid hsl(225 15% 16%)', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(value: number) => [`${value}%`]}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                {results.map(r => (
                  <Bar key={r.variant.id} dataKey={r.variant.name} fill={`hsl(${r.variant.color})`} radius={[4, 4, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Payload Viewer Dialog */}
      <Dialog open={!!payloadVariant} onOpenChange={(open) => !open && setPayloadVariant(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <Code2 className="h-4 w-4" />
              Query Payload — {payloadVariant?.variant.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1">Endpoint</p>
              <code className="text-xs font-mono-data text-muted-foreground bg-muted/50 px-2 py-1 rounded block break-all">
                {payloadVariant?.variant.endpoint}
              </code>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1">Payload</p>
              <pre className="text-xs font-mono-data bg-muted/50 p-3 rounded-md overflow-auto max-h-[50vh] border border-border">
                {payloadVariant?.variant.payload || 'Nenhum payload configurado'}
              </pre>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

