import { VariantResult, VariantConfig, TestCase } from '@/types/experiment';

export interface HistoryEntry {
  id: string;
  name: string;
  timestamp: number;
  variantNames: string[];
  keywordCount: number;
  results: VariantResult[];
  testCases: TestCase[];
  variants: VariantConfig[];
}

export interface HistorySaveResult {
  ok: boolean;
  error?: string;
  warning?: string;
}

const STORAGE_KEY = 'search-lab-history';
const MAX_ENTRIES = 20;

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as HistoryEntry[];
  } catch {
    return [];
  }
}

export function saveToHistory(entry: HistoryEntry): HistorySaveResult {
  const history = loadHistory().map(compactHistoryEntry);
  history.unshift(compactHistoryEntry(entry));
  if (history.length > MAX_ENTRIES) history.length = MAX_ENTRIES;
  return persistHistory(history, true);
}

export function renameHistoryEntry(id: string, name: string) {
  const history = loadHistory().map(compactHistoryEntry);
  const entry = history.find(e => e.id === id);
  if (entry) {
    entry.name = name;
    persistHistory(history, false);
  }
}

export function deleteHistoryEntry(id: string) {
  const history = loadHistory()
    .map(compactHistoryEntry)
    .filter(e => e.id !== id);
  persistHistory(history, false);
}

export function createHistoryEntry(
  results: VariantResult[],
  testCases: TestCase[],
  variants: VariantConfig[]
): HistoryEntry {
  return {
    id: `run-${Date.now()}`,
    name: `Execução ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
    timestamp: Date.now(),
    variantNames: variants.map(v => v.name),
    keywordCount: testCases.length,
    results,
    testCases,
    variants,
  };
}

function compactHistoryEntry(entry: HistoryEntry): HistoryEntry {
  return {
    ...entry,
    results: Array.isArray(entry.results)
      ? entry.results.map(result => ({
          ...result,
          keywordResults: Array.isArray(result.keywordResults)
            ? result.keywordResults.map(kr => ({
                ...kr,
                rawResponse: undefined,
                hits: Array.isArray(kr.hits)
                  ? kr.hits.map(hit => ({
                      ...hit,
                      rawPayload: undefined,
                    }))
                  : [],
              }))
            : [],
        }))
      : [],
  };
}

function persistHistory(history: HistoryEntry[], reportWarnings: boolean): HistorySaveResult {
  const entries = history.slice(0, MAX_ENTRIES);
  let removedEntries = 0;

  while (entries.length > 0) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
      if (reportWarnings && removedEntries > 0) {
        return {
          ok: true,
          warning: `O benchmark foi concluído, mas o histórico precisou ser reduzido para caber no armazenamento local. ${removedEntries} execução(ões) antiga(s) foram removidas.`,
        };
      }
      return { ok: true };
    } catch (error) {
      console.error('[History] Failed to persist history:', error);

      if (!isQuotaExceeded(error) || entries.length === 1) {
        return {
          ok: false,
          error: isQuotaExceeded(error)
            ? 'O benchmark foi concluído, mas não foi possível salvar esta execução no histórico porque o volume de dados excedeu o limite de armazenamento local do navegador.'
            : `O benchmark foi concluído, mas houve uma falha ao salvar o histórico: ${formatError(error)}`,
        };
      }

      entries.pop();
      removedEntries++;
    }
  }

  return {
    ok: false,
    error: 'O benchmark foi concluído, mas não foi possível salvar o histórico desta execução.',
  };
}

function isQuotaExceeded(error: unknown): boolean {
  if (error instanceof DOMException) {
    return error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED';
  }

  const message = formatError(error).toLowerCase();
  return message.includes('quota') || message.includes('storage') || message.includes('exceeded');
}

function formatError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error || 'erro desconhecido');
}
