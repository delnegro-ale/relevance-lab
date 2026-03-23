import { VariantConfig, TestCase } from '@/types/experiment';

const VARIANTS_KEY = 'search-lab-last-variants';
const TEST_CASES_KEY = 'search-lab-last-testcases';

export function saveLastConfig(variants: VariantConfig[], testCases: TestCase[]) {
  try {
    localStorage.setItem(VARIANTS_KEY, JSON.stringify(variants));
    localStorage.setItem(TEST_CASES_KEY, JSON.stringify(testCases));
  } catch {}
}

export function loadLastConfig(): { variants: VariantConfig[] | null; testCases: TestCase[] | null } {
  try {
    const v = localStorage.getItem(VARIANTS_KEY);
    const t = localStorage.getItem(TEST_CASES_KEY);
    return {
      variants: v ? JSON.parse(v) : null,
      testCases: t ? JSON.parse(t) : null,
    };
  } catch {
    return { variants: null, testCases: null };
  }
}
