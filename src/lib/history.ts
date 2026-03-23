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

export function saveToHistory(entry: HistoryEntry) {
  const history = loadHistory();
  history.unshift(entry);
  if (history.length > MAX_ENTRIES) history.length = MAX_ENTRIES;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

export function renameHistoryEntry(id: string, name: string) {
  const history = loadHistory();
  const entry = history.find(e => e.id === id);
  if (entry) {
    entry.name = name;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  }
}

export function deleteHistoryEntry(id: string) {
  const history = loadHistory().filter(e => e.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
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
