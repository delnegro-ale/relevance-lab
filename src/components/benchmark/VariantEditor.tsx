import { useState } from 'react';
import { VariantConfig } from '@/types/experiment';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Plus, Copy, Trash2, ChevronDown, ChevronRight } from 'lucide-react';

interface Props {
  variants: VariantConfig[];
  onUpdate: (id: string, updates: Partial<VariantConfig>) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  onAdd: () => void;
}

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
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="overflow-hidden">
      <div className="p-3 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: `hsl(${variant.color})` }} />
          <Input
            value={variant.name}
            onChange={e => onUpdate(variant.id, { name: e.target.value })}
            className="h-8 text-sm font-medium flex-1"
          />
          <Badge variant={variant.type === 'baseline' ? 'default' : 'secondary'} className="text-[10px] shrink-0">
            {variant.type === 'baseline' ? 'API Prod' : 'ES/OS'}
          </Badge>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDuplicate(variant.id)}>
            <Copy className="h-3.5 w-3.5" />
          </Button>
          {canRemove && (
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-danger" onClick={() => onRemove(variant.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
          {variant.type === 'elasticsearch' && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </Button>
          )}
        </div>

        {variant.type === 'elasticsearch' && expanded && (
          <div className="space-y-3 pt-2 border-t border-border">
            <div>
              <label className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Endpoint</label>
              <Input
                value={variant.endpoint}
                onChange={e => onUpdate(variant.id, { endpoint: e.target.value })}
                className="font-mono-data text-xs h-8 mt-1"
              />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                Payload <span className="normal-case opacity-60">(use {'{{keyword}}'} como placeholder)</span>
              </label>
              <Textarea
                value={variant.payload}
                onChange={e => onUpdate(variant.id, { payload: e.target.value })}
                className="font-mono-data text-xs min-h-[240px] mt-1 resize-y"
              />
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
