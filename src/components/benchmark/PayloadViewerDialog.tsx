import { useState, useCallback, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Copy, ChevronsUpDown, ChevronsDownUp, Check } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payload: Record<string, any>;
  title?: string;
}

interface FoldState {
  [key: string]: boolean;
}

function generateFoldableLines(obj: any, indent: number = 0, path: string = 'root', foldState: FoldState): { lines: string[]; foldableAt: Set<number>; foldRanges: Map<number, number> } {
  const lines: string[] = [];
  const foldableAt = new Set<number>();
  const foldRanges = new Map<number, number>();
  const json = JSON.stringify(obj, null, 2);
  const rawLines = json.split('\n');
  
  // Determine foldable regions by bracket matching
  const stack: number[] = [];
  for (let i = 0; i < rawLines.length; i++) {
    const trimmed = rawLines[i].trimEnd();
    const openBracket = trimmed.match(/[\[{]\s*$/);
    if (openBracket) {
      stack.push(i);
    }
    const closeBracket = trimmed.match(/^\s*[\]}]/);
    if (closeBracket && stack.length > 0) {
      const start = stack.pop()!;
      if (i - start > 1) {
        foldableAt.add(start);
        foldRanges.set(start, i);
      }
    }
  }

  return { lines: rawLines, foldableAt, foldRanges };
}

export function PayloadViewerDialog({ open, onOpenChange, payload, title }: Props) {
  const formatted = JSON.stringify(payload, null, 2);
  const [copied, setCopied] = useState(false);
  const [foldedLines, setFoldedLines] = useState<Set<number>>(new Set());
  const [panelWidth, setPanelWidth] = useState(720);
  const [isResizing, setIsResizing] = useState(false);

  const { lines, foldableAt, foldRanges } = useMemo(() => {
    const rawLines = formatted.split('\n');
    const foldableAt = new Set<number>();
    const foldRanges = new Map<number, number>();
    const stack: number[] = [];
    
    for (let i = 0; i < rawLines.length; i++) {
      const trimmed = rawLines[i].trimEnd();
      if (/[\[{]\s*$/.test(trimmed)) {
        stack.push(i);
      }
      if (/^\s*[\]}]/.test(trimmed) && stack.length > 0) {
        const start = stack.pop()!;
        if (i - start > 1) {
          foldableAt.add(start);
          foldRanges.set(start, i);
        }
      }
    }
    
    return { lines: rawLines, foldableAt, foldRanges };
  }, [formatted]);

  const visibleLines = useMemo(() => {
    const result: { line: string; originalIndex: number; isFolded: boolean }[] = [];
    let skipUntil = -1;
    
    for (let i = 0; i < lines.length; i++) {
      if (i <= skipUntil) continue;
      
      if (foldedLines.has(i) && foldRanges.has(i)) {
        const endLine = foldRanges.get(i)!;
        const closingChar = lines[endLine].trim();
        result.push({ line: lines[i].replace(/\s*$/, '') + ` ... ${closingChar}`, originalIndex: i, isFolded: true });
        skipUntil = endLine;
      } else {
        result.push({ line: lines[i], originalIndex: i, isFolded: false });
      }
    }
    return result;
  }, [lines, foldedLines, foldRanges]);

  const handleCopy = () => {
    navigator.clipboard.writeText(formatted);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleFold = (lineIndex: number) => {
    setFoldedLines(prev => {
      const next = new Set(prev);
      if (next.has(lineIndex)) next.delete(lineIndex);
      else next.add(lineIndex);
      return next;
    });
  };

  const foldAll = () => {
    setFoldedLines(new Set(foldableAt));
  };

  const unfoldAll = () => {
    setFoldedLines(new Set());
  };

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    const startX = e.clientX;
    const startWidth = panelWidth;

    const onMouseMove = (e: MouseEvent) => {
      const diff = startX - e.clientX;
      const newWidth = Math.max(400, Math.min(window.innerWidth * 0.9, startWidth + diff));
      setPanelWidth(newWidth);
    };

    const onMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [panelWidth]);

  const highlightJson = (text: string) => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"([^"]*)"(\s*:)/g, '<span class="json-key">"$1"</span>$2')
      .replace(/:\s*"([^"]*)"/g, ': <span class="json-string">"$1"</span>')
      .replace(/:\s*(\d+\.?\d*)/g, ': <span class="json-number">$1</span>')
      .replace(/:\s*(true|false)/g, ': <span class="json-boolean">$1</span>')
      .replace(/:\s*(null)/g, ': <span class="json-null">$1</span>')
      .replace(/\.\.\./g, '<span class="json-fold-indicator">...</span>');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        className="p-0 flex flex-col border-l border-border"
        style={{ width: panelWidth, maxWidth: '90vw', minWidth: 400 }}
      >
        {/* Resize handle */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-primary/20 active:bg-primary/30 transition-colors z-50"
          onMouseDown={handleResizeStart}
        />

        <SheetHeader className="p-4 pb-3 border-b border-border shrink-0">
          <SheetTitle className="text-sm">
            Payload Original
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground truncate">
            {title || 'Dados retornados pela API'}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-auto bg-[#1d1f21] font-mono text-xs" style={{ fontSize: 12, lineHeight: '1.6' }}>
          <table className="w-full border-collapse">
            <tbody>
              {visibleLines.map(({ line, originalIndex, isFolded }) => (
                <tr
                  key={originalIndex}
                  className="hover:bg-white/5 transition-colors"
                >
                  <td className="text-right pr-3 pl-3 py-0 select-none text-[#636d83] w-[1%] whitespace-nowrap align-top" style={{ fontSize: 11 }}>
                    {originalIndex + 1}
                  </td>
                  <td className="py-0 pr-4 relative">
                    <div className="flex items-start">
                      {foldableAt.has(originalIndex) && (
                        <button
                          onClick={() => toggleFold(originalIndex)}
                          className="shrink-0 w-4 h-4 flex items-center justify-center text-[#636d83] hover:text-white transition-colors mr-0.5 mt-0.5"
                          title={isFolded ? 'Expandir' : 'Colapsar'}
                        >
                          {isFolded ? '▶' : '▼'}
                        </button>
                      )}
                      {!foldableAt.has(originalIndex) && <span className="shrink-0 w-4 mr-0.5" />}
                      <pre
                        className="whitespace-pre text-[#c5c8c6] m-0 p-0"
                        dangerouslySetInnerHTML={{ __html: highlightJson(line) }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-3 border-t border-border flex items-center gap-2 shrink-0">
          <Button variant="ghost" size="sm" onClick={handleCopy} className="text-xs gap-1">
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? 'Copiado' : 'Copiar'}
          </Button>
          <Button variant="ghost" size="sm" onClick={foldAll} className="text-xs gap-1">
            <ChevronsDownUp className="h-3 w-3" /> Colapsar tudo
          </Button>
          <Button variant="ghost" size="sm" onClick={unfoldAll} className="text-xs gap-1">
            <ChevronsUpDown className="h-3 w-3" /> Expandir tudo
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
