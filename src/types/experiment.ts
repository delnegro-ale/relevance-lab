export interface TestCase {
  keyword: string;
  expectedIds: string[];
}

export interface VariantConfig {
  id: string;
  name: string;
  type: 'baseline' | 'elasticsearch';
  endpoint: string;
  payload?: string;
  color: string;
}

export interface SearchHit {
  productId: string;
  title?: string;
  position: number;
  score?: number;
}

export interface KeywordResult {
  keyword: string;
  expectedIds: string[];
  hits: SearchHit[];
  foundIds: string[];
  missingIds: string[];
  hitRate: number;
  mrr: number;
  avgPosition: number | null;
  perfectMatch: boolean;
  error?: string;
}

export interface VariantMetrics {
  hitRate: number;
  mrr: number;
  coverage: number;
  avgPosition: number;
  perfectMatchRate: number;
}

export interface VariantResult {
  variant: VariantConfig;
  keywordResults: KeywordResult[];
  metrics: VariantMetrics;
}

export interface Experiment {
  testCases: TestCase[];
  variants: VariantConfig[];
  results: VariantResult[];
  status: 'setup' | 'running' | 'complete' | 'error';
  progress: { current: number; total: number; keyword: string };
}

export const VARIANT_COLORS = [
  '172 66% 50%',
  '38 92% 50%',
  '262 80% 60%',
  '350 80% 60%',
  '142 70% 45%',
  '200 80% 55%',
];

export const DEFAULT_BASELINE_ENDPOINT = 'https://api.ubook.com/search/real-time';

export const DEFAULT_ES_ENDPOINT = 'https://vpc-hml-ubook-search-001-vyzt4xxmgevrjxhawtulsbkogu.us-east-1.es.amazonaws.com/products-v1.0/_search';

export const DEFAULT_ES_PAYLOAD = `{
  "query": {
    "function_score": {
      "query": {
        "bool": {
          "must": [
            {
              "multi_match": {
                "query": "{{keyword}}",
                "fields": ["title^70", "title_only^51", "subtitle^15", "author^20"],
                "type": "best_fields",
                "fuzziness": "AUTO",
                "operator": "or"
              }
            }
          ],
          "should": [
            { "match": { "language.keyword": { "query": "pt-br", "boost": 2 } } }
          ],
          "filter": [
            { "term": { "libraries.id": "105" } }
          ]
        }
      },
      "functions": [
        { "field_value_factor": { "field": "audience_rank", "factor": 0.05, "modifier": "log1p", "missing": 0 } },
        { "field_value_factor": { "field": "audience_last_two_weeks_by_marketplace.marketplace_0", "factor": 0.05, "modifier": "log1p", "missing": 10 } }
      ],
      "score_mode": "multiply",
      "boost_mode": "multiply"
    }
  },
  "sort": [{ "_score": { "order": "desc" } }],
  "from": 0,
  "size": 10
}`;
