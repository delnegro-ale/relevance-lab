import { VariantResult, KeywordResult, VariantMetrics, VariantConfig, SearchHit } from '@/types/experiment';

/**
 * Sanitizes a VariantResult array to ensure all required fields exist with safe defaults.
 * This prevents crashes when rendering data from localStorage/history that may be incomplete.
 */
export function sanitizeResults(results: unknown): VariantResult[] {
  if (!Array.isArray(results)) return [];

  return results.map(r => sanitizeVariantResult(r)).filter(Boolean) as VariantResult[];
}

function sanitizeVariantResult(r: any): VariantResult | null {
  if (!r || typeof r !== 'object') return null;

  const variant = sanitizeVariant(r.variant);
  if (!variant) return null;

  const keywordResults = Array.isArray(r.keywordResults)
    ? r.keywordResults.map(sanitizeKeywordResult).filter(Boolean) as KeywordResult[]
    : [];

  const metrics = sanitizeMetrics(r.metrics, keywordResults);

  return {
    variant,
    keywordResults,
    metrics,
    errorCount: typeof r.errorCount === 'number' ? r.errorCount : 0,
  };
}

function sanitizeVariant(v: any): VariantConfig | null {
  if (!v || typeof v !== 'object') return null;
  return {
    id: String(v.id || `variant-${Date.now()}-${Math.random()}`),
    name: String(v.name || 'Motor sem nome'),
    type: v.type === 'baseline' ? 'baseline' : 'elasticsearch',
    endpoint: String(v.endpoint || ''),
    payload: v.payload != null ? String(v.payload) : undefined,
    color: String(v.color || '262 80% 60%'),
  };
}

function sanitizeKeywordResult(kr: any): KeywordResult | null {
  if (!kr || typeof kr !== 'object') return null;
  
  const expectedIds = Array.isArray(kr.expectedIds) ? kr.expectedIds.map(String) : [];
  const hits = Array.isArray(kr.hits) ? kr.hits.map(sanitizeHit).filter(Boolean) as SearchHit[] : [];
  const foundIds = Array.isArray(kr.foundIds) ? kr.foundIds.map(String) : [];
  const missingIds = Array.isArray(kr.missingIds) ? kr.missingIds.map(String) : [];

  return {
    keyword: String(kr.keyword || ''),
    expectedIds,
    hits,
    foundIds,
    missingIds,
    hitRate: typeof kr.hitRate === 'number' && !isNaN(kr.hitRate) ? kr.hitRate : 0,
    mrr: typeof kr.mrr === 'number' && !isNaN(kr.mrr) ? kr.mrr : 0,
    avgPosition: typeof kr.avgPosition === 'number' && !isNaN(kr.avgPosition) ? kr.avgPosition : null,
    perfectMatch: Boolean(kr.perfectMatch),
    error: kr.error ? String(kr.error) : undefined,
  };
}

function sanitizeHit(hit: any): SearchHit | null {
  if (!hit || typeof hit !== 'object') return null;
  return {
    productId: String(hit.productId || hit.product_id || hit.id || ''),
    title: hit.title != null ? String(hit.title) : undefined,
    position: typeof hit.position === 'number' ? hit.position : 0,
    score: typeof hit.score === 'number' && !isNaN(hit.score) ? hit.score : undefined,
    publisher: hit.publisher != null ? String(hit.publisher) : undefined,
    format: hit.format != null ? String(hit.format) : undefined,
    coverUrl: hit.coverUrl != null ? String(hit.coverUrl) : undefined,
  };
}

function sanitizeMetrics(m: any, keywordResults: KeywordResult[]): VariantMetrics {
  if (m && typeof m === 'object' &&
    typeof m.hitRate === 'number' && typeof m.mrr === 'number') {
    return {
      hitRate: isNaN(m.hitRate) ? 0 : m.hitRate,
      mrr: isNaN(m.mrr) ? 0 : m.mrr,
      coverage: typeof m.coverage === 'number' && !isNaN(m.coverage) ? m.coverage : 0,
      avgPosition: typeof m.avgPosition === 'number' && !isNaN(m.avgPosition) ? m.avgPosition : 0,
      perfectMatchRate: typeof m.perfectMatchRate === 'number' && !isNaN(m.perfectMatchRate) ? m.perfectMatchRate : 0,
    };
  }

  // Recompute from keywordResults if metrics are missing
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
