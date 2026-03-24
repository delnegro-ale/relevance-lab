import { useState, useEffect } from 'react';
import { TestCase } from '@/types/experiment';
import { parseCsv } from '@/lib/csv-parser';
import { loadKeywordDatabase, saveKeywordDatabase, removeKeywordsFromDatabase, clearKeywordDatabase } from '@/lib/keyword-database';
import { Upload, Database, Trash2, CheckSquare, Square, Plus, GripVertical, ArrowDownAZ } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface Props {
  onUpload: (tc: TestCase[]) => void;
  testCases: TestCase[];
}

export function CsvUploader({ onUpload, testCases }: Props) {
  const [database, setDatabase] = useState<TestCase[]>(loadKeywordDatabase);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [showDb, setShowDb] = useState(true);
  const [manualKeyword, setManualKeyword] = useState('');
  const [manualIds, setManualIds] = useState('');

  useEffect(() => {
    // If there's a database but no test cases loaded, auto-show the database
    if (database.length > 0 && testCases.length === 0) {
      setShowDb(true);
      // Auto-select all
      setSelected(new Set(database.map(tc => tc.keyword)));
    }
  }, []);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCsv(text);
      // Save to database
      saveKeywordDatabase(parsed);
      setDatabase(loadKeywordDatabase());
      // Select all and load
      const allKeywords = new Set(loadKeywordDatabase().map(tc => tc.keyword));
      setSelected(allKeywords);
      onUpload(loadKeywordDatabase());
      setShowDb(true);
    };
    reader.readAsText(file);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const toggleKeyword = (keyword: string) => {
    const next = new Set(selected);
    if (next.has(keyword)) {
      next.delete(keyword);
    } else {
      next.add(keyword);
    }
    setSelected(next);
    // Update test cases with selected keywords
    const selectedCases = database.filter(tc => next.has(tc.keyword));
    onUpload(selectedCases);
  };

  const selectAll = () => {
    const filtered = getFiltered();
    const next = new Set(selected);
    filtered.forEach(tc => next.add(tc.keyword));
    setSelected(next);
    onUpload(database.filter(tc => next.has(tc.keyword)));
  };

  const deselectAll = () => {
    const filtered = getFiltered();
    const next = new Set(selected);
    filtered.forEach(tc => next.delete(tc.keyword));
    setSelected(next);
    onUpload(database.filter(tc => next.has(tc.keyword)));
  };

  const handleClearDb = () => {
    clearKeywordDatabase();
    setDatabase([]);
    setSelected(new Set());
    onUpload([]);
  };

  const handleRemoveKeyword = (keyword: string) => {
    removeKeywordsFromDatabase([keyword]);
    setDatabase(loadKeywordDatabase());
    const next = new Set(selected);
    next.delete(keyword);
    setSelected(next);
    onUpload(loadKeywordDatabase().filter(tc => next.has(tc.keyword)));
  };

  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const getFiltered = () => {
    return database.filter(tc => tc.keyword.toLowerCase().includes(search.toLowerCase()));
  };

  const handleSortAlpha = () => {
    const sorted = [...database].sort((a, b) => a.keyword.localeCompare(b.keyword, 'pt-BR', { sensitivity: 'base' }));
    // Save sorted order
    clearKeywordDatabase();
    saveKeywordDatabase(sorted);
    setDatabase(sorted);
  };

  const handleDragStart = (idx: number) => {
    setDragIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIdx(idx);
  };

  const handleDrop = (dropIdx: number) => {
    if (dragIdx === null || dragIdx === dropIdx) {
      setDragIdx(null);
      setDragOverIdx(null);
      return;
    }
    const arr = [...database];
    const [moved] = arr.splice(dragIdx, 1);
    arr.splice(dropIdx, 0, moved);
    clearKeywordDatabase();
    saveKeywordDatabase(arr);
    setDatabase(arr);
    setDragIdx(null);
    setDragOverIdx(null);
  };

  const filtered = getFiltered();

  const handleAddManual = () => {
    const keyword = manualKeyword.trim();
    if (!keyword) return;
    const ids = manualIds.split(',').map(id => id.trim()).filter(Boolean);
    if (ids.length === 0) return;

    const newCase: TestCase = { keyword, expectedIds: ids };
    saveKeywordDatabase([newCase]);
    const updated = loadKeywordDatabase();
    setDatabase(updated);
    const next = new Set(selected);
    next.add(keyword);
    setSelected(next);
    onUpload(updated.filter(tc => next.has(tc.keyword)));
    setShowDb(true);
    setManualKeyword('');
    setManualIds('');
  };

  return (
    <div className="space-y-4">
      {/* Manual input */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground font-medium">Adicionar manualmente</p>
        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-1">
            <Input
              placeholder="Keyword"
              value={manualKeyword}
              onChange={e => setManualKeyword(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div className="flex-[2] space-y-1">
            <Input
              placeholder="IDs esperados (separados por vírgula)"
              value={manualIds}
              onChange={e => setManualIds(e.target.value)}
              className="h-8 text-xs"
              onKeyDown={e => e.key === 'Enter' && handleAddManual()}
            />
          </div>
          <Button variant="outline" size="sm" className="h-8" onClick={handleAddManual} disabled={!manualKeyword.trim() || !manualIds.trim()}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Upload area */}
      <div
        onDrop={handleFileDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => document.getElementById('csv-input')?.click()}
        className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary/50 transition-colors cursor-pointer group"
      >
        <Upload className="mx-auto h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors mb-1" />
        <p className="text-xs text-muted-foreground">Arraste um CSV ou clique para selecionar</p>
        <p className="text-[10px] text-muted-foreground/60 mt-0.5">Formato: keyword,product_ids</p>
        <input id="csv-input" type="file" accept=".csv" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
      </div>

      {/* Database section */}
      {database.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowDb(!showDb)}
              className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
            >
              <Database className="h-4 w-4 text-primary" />
              Banco de Keywords
              <Badge variant="secondary" className="text-[10px]">{database.length} total</Badge>
              <Badge variant="outline" className="text-[10px]">{selected.size} selecionadas</Badge>
            </button>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-danger gap-1" onClick={handleClearDb}>
              <Trash2 className="h-3 w-3" /> Limpar banco
            </Button>
          </div>

          {showDb && (
            <div className="border border-border rounded-md overflow-hidden">
              {/* Search + actions */}
              <div className="flex items-center gap-2 p-2 bg-muted/30 border-b border-border">
                <Input
                  placeholder="Filtrar keywords..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="h-7 text-xs flex-1"
                />
                <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1" onClick={handleSortAlpha} title="Ordenar A-Z">
                  <ArrowDownAZ className="h-3.5 w-3.5" /> A-Z
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={selectAll}>
                  Selecionar todas
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={deselectAll}>
                  Limpar seleção
                </Button>
              </div>

              {/* Keyword list */}
              <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 480px)', minHeight: '120px' }}>
                {filtered.map((tc, idx) => {
                  const isSelected = selected.has(tc.keyword);
                  const globalIdx = database.findIndex(d => d.keyword === tc.keyword);
                  return (
                    <div
                      key={tc.keyword}
                      draggable={!search}
                      onDragStart={() => handleDragStart(globalIdx)}
                      onDragOver={(e) => handleDragOver(e, globalIdx)}
                      onDrop={() => handleDrop(globalIdx)}
                      onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
                      className={`flex items-center gap-2 px-3 py-2 border-b border-border/50 last:border-0 cursor-pointer transition-colors group ${
                        isSelected ? 'bg-primary/5' : 'hover:bg-muted/20'
                      } ${dragOverIdx === globalIdx ? 'border-t-2 border-t-primary' : ''}`}
                      onClick={() => toggleKeyword(tc.keyword)}
                    >
                      {!search && (
                        <div className="shrink-0 cursor-grab opacity-0 group-hover:opacity-60 hover:opacity-100 transition-opacity" onMouseDown={e => e.stopPropagation()}>
                          <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="shrink-0">
                        {isSelected ? (
                          <CheckSquare className="h-4 w-4 text-primary" />
                        ) : (
                          <Square className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <span className={`text-sm flex-1 ${isSelected ? 'font-medium' : 'text-muted-foreground'}`}>{tc.keyword}</span>
                      <span className="text-[10px] font-mono-data text-muted-foreground">{tc.expectedIds.length} IDs</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); handleRemoveKeyword(tc.keyword); }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
