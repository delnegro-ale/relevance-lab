import { useState } from 'react';
import { VariantConfig, DEFAULT_ES_PAYLOAD, VARIANT_COLORS } from '@/types/experiment';
import { SavedVariant, loadVariantLibrary, saveVariantToLibrary, deleteFromLibrary } from '@/lib/variant-library';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Plus, Copy, Trash2, Code2, Settings2, Save, Library, ChevronDown, ChevronRight, X, Eraser } from 'lucide-react';
import { JsonEditorPanel } from './JsonEditorPanel';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Props {
  variants: VariantConfig[];
  onUpdate: (id: string, updates: Partial<VariantConfig>) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  onAdd: () => void;
  onLoadFromLibrary: (saved: SavedVariant) => void;
  onClearVariants?: () => void;
}

export function VariantEditor({ variants, onUpdate, onRemove, onDuplicate, onAdd, onLoadFromLibrary, onClearVariants }: Props) {
  const [showLibrary, setShowLibrary] = useState(false);
  const [library, setLibrary] = useState<SavedVariant[]>(loadVariantLibrary);

  const refreshLibrary = () => setLibrary(loadVariantLibrary());

  const handleSaveToLibrary = (v: VariantConfig) => {
    saveVariantToLibrary(v);
    refreshLibrary();
  };

  const handleDeleteFromLibrary = (id: string) => {
    deleteFromLibrary(id);
    refreshLibrary();
  };

  const handleLoadSaved = (saved: SavedVariant) => {
    onLoadFromLibrary(saved);
    setShowLibrary(false);
  };

  return (
    <div className="space-y-3">
      {/* Library toggle */}
      <div className="flex items-center gap-2">
        <Button
          variant={showLibrary ? 'secondary' : 'outline'}
          size="sm"
          onClick={() => { setShowLibrary(!showLibrary); refreshLibrary(); }}
          className="text-xs gap-1.5"
        >
          <Library className="h-3.5 w-3.5" />
          Biblioteca de Variantes
          {library.length > 0 && (
            <Badge variant="secondary" className="text-[9px] h-4 px-1.5 ml-1">{library.length}</Badge>
          )}
        </Button>
      </div>

      {/* Saved variants library */}
      {showLibrary && (
        <Card className="p-3 space-y-2 border-primary/20 bg-primary/5">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
            Variantes salvas — clique para adicionar ao teste
          </p>
          {library.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">
              Nenhuma variante salva. Use o ícone <Save className="h-3 w-3 inline" /> em uma variante para salvá-la.
            </p>
          ) : (
            <div className="space-y-1.5">
              {library.map(saved => (
                <div
                  key={saved.id}
                  className="flex items-center gap-2 p-2 rounded-md border border-border/50 hover:border-primary/30 hover:bg-muted/20 transition-colors cursor-pointer group"
                  onClick={() => handleLoadSaved(saved)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{saved.name}</p>
                    <p className="text-[10px] text-muted-foreground font-mono-data truncate">{saved.endpoint}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(saved.savedAt).toLocaleDateString('pt-BR')}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-danger"
                    onClick={(e) => { e.stopPropagation(); handleDeleteFromLibrary(saved.id); }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Active variants */}
      {variants.map((v, idx) => (
        <VariantCard
          key={v.id}
          variant={v}
          colorIndex={idx}
          onUpdate={onUpdate}
          onRemove={onRemove}
          onDuplicate={onDuplicate}
          onSaveToLibrary={handleSaveToLibrary}
          canRemove={variants.length > 1}
          isBaseline={v.type === 'baseline'}
        />
      ))}
      <Button variant="outline" onClick={onAdd} className="w-full border-dashed">
        <Plus className="h-4 w-4 mr-2" /> Adicionar Variante
      </Button>
    </div>
  );
}

function VariantCard({ variant, colorIndex, onUpdate, onRemove, onDuplicate, onSaveToLibrary, canRemove, isBaseline }: {
  variant: VariantConfig;
  colorIndex: number;
  onUpdate: (id: string, u: Partial<VariantConfig>) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  onSaveToLibrary: (v: VariantConfig) => void;
  canRemove: boolean;
  isBaseline: boolean;
}) {
  const [jsonEditorOpen, setJsonEditorOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // The display color is based on the order (colorIndex), not stored color
  const displayColor = VARIANT_COLORS[colorIndex % VARIANT_COLORS.length];

  return (
    <>
      <Card className="overflow-hidden">
        <div className="p-3 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: `hsl(${displayColor})` }} />
            {isBaseline ? (
              <div className="flex items-center gap-2 flex-1">
                <span className="text-sm font-medium">{variant.name}</span>
                <Badge variant="outline" className="text-[9px]">Fixo</Badge>
              </div>
            ) : (
              <Input
                value={variant.name}
                onChange={e => onUpdate(variant.id, { name: e.target.value })}
                className="h-8 text-sm font-medium flex-1"
              />
            )}

            {!isBaseline && (
              <>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onSaveToLibrary(variant)} title="Salvar na biblioteca">
                  <Save className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDuplicate(variant.id)} title="Duplicar">
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                {canRemove && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-danger" onClick={() => onRemove(variant.id)} title="Remover">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowSettings(!showSettings)} title="Configurações">
                  <Settings2 className="h-3.5 w-3.5" />
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setJsonEditorOpen(true)}>
                  <Code2 className="h-3.5 w-3.5" /> Editar Payload
                </Button>
              </>
            )}
          </div>

          {!isBaseline && showSettings && (
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

          {!isBaseline && variant.payload && (
            <div className="bg-muted/30 rounded-md p-2 border border-border/50">
              <pre className="text-[10px] text-muted-foreground font-mono-data line-clamp-3 overflow-hidden">
                {variant.payload.slice(0, 200)}...
              </pre>
            </div>
          )}
        </div>
      </Card>

      {!isBaseline && (
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
