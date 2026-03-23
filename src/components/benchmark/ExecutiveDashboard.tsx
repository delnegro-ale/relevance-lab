import { VariantResult, VariantMetrics } from '@/types/experiment';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Trophy, Target, Crosshair, TrendingUp, TrendingDown, Award, Percent, AlertTriangle } from 'lucide-react';
import { MetricTooltip, METRIC_EXPLANATIONS } from './MetricTooltip';
import { HowToReadReport } from './HowToReadReport';

interface Props {
  results: VariantResult[];
}

const METRIC_DEFS = [
  { key: 'hitRate' as const, label: 'Hit Rate @10', icon: Target, pct: true, higherBetter: true },
  { key: 'mrr' as const, label: 'MRR', icon: Crosshair, pct: false, higherBetter: true },
  { key: 'coverage' as const, label: 'Cobertura', icon: TrendingUp, pct: true, higherBetter: true },
  { key: 'avgPosition' as const, label: 'Posição Média', icon: Award, pct: false, higherBetter: false },
  { key: 'perfectMatchRate' as const, label: 'Match Perfeito', icon: Percent, pct: true, higherBetter: true },
];

function fmt(val: number, pct: boolean) {
  return pct ? `${(val * 100).toFixed(1)}%` : val.toFixed(2);
}

export function ExecutiveDashboard({ results }: Props) {
  if (results.length === 0) return null;

  const hasErrors = results.some(r => r.errorCount > 0);
  const winner = results.reduce((best, r) => r.metrics.hitRate > best.metrics.hitRate ? r : best);
  const baseline = results[0];

  const chartData = METRIC_DEFS.filter(m => m.key !== 'avgPosition').map(m => ({
    name: m.label,
    ...Object.fromEntries(results.map(r => [r.variant.name, parseFloat((r.metrics[m.key] * 100).toFixed(1))])),
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
                    {': '}{r.errorCount} de {r.keywordResults.length} consultas falharam — os resultados desta variante podem estar incompletos.
                  </p>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Possíveis causas: restrição de IP/VPC, CORS, endpoint inacessível. Configure o proxy via Edge Function para resolver.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Winner */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-6 flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Trophy className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Melhor performance geral</p>
            <p className="text-xl font-bold mt-0.5" style={{ color: `hsl(${winner.variant.color})` }}>
              {winner.variant.name}
              {winner.errorCount > 0 && <span className="text-xs text-danger font-normal ml-2">⚠ com erros</span>}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Hit Rate: {fmt(winner.metrics.hitRate, true)} · MRR: {fmt(winner.metrics.mrr, false)} · Cobertura: {fmt(winner.metrics.coverage, true)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
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
                  {results.map(r => {
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

      {/* Insights */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Insights Automáticos</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {generateInsights(results).map((insight, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              {insight.positive
                ? <TrendingUp className="h-4 w-4 text-success mt-0.5 shrink-0" />
                : <TrendingDown className="h-4 w-4 text-danger mt-0.5 shrink-0" />}
              <span className="text-muted-foreground">{insight.text}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function generateInsights(results: VariantResult[]) {
  const insights: { positive: boolean; text: string }[] = [];
  const baseline = results[0];

  for (let i = 1; i < results.length; i++) {
    const r = results[i];
    const hitDelta = r.metrics.hitRate - baseline.metrics.hitRate;

    if (Math.abs(hitDelta) > 0.001) {
      insights.push({
        positive: hitDelta > 0,
        text: `${r.variant.name} teve ${hitDelta > 0 ? '+' : ''}${(hitDelta * 100).toFixed(1)}pp de hit rate vs baseline`,
      });
    }

    const improvements = r.keywordResults.filter((kr, ki) => kr.hitRate > (baseline.keywordResults[ki]?.hitRate ?? 0)).length;
    const regressions = r.keywordResults.filter((kr, ki) => kr.hitRate < (baseline.keywordResults[ki]?.hitRate ?? 0)).length;

    if (improvements > 0) insights.push({ positive: true, text: `${r.variant.name} melhorou ${improvements} keyword${improvements > 1 ? 's' : ''} vs baseline` });
    if (regressions > 0) insights.push({ positive: false, text: `${r.variant.name} piorou ${regressions} keyword${regressions > 1 ? 's' : ''} vs baseline` });

    const posDelta = r.metrics.avgPosition - baseline.metrics.avgPosition;
    if (Math.abs(posDelta) > 0.1) {
      insights.push({
        positive: posDelta < 0,
        text: `${r.variant.name}: posição média ${posDelta < 0 ? 'melhorou' : 'piorou'} em ${Math.abs(posDelta).toFixed(1)} posições vs baseline`,
      });
    }
  }

  return insights;
}
