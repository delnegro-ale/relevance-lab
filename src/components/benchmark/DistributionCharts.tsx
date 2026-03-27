import { useMemo } from 'react';
import { VariantResult } from '@/types/experiment';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { Building2, FileType, CreditCard, Clock } from 'lucide-react';

interface Props {
  results: VariantResult[];
}

interface DistEntry {
  name: string;
  value: number;
}

// Palette for consistent entity coloring across all variants
const ENTITY_PALETTE = [
  'hsl(262 80% 60%)',  // purple
  'hsl(38 92% 50%)',   // amber
  'hsl(200 80% 55%)',  // blue
  'hsl(142 70% 45%)',  // green
  'hsl(350 80% 60%)',  // red
  'hsl(28 90% 55%)',   // orange
  'hsl(180 60% 45%)',  // teal
  'hsl(320 70% 55%)',  // pink
];
const OTHERS_COLOR = 'hsl(215 15% 35%)';

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

function buildDistForVariant(result: VariantResult, field: string, topN = 5): DistEntry[] {
  const counts: Record<string, number> = {};
  for (const kr of result.keywordResults) {
    for (const hit of kr.hits.slice(0, 10)) {
      const val = extractField(hit, field);
      counts[val] = (counts[val] || 0) + 1;
    }
  }

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, topN);
  const rest = sorted.slice(topN);
  const othersSum = rest.reduce((sum, [, v]) => sum + v, 0);

  const entries: DistEntry[] = top.map(([name, value]) => ({ name, value }));
  if (othersSum > 0) {
    entries.push({ name: 'Outros', value: othersSum });
  }
  return entries;
}

/** Build a global color map: same entity name → same color across all variants */
function buildGlobalColorMap(results: VariantResult[], field: string): Record<string, string> {
  const globalCounts: Record<string, number> = {};
  for (const r of results) {
    for (const kr of r.keywordResults) {
      for (const hit of kr.hits.slice(0, 10)) {
        const val = extractField(hit, field);
        globalCounts[val] = (globalCounts[val] || 0) + 1;
      }
    }
  }
  const sorted = Object.entries(globalCounts).sort((a, b) => b[1] - a[1]);
  const map: Record<string, string> = {};
  let idx = 0;
  for (const [name] of sorted) {
    if (name === 'Outros') continue;
    map[name] = ENTITY_PALETTE[idx % ENTITY_PALETTE.length];
    idx++;
  }
  map['Outros'] = OTHERS_COLOR;
  return map;
}

function getColor(name: string, colorMap: Record<string, string>, variantColor: string): string {
  if (name === 'Outros') return OTHERS_COLOR;
  return colorMap[name] || variantColor;
}

function VariantSection({ result, publisherColors, formatColors, planColors }: {
  result: VariantResult;
  publisherColors: Record<string, string>;
  formatColors: Record<string, string>;
  planColors: Record<string, string>;
}) {
  const publisherData = useMemo(() => buildDistForVariant(result, 'publisher'), [result]);
  const formatData = useMemo(() => buildDistForVariant(result, 'type'), [result]);
  const planData = useMemo(() => buildDistForVariant(result, 'catalog_plus'), [result]);

  const variantColor = `hsl(${result.variant.color})`;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: variantColor }} />
        <h3 className="text-sm font-semibold text-foreground">{result.variant.name}</h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Editoras */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              <CardTitle className="text-xs">Editoras</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {publisherData.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Sem dados</p>
            ) : (
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={publisherData} layout="vertical" barCategoryGap="20%">
                    <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(215 15% 50%)' }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: 'hsl(215 15% 50%)' }} axisLine={false} tickLine={false} width={90} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(225 20% 9%)', border: '1px solid hsl(225 15% 16%)', borderRadius: '8px', fontSize: '11px' }} />
                    <Bar dataKey="value" radius={[0, 3, 3, 0]}>
                      {publisherData.map((entry, i) => (
                        <Cell key={i} fill={getColor(entry.name, publisherColors, variantColor)} opacity={entry.name === 'Outros' ? 0.5 : 1} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Formatos */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <FileType className="h-3.5 w-3.5 text-muted-foreground" />
              <CardTitle className="text-xs">Formatos</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {formatData.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Sem dados</p>
            ) : (
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={formatData} layout="vertical" barCategoryGap="20%">
                    <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(215 15% 50%)' }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: 'hsl(215 15% 50%)' }} axisLine={false} tickLine={false} width={70} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(225 20% 9%)', border: '1px solid hsl(225 15% 16%)', borderRadius: '8px', fontSize: '11px' }} />
                    <Bar dataKey="value" radius={[0, 3, 3, 0]}>
                      {formatData.map((entry, i) => (
                        <Cell key={i} fill={getColor(entry.name, formatColors, variantColor)} opacity={entry.name === 'Outros' ? 0.5 : 1} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Planos */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
              <CardTitle className="text-xs">Plano</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {planData.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Sem dados</p>
            ) : (
              <div className="h-44 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={planData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={55}
                      innerRadius={30}
                      paddingAngle={2}
                      label={({ name, value }) => `${name}: ${value}`}
                      labelLine={{ stroke: 'hsl(215 15% 40%)', strokeWidth: 0.5 }}
                    >
                      {planData.map((entry, i) => (
                        <Cell key={i} fill={getColor(entry.name, planColors, variantColor)} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(225 20% 9%)', border: '1px solid hsl(225 15% 16%)', borderRadius: '8px', fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function DistributionCharts({ results }: Props) {
  // Build global color maps so same entity = same color across all variants
  const publisherColors = useMemo(() => buildGlobalColorMap(results, 'publisher'), [results]);
  const formatColors = useMemo(() => buildGlobalColorMap(results, 'type'), [results]);
  const planColors = useMemo(() => buildGlobalColorMap(results, 'catalog_plus'), [results]);

  const avgResponseTimes = useMemo(() => {
    return results.map(r => {
      const times = r.keywordResults
        .map(kr => kr.responseTimeMs)
        .filter((t): t is number => t !== undefined && !isNaN(t));
      const avg = times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
      const min = times.length > 0 ? Math.min(...times) : 0;
      const max = times.length > 0 ? Math.max(...times) : 0;
      return { variant: r.variant, avg, min, max, count: times.length };
    });
  }, [results]);

  return (
    <div className="space-y-6">
      {results.map(r => (
        <VariantSection
          key={r.variant.id}
          result={r}
          publisherColors={publisherColors}
          formatColors={formatColors}
          planColors={planColors}
        />
      ))}

      {/* Response time */}
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
                {rt.count > 0 && (
                  <span className="text-[10px] font-mono-data text-muted-foreground/50">(min {rt.min}ms · max {rt.max}ms)</span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
