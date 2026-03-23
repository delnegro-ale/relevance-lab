import { TestCase } from '@/types/experiment';

const STORAGE_KEY = 'search-lab-keyword-db';

export function loadKeywordDatabase(): TestCase[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as TestCase[];
  } catch {
    return [];
  }
}

export function saveKeywordDatabase(testCases: TestCase[]) {
  // Merge: keep unique by keyword, newer overwrites
  const existing = loadKeywordDatabase();
  const map = new Map<string, TestCase>();
  for (const tc of existing) map.set(tc.keyword, tc);
  for (const tc of testCases) map.set(tc.keyword, tc);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(map.values())));
}

export function removeKeywordsFromDatabase(keywords: string[]) {
  const db = loadKeywordDatabase().filter(tc => !keywords.includes(tc.keyword));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

export function clearKeywordDatabase() {
  localStorage.removeItem(STORAGE_KEY);
}
