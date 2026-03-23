import { TestCase } from '@/types/experiment';

export function parseCsv(content: string): TestCase[] {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];

  return lines.slice(1).filter(l => l.trim()).map(line => {
    const firstComma = line.indexOf(',');
    if (firstComma === -1) return null;

    const keyword = line.substring(0, firstComma).trim();
    let idsStr = line.substring(firstComma + 1).trim();

    if (idsStr.startsWith('"') && idsStr.endsWith('"')) {
      idsStr = idsStr.slice(1, -1);
    }

    const expectedIds = idsStr.split(',').map(id => id.trim()).filter(Boolean);
    return { keyword, expectedIds };
  }).filter(Boolean) as TestCase[];
}
