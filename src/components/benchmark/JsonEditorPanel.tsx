import { useState, useEffect, useCallback, useRef } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, AlertTriangle, BookOpen, ChevronDown, ChevronRight, Copy, RotateCcw } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  onChange: (value: string) => void;
  defaultValue?: string;
}

const PARAM_DOCS = [
  {
    title: 'multi_match',
    description: 'Busca o termo em múltiplos campos ao mesmo tempo. Ideal para buscar em título, autor e subtítulo simultaneamente.',
    fields: [
      { name: 'type', values: ['best_fields', 'most_fields', 'cross_fields', 'phrase', 'phrase_prefix'], tip: 'best_fields = melhor campo vence. cross_fields = combina campos. phrase = busca exata.' },
      { name: 'fuzziness', values: ['AUTO', '0', '1', '2'], tip: 'AUTO = tolerância a erros de digitação proporcional ao tamanho da palavra.' },
      { name: 'operator', values: ['or', 'and'], tip: 'or = encontra documentos com qualquer termo. and = exige todos os termos.' },
    ],
  },
  {
    title: 'function_score',
    description: 'Ajusta a pontuação dos resultados usando fatores extras como popularidade ou audiência.',
    fields: [
      { name: 'score_mode', values: ['multiply', 'sum', 'avg', 'first', 'max', 'min'], tip: 'Como combinar as pontuações das múltiplas funções entre si.' },
      { name: 'boost_mode', values: ['multiply', 'replace', 'sum', 'avg', 'max', 'min'], tip: 'Como combinar a pontuação das funções com a pontuação original da query.' },
    ],
  },
  {
    title: 'field_value_factor',
    description: 'Usa o valor de um campo numérico para influenciar o ranking. Ex: popularidade.',
    fields: [
      { name: 'modifier', values: ['none', 'log', 'log1p', 'log2p', 'ln', 'ln1p', 'ln2p', 'square', 'sqrt', 'reciprocal'], tip: 'log1p = suaviza a influência. sqrt = efeito intermediário. none = usa o valor bruto.' },
    ],
  },
  {
    title: 'Campos de busca (fields)',
    description: 'Campos onde o texto é buscado, com boost (peso) para priorizar certos campos.',
    fields: [
      { name: 'title^70', values: [], tip: 'O número após ^ é o peso. Valores maiores = mais importância para esse campo.' },
    ],
  },
];

function highlightJson(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Strings
    .replace(/"([^"\\]*(\\.[^"\\]*)*)"/g, (match) => {
      // Check if it looks like a key (followed by :)
      return `<span class="json-string">${match}</span>`;
    })
    // Numbers
    .replace(/\b(-?\d+\.?\d*([eE][+-]?\d+)?)\b/g, '<span class="json-number">$1</span>')
    // Booleans & null
    .replace(/\b(true|false|null)\b/g, '<span class="json-bool">$1</span>')
    // Then fix keys (strings before colons)
    .replace(/<span class="json-string">("(?:[^"\\]|\\.)*")<\/span>\s*:/g, '<span class="json-key">$1</span>:');
}

export function JsonEditorPanel({ open, onOpenChange, value, onChange, defaultValue }: Props) {
  const [localValue, setLocalValue] = useState(value);
  const [isValid, setIsValid] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    setLocalValue(value);
    validateJson(value);
  }, [value]);

  const validateJson = useCallback((text: string) => {
    try {
      JSON.parse(text);
      setIsValid(true);
      setErrorMsg('');
    } catch (e: any) {
      setIsValid(false);
      setErrorMsg(e.message || 'JSON inválido');
    }
  }, []);

  const handleChange = (text: string) => {
    setLocalValue(text);
    validateJson(text);
  };

  const syncScroll = () => {
    if (textareaRef.current && preRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop;
      preRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  const handleApply = () => {
    if (isValid) {
      onChange(localValue);
      onOpenChange(false);
    }
  };

  const handleFormat = () => {
    try {
      const formatted = JSON.stringify(JSON.parse(localValue), null, 2);
      setLocalValue(formatted);
      validateJson(formatted);
    } catch { /* ignore */ }
  };

  const handleReset = () => {
    if (defaultValue) {
      setLocalValue(defaultValue);
      validateJson(defaultValue);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(localValue);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl lg:max-w-3xl p-0 flex flex-col">
        <SheetHeader className="p-4 pb-3 border-b border-border shrink-0">
          <SheetTitle className="text-sm flex items-center gap-2">
            Editor de Payload JSON
            {isValid ? (
              <Badge variant="outline" className="text-success border-success/30 text-[10px] gap-1">
                <Check className="h-3 w-3" /> Válido
              </Badge>
            ) : (
              <Badge variant="outline" className="text-danger border-danger/30 text-[10px] gap-1">
                <AlertTriangle className="h-3 w-3" /> Inválido
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            Use <code className="px-1 py-0.5 rounded bg-muted text-primary font-mono-data text-[11px]">{'{{keyword}}'}</code> como placeholder para o termo de busca.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Editor with syntax highlighting overlay */}
          <div className="flex-1 overflow-hidden relative">
            <pre
              ref={preRef}
              className="absolute inset-0 p-4 font-mono-data text-xs leading-relaxed overflow-auto pointer-events-none whitespace-pre-wrap break-words m-0"
              aria-hidden="true"
              dangerouslySetInnerHTML={{ __html: highlightJson(localValue) + '\n' }}
              style={{ background: 'transparent' }}
            />
            <textarea
              ref={textareaRef}
              value={localValue}
              onChange={e => handleChange(e.target.value)}
              onScroll={syncScroll}
              spellCheck={false}
              className="absolute inset-0 w-full h-full p-4 bg-card font-mono-data text-xs leading-relaxed resize-none focus:outline-none border-none caret-foreground text-transparent selection:bg-primary/30"
              style={{ WebkitTextFillColor: 'transparent' }}
            />
          </div>

          {/* Error bar */}
          {!isValid && (
            <div className="px-4 py-2 bg-danger/10 border-t border-danger/20 text-xs text-danger font-mono-data shrink-0">
              {errorMsg}
            </div>
          )}

          {/* Actions bar */}
          <div className="p-3 border-t border-border flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={handleFormat} className="text-xs">
              Formatar
            </Button>
            <Button variant="ghost" size="sm" onClick={handleCopy} className="text-xs gap-1">
              <Copy className="h-3 w-3" /> Copiar
            </Button>
            {defaultValue && (
              <Button variant="ghost" size="sm" onClick={handleReset} className="text-xs gap-1 text-muted-foreground">
                <RotateCcw className="h-3 w-3" /> Restaurar padrão
              </Button>
            )}
            <div className="flex-1" />
            <Button size="sm" onClick={handleApply} disabled={!isValid} className="text-xs">
              Aplicar
            </Button>
          </div>

          {/* Reference Guide */}
          <div className="border-t border-border max-h-64 overflow-y-auto shrink-0">
            <div className="p-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <BookOpen className="h-3.5 w-3.5 text-primary" />
              Referência rápida de parâmetros
            </div>
            <div className="px-3 pb-3 space-y-1">
              {PARAM_DOCS.map(section => (
                <Collapsible key={section.title}>
                  <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-md hover:bg-muted/30 transition-colors text-left group">
                    <ChevronRight className="h-3 w-3 text-muted-foreground group-data-[state=open]:hidden" />
                    <ChevronDown className="h-3 w-3 text-muted-foreground hidden group-data-[state=open]:block" />
                    <span className="text-xs font-medium text-foreground">{section.title}</span>
                    <span className="text-[10px] text-muted-foreground truncate">{section.description}</span>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pl-7 pr-2 pb-2 space-y-2">
                    <p className="text-[11px] text-muted-foreground">{section.description}</p>
                    {section.fields.map(field => (
                      <div key={field.name} className="p-2 rounded bg-muted/20 border border-border/50">
                        <div className="flex items-center gap-2 flex-wrap">
                          <code className="text-[11px] font-mono-data text-primary">{field.name}</code>
                          {field.values.map(v => (
                            <Badge key={v} variant="secondary" className="text-[9px] h-4 px-1.5 font-mono-data">{v}</Badge>
                          ))}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">{field.tip}</p>
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
