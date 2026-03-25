import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/components/prism-json';
import 'prismjs/themes/prism-tomorrow.css';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payload: Record<string, any>;
  title?: string;
}

export function PayloadViewerDialog({ open, onOpenChange, payload, title }: Props) {
  const formatted = JSON.stringify(payload, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(formatted);
  };

  const highlight = (code: string) =>
    Prism.highlight(code, Prism.languages.json, 'json');

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl lg:max-w-3xl p-0 flex flex-col">
        <SheetHeader className="p-4 pb-3 border-b border-border shrink-0">
          <SheetTitle className="text-sm">
            Payload Original
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground truncate">
            {title || 'Dados retornados pela API'}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-auto bg-[#1d1f21]">
          <Editor
            value={formatted}
            onValueChange={() => {}}
            highlight={highlight}
            padding={16}
            className="json-code-editor"
            style={{
              fontFamily: 'var(--font-mono-data, "JetBrains Mono", monospace)',
              fontSize: 12,
              lineHeight: 1.6,
              minHeight: '100%',
            }}
            textareaClassName="focus:outline-none"
            readOnly
          />
        </div>

        <div className="p-3 border-t border-border flex items-center gap-2 shrink-0">
          <Button variant="ghost" size="sm" onClick={handleCopy} className="text-xs gap-1">
            <Copy className="h-3 w-3" /> Copiar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
