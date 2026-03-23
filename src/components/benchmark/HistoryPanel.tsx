import { useState } from 'react';
import { HistoryEntry, loadHistory, deleteHistoryEntry, renameHistoryEntry } from '@/lib/history';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Clock, Trash2, Pencil, Check, X, Eye, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Props {
  onLoad: (entry: HistoryEntry) => void;
}

export function HistoryPanel({ onLoad }: Props) {
  const [history, setHistory] = useState<HistoryEntry[]>(loadHistory);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const refresh = () => setHistory(loadHistory());

  const handleDelete = (id: string) => {
    deleteHistoryEntry(id);
    refresh();
  };

  const handleStartRename = (entry: HistoryEntry) => {
    setEditingId(entry.id);
    setEditName(entry.name);
  };

  const handleSaveRename = (id: string) => {
    if (editName.trim()) {
      renameHistoryEntry(id, editName.trim());
      refresh();
    }
    setEditingId(null);
  };

  if (history.length === 0) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-6 text-center">
          <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nenhuma execução anterior.</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Resultados anteriores aparecerão aqui automaticamente.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          Histórico de Execuções
          <Badge variant="secondary" className="text-[10px]">{history.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {history.map(entry => (
          <div key={entry.id} className="group flex items-center gap-3 p-3 rounded-md border border-border/50 hover:border-border hover:bg-muted/20 transition-colors">
            <div className="flex-1 min-w-0">
              {editingId === entry.id ? (
                <div className="flex items-center gap-1.5">
                  <Input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="h-7 text-xs"
                    autoFocus
                    onKeyDown={e => e.key === 'Enter' && handleSaveRename(entry.id)}
                  />
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleSaveRename(entry.id)}>
                    <Check className="h-3 w-3 text-success" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingId(null)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <>
                  <p className="text-sm font-medium truncate">{entry.name}</p>
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                    <span>{new Date(entry.timestamp).toLocaleDateString('pt-BR')} {new Date(entry.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    <span>·</span>
                    <span>{entry.keywordCount} keywords</span>
                    <span>·</span>
                    <span>{entry.variantNames.join(', ')}</span>
                  </div>
                </>
              )}
            </div>
            {editingId !== entry.id && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleStartRename(entry)} title="Renomear">
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-danger" onClick={() => handleDelete(entry.id)} title="Excluir">
                  <Trash2 className="h-3 w-3" />
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => onLoad(entry)}>
                  <Eye className="h-3 w-3" /> Ver
                </Button>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
