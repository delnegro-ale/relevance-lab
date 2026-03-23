import { useState, useRef, useCallback } from 'react';
import { Experiment, TestCase, VariantConfig, VariantResult, KeywordResult, VARIANT_COLORS, DEFAULT_BASELINE_ENDPOINT, DEFAULT_ES_ENDPOINT, DEFAULT_ES_PAYLOAD } from '@/types/experiment';
import { searchBaseline, searchElasticsearch } from '@/lib/search-api';
import { calculateKeywordMetrics, aggregateMetrics } from '@/lib/metrics';

const initialExperiment: Experiment = {
  testCases: [],
  variants: [
    { id: 'baseline', name: 'Baseline (Produção)', type: 'baseline', endpoint: DEFAULT_BASELINE_ENDPOINT, color: VARIANT_COLORS[0] },
    { id: 'variant-1', name: 'OpenSearch Default', type: 'elasticsearch', endpoint: DEFAULT_ES_ENDPOINT, payload: DEFAULT_ES_PAYLOAD, color: VARIANT_COLORS[1] },
  ],
  results: [],
  status: 'setup',
  progress: { current: 0, total: 0, keyword: '' },
};

export function useExperiment() {
  const [experiment, setExperiment] = useState<Experiment>(initialExperiment);
  const stateRef = useRef(experiment);
  stateRef.current = experiment;

  const setTestCases = useCallback((testCases: TestCase[]) => {
    setExperiment(e => ({ ...e, testCases }));
  }, []);

  const addVariant = useCallback(() => {
    setExperiment(e => {
      const idx = e.variants.length;
      return {
        ...e,
        variants: [...e.variants, {
          id: `variant-${Date.now()}`,
          name: `Variante ${idx}`,
          type: 'elasticsearch' as const,
          endpoint: DEFAULT_ES_ENDPOINT,
          payload: DEFAULT_ES_PAYLOAD,
          color: VARIANT_COLORS[idx % VARIANT_COLORS.length],
        }],
      };
    });
  }, []);

  const updateVariant = useCallback((id: string, updates: Partial<VariantConfig>) => {
    setExperiment(e => ({ ...e, variants: e.variants.map(v => v.id === id ? { ...v, ...updates } : v) }));
  }, []);

  const removeVariant = useCallback((id: string) => {
    setExperiment(e => ({ ...e, variants: e.variants.filter(v => v.id !== id) }));
  }, []);

  const duplicateVariant = useCallback((id: string) => {
    setExperiment(e => {
      const source = e.variants.find(v => v.id === id);
      if (!source) return e;
      return {
        ...e,
        variants: [...e.variants, {
          ...source,
          id: `variant-${Date.now()}`,
          name: `${source.name} (cópia)`,
          color: VARIANT_COLORS[e.variants.length % VARIANT_COLORS.length],
        }],
      };
    });
  }, []);

  const runBenchmark = useCallback(async () => {
    const { testCases, variants } = stateRef.current;
    const total = testCases.length * variants.length;
    let current = 0;

    setExperiment(e => ({ ...e, status: 'running', progress: { current: 0, total, keyword: '' }, results: [] }));

    const allResults: VariantResult[] = [];

    for (const variant of variants) {
      const keywordResults: KeywordResult[] = [];

      for (const tc of testCases) {
        current++;
        setExperiment(e => ({ ...e, progress: { current, total, keyword: tc.keyword } }));

        let hits: import('@/types/experiment').SearchHit[] = [];
        try {
          if (variant.type === 'baseline') {
            hits = await searchBaseline(tc.keyword);
          } else {
            hits = await searchElasticsearch(tc.keyword, variant.endpoint, variant.payload || '');
          }
        } catch (err) {
          console.error(`Error: "${tc.keyword}" / ${variant.name}:`, err);
        }

        const m = calculateKeywordMetrics(tc.expectedIds, hits);
        keywordResults.push({
          keyword: tc.keyword, expectedIds: tc.expectedIds, hits,
          foundIds: m.foundIds, missingIds: m.missingIds, hitRate: m.hitRate,
          mrr: m.mrr, avgPosition: m.avgPosition, perfectMatch: m.perfectMatch,
        });

        await new Promise(r => setTimeout(r, 150));
      }

      allResults.push({ variant, keywordResults, metrics: aggregateMetrics(keywordResults) });
    }

    setExperiment(e => ({ ...e, status: 'complete', results: allResults }));
  }, []);

  return { experiment, setTestCases, addVariant, updateVariant, removeVariant, duplicateVariant, runBenchmark, setExperiment };
}
