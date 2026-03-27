import { useMemo } from 'react';
import { VariantResult } from '@/types/experiment';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Building2, FileType, CreditCard, Clock } from 'lucide-react';

interface Props {
  results: VariantResult[];
}

interface DistEntry {
  name: string;
  [variantName: string]: string | number;
}

function extractField(hit: any, field: string): string {
  const raw = hit.rawPayload;
  if (!raw) return 'Desconhecido';

  if (field === 'publisher') {
    const src = raw._source || raw;
    const pub = src.publisher || src.publisher_name || {};
    if (typeof pub === 'object' && pub !== null) return pub.name || 'Desconhecido';
    return String(pub) || 'Desconhecido';
  }

  if (field === 'type') {
    const src = raw._source || raw;
    const t = src.type || src.format || src.engine || '';
    return String(t) || 'Desconhecido';
  }

  if (field === 'catalog_plus') {
    const src = raw._source || raw;
    const val = String(src.catalog_plus || '').toLowerCase();
    if (val === 'yes') return 'Premium+';
    return 'Premium';
  }

  return 'Desconhecido';
}

function buildDistribution(results: VariantResult[], field: string, topN = 8): DistEntry[] {
  // Count per variant
  const variantCounts: Record<string, Record<string, number>> = {};
  for (const r of results) {
    const counts: Record<string, number> = {};
    for (const kr of r.keywordResults) {
      for (const hit of kr.hits.slice(0, 10)) {
        const val = extractField(hit, field);
        counts[val] = (counts[val] || 0) + 1;
      }
    }
    variantCounts[r.variant.name] = counts;
  }

  // Get top N values across all variants
  const globalCounts: Record<string, number> = {};
  for (const counts of Object.values(variantCounts)) {
    for (const [k, v] of Object.entries(counts)) {
      globalCounts[k] = (globalCounts[k] || 0) + v;
    }
  }
  const topKeys = Object.entries(globalCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([k]) => k);

  return topKeys.map(key => {
    const entry: DistEntry = { name: key };
    for (const r of results) {
      entry[r.variant.name] = variantCounts[r.variant.name]?.[key] || 0;
    }
    return entry;
  });
}

export function DistributionCharts({ results }: Props) {
  const publisherData = useMemo(() => buildDistribution(results, 'publisher'), [results]);
  const formatData = useMemo(() => buildDistribution(results, 'type'), [results]);
  const planData = useMemo(() => buildDistribution(results, 'catalog_plus'), [results]);

  const avgResponseTimes = useMemo(() => {
    return results.map(r => {
      const times = r.keywordResults
        .map(kr => kr.responseTimeMs)
        .filter((t): t is number => t !== undefined);
      const avg = times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
      return { variant: r.variant, avg, min: Math.min(...times), max: Math.max(...times), count: times.length };
    });
  }, [results]);

  const charts = [
    { title: 'Editoras mais frequentes', icon: Building2, data: publisherData },
    { title: 'Formatos', icon: FileType, data: formatData },
    { title: 'Plano', icon: CreditCard, data: planData },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {charts.map(chart => (
          <Card key={chart.title}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <chart.icon className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-xs">{chart.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {chart.data.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Sem dados disponíveis</p>
              ) : (
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chart.data} layout="vertical" barCategoryGap="15%">
                      <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(215 15% 50%)' }} axisLine={false} tickLine={false} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 10, fill: 'hsl(215 15% 50%)' }}
                        axisLine={false}
                        tickLine={false}
                        width={80}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'hsl(225 20% 9%)', border: '1px solid hsl(225 15% 16%)', borderRadius: '8px', fontSize: '11px' }}
                      />
                      {results.map(r => (
                        <Bar key={r.variant.id} dataKey={r.variant.name} fill={`hsl(${r.variant.color})`} radius={[0, 3, 3, 0]} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Response time - discrete technical info */}
      <Card className="border-border/50">
        <CardHeader className="pb-1 pt-3 px-4">
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-muted-foreground/60" />
            <CardTitle className="text-[11px] text-muted-foreground/80 font-normal">Tempo médio de resposta</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <div className="flex flex-wrap gap-4">
            {avgResponseTimes.map(rt => (
              <div key={rt.variant.id} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: `hsl(${rt.variant.color})` }} />
                <span className="text-[11px] text-muted-foreground">{rt.variant.name}:</span>
                <span className="text-[11px] font-mono-data text-muted-foreground/80">{rt.avg}ms</span>
                <span className="text-[10px] font-mono-data text-muted-foreground/50">(min {rt.min}ms · max {rt.max}ms)</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
