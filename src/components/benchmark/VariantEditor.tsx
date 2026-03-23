import { useState } from 'react';
import { VariantConfig, DEFAULT_ES_PAYLOAD } from '@/types/experiment';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Copy, Trash2, Code2, Settings2 } from 'lucide-react';
import { JsonEditorPanel } from './JsonEditorPanel';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface Props {
  variants: VariantConfig[];
  onUpdate: (id: string, updates: Partial<VariantConfig>) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  onAdd: () => void;
}

const VARIANT_TYPE_OPTIONS = [
  { value: 'baseline', label: 'API Produção', description: 'Usa a API de busca de produção da Ubook como referência.' },
  { value: 'elasticsearch', label: 'Elasticsearch / OpenSearch', description: 'Consulta direta a um cluster ES/OS com payload customizado.' },
];

export function VariantEditor({ variants, onUpdate, onRemove, onDuplicate, onAdd }: Props) {
  return (
    <div className="space-y-3">
      {variants.map(v => (
        <VariantCard key={v.id} variant={v} onUpdate={onUpdate} onRemove={onRemove} onDuplicate={onDuplicate} canRemove={variants.length > 1} />
      ))}
      <Button variant="outline" onClick={onAdd} className="w-full border-dashed">
        <Plus className="h-4 w-4 mr-2" /> Adicionar Variante
      </Button>
    </div>
  );
}

function VariantCard({ variant, onUpdate, onRemove, onDuplicate, canRemove }: {
  variant: VariantConfig;
  onUpdate: (id: string, u: Partial<VariantConfig>) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  canRemove: boolean;
}) {
  const [jsonEditorOpen, setJsonEditorOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  return (
    <>
      <Card className="overflow-hidden">
        <div className="p-3 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: `hsl(${variant.color})` }} />
            <Input
              value={variant.name}
              onChange={e => onUpdate(variant.id, { name: e.target.value })}
              className="h-8 text-sm font-medium flex-1"
            />

            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDuplicate(variant.id)}>
              <Copy className="h-3.5 w-3.5" />
            </Button>
            {canRemove && (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-danger" onClick={() => onRemove(variant.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowSettings(!showSettings)} title="Configurações">
              <Settings2 className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setJsonEditorOpen(true)}>
              <Code2 className="h-3.5 w-3.5" /> Editar Payload
            </Button>
          </div>

          {variant.type === 'elasticsearch' && showSettings && (
            <div className="space-y-3 pt-2 border-t border-border">
              <div>
                <label className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Endpoint</label>
                <Input
                  value={variant.endpoint}
                  onChange={e => onUpdate(variant.id, { endpoint: e.target.value })}
                  className="font-mono-data text-xs h-8 mt-1"
                  placeholder="https://your-cluster.es.amazonaws.com/index/_search"
                />
                <p className="text-[10px] text-muted-foreground mt-1">URL completa do endpoint de busca do cluster ES/OpenSearch.</p>
              </div>
            </div>
          )}

          {variant.type === 'elasticsearch' && variant.payload && (
            <div className="bg-muted/30 rounded-md p-2 border border-border/50">
              <pre className="text-[10px] text-muted-foreground font-mono-data line-clamp-3 overflow-hidden">
                {variant.payload.slice(0, 200)}...
              </pre>
            </div>
          )}
        </div>
      </Card>

      {variant.type === 'elasticsearch' && (
        <JsonEditorPanel
          open={jsonEditorOpen}
          onOpenChange={setJsonEditorOpen}
          value={variant.payload || '{}'}
          onChange={(val) => onUpdate(variant.id, { payload: val })}
          defaultValue={DEFAULT_ES_PAYLOAD}
        />
      )}
    </>
  );
}
