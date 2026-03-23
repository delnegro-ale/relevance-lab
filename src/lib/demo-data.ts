import { TestCase, VariantConfig, VariantResult, KeywordResult, SearchHit, VARIANT_COLORS, DEFAULT_BASELINE_ENDPOINT, DEFAULT_ES_ENDPOINT, DEFAULT_ES_PAYLOAD } from '@/types/experiment';
import { calculateKeywordMetrics, aggregateMetrics } from './metrics';

export const DEMO_TEST_CASES: TestCase[] = [
  { keyword: 'poder do hábito', expectedIds: ['1422248', '1366241'] },
  { keyword: 'segredos obscuros', expectedIds: ['1085593', '1077661'] },
  { keyword: 'como fazer amigos', expectedIds: ['1234567', '1234568'] },
  { keyword: 'pai rico pai pobre', expectedIds: ['1111111', '1111112'] },
  { keyword: 'harry potter', expectedIds: ['2222222', '2222223'] },
  { keyword: 'mindset', expectedIds: ['3333333'] },
  { keyword: 'sapiens', expectedIds: ['4444444', '4444445'] },
  { keyword: 'o alquimista', expectedIds: ['5555555'] },
  { keyword: 'a sutil arte', expectedIds: ['6666666', '6666667'] },
  { keyword: 'atomic habits', expectedIds: ['7777777'] },
];

export const DEMO_VARIANTS: VariantConfig[] = [
  { id: 'baseline', name: 'Baseline (Produção)', type: 'baseline', endpoint: DEFAULT_BASELINE_ENDPOINT, color: VARIANT_COLORS[0] },
  { id: 'variant-default', name: 'OpenSearch Default', type: 'elasticsearch', endpoint: DEFAULT_ES_ENDPOINT, payload: DEFAULT_ES_PAYLOAD, color: VARIANT_COLORS[1] },
  { id: 'variant-tuned', name: 'OpenSearch Tuned', type: 'elasticsearch', endpoint: DEFAULT_ES_ENDPOINT, payload: DEFAULT_ES_PAYLOAD, color: VARIANT_COLORS[2] },
];

export function generateDemoResults(): VariantResult[] {
  const patterns: Record<string, number[][]> = {
    baseline: [[3,8],[1,5],[0,0],[2,4],[1,0],[6],[0,0],[1],[4,9],[0]],
    'variant-default': [[1,3],[2,7],[1,6],[1,3],[1,2],[2],[3,7],[1],[2,5],[3]],
    'variant-tuned': [[1,2],[1,4],[1,3],[1,2],[1,3],[1],[2,5],[2],[1,3],[1]],
  };

  return DEMO_VARIANTS.map(variant => {
    const posData = patterns[variant.id] || patterns.baseline;

    const keywordResults: KeywordResult[] = DEMO_TEST_CASES.map((tc, ki) => {
      const positions = posData[ki] || [];
      const hits: SearchHit[] = Array.from({ length: 10 }, (_, i) => ({
        productId: String(9000000 + ki * 100 + i),
        title: `Produto ${ki * 10 + i + 1}`,
        position: i + 1,
        score: parseFloat((100 - i * 8 + Math.random() * 2).toFixed(1)),
      }));

      tc.expectedIds.forEach((id, idx) => {
        const pos = positions[idx];
        if (pos && pos >= 1 && pos <= 10) {
          hits[pos - 1] = { productId: id, title: `Esperado: ${tc.keyword}`, position: pos, score: hits[pos - 1].score };
        }
      });

      const m = calculateKeywordMetrics(tc.expectedIds, hits);
      return {
        keyword: tc.keyword, expectedIds: tc.expectedIds, hits,
        foundIds: m.foundIds, missingIds: m.missingIds, hitRate: m.hitRate,
        mrr: m.mrr, avgPosition: m.avgPosition, perfectMatch: m.perfectMatch,
      };
    });

    return { variant, keywordResults, metrics: aggregateMetrics(keywordResults) };
  });
}
