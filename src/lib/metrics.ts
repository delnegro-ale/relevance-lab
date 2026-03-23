import { SearchHit, KeywordResult, VariantMetrics } from '@/types/experiment';

export function calculateKeywordMetrics(expectedIds: string[], hits: SearchHit[], topK = 10) {
  const topHits = hits.slice(0, topK);
  const hitIds = topHits.map(h => h.productId);
  const foundIds = expectedIds.filter(id => hitIds.includes(id));
  const missingIds = expectedIds.filter(id => !hitIds.includes(id));
  const hitRate = expectedIds.length > 0 ? foundIds.length / expectedIds.length : 0;

  let mrr = 0;
  for (const id of expectedIds) {
    const pos = hitIds.indexOf(id);
    if (pos !== -1) { mrr = 1 / (pos + 1); break; }
  }

  const positions = foundIds.map(id => hitIds.indexOf(id) + 1);
  const avgPosition = positions.length > 0 ? positions.reduce((a, b) => a + b, 0) / positions.length : null;
  const perfectMatch = missingIds.length === 0 && expectedIds.length > 0;

  return { foundIds, missingIds, hitRate, mrr, avgPosition, perfectMatch };
}

export function aggregateMetrics(keywordResults: KeywordResult[]): VariantMetrics {
  const n = keywordResults.length;
  if (n === 0) return { hitRate: 0, mrr: 0, coverage: 0, avgPosition: 0, perfectMatchRate: 0 };

  const hitRate = keywordResults.reduce((s, kr) => s + kr.hitRate, 0) / n;
  const mrr = keywordResults.reduce((s, kr) => s + kr.mrr, 0) / n;
  const coverage = keywordResults.filter(kr => kr.foundIds.length > 0).length / n;
  const withPos = keywordResults.filter(kr => kr.avgPosition !== null);
  const avgPosition = withPos.length > 0 ? withPos.reduce((s, kr) => s + (kr.avgPosition || 0), 0) / withPos.length : 0;
  const perfectMatchRate = keywordResults.filter(kr => kr.perfectMatch).length / n;

  return { hitRate, mrr, coverage, avgPosition, perfectMatchRate };
}
