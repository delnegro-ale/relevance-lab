import { VariantConfig } from '@/types/experiment';

export interface SavedVariant {
  id: string;
  name: string;
  endpoint: string;
  payload?: string;
  savedAt: number;
}

const STORAGE_KEY = 'search-lab-variant-library';

export function loadVariantLibrary(): SavedVariant[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedVariant[];
  } catch {
    return [];
  }
}

export function saveVariantToLibrary(variant: VariantConfig): SavedVariant {
  const library = loadVariantLibrary();
  const saved: SavedVariant = {
    id: `saved-${Date.now()}`,
    name: variant.name,
    endpoint: variant.endpoint,
    payload: variant.payload,
    savedAt: Date.now(),
  };
  // Replace if same name exists
  const existingIdx = library.findIndex(v => v.name === variant.name);
  if (existingIdx >= 0) {
    library[existingIdx] = saved;
  } else {
    library.push(saved);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(library));
  return saved;
}

export function deleteFromLibrary(id: string) {
  const library = loadVariantLibrary().filter(v => v.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(library));
}

export function renameInLibrary(id: string, name: string) {
  const library = loadVariantLibrary();
  const entry = library.find(v => v.id === id);
  if (entry) {
    entry.name = name;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(library));
  }
}
