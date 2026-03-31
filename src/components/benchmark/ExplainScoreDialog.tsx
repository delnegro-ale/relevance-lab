import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Code2, ArrowDown } from 'lucide-react';
import { parseExplainResponse, ExplainResult, ExplainRow } from '@/lib/explain-parser';
import { PayloadViewerDialog } from './PayloadViewerDialog';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productTitle?: string;
  endpoint: string;
  payloadTemplate: string;
  keyword: string;
}

const GRUPO_COLORS: Record<string, string> = {
  texto: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  'função': 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  filtro_com_peso: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  multiplicador: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  outro: 'bg-muted text-muted-foreground border-border',
};

function getProxyUrl(): string | null {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  if (!projectId) return null;
  return `https://${projectId}.supabase.co/functions/v1/search-proxy`;
}

export function ExplainScoreDialog({ open, onOpenChange, productId, productTitle, endpoint, payloadTemplate, keyword }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExplainResult | null>(null);
  const [rawResponse, setRawResponse] = useState<Record<string, any> | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  // Fetch when dialog opens
  useEffect(() => {
    if (open && !result && !loading && !error) {
      fetchExplain();
    }
  }, [open]);

  const fetchExplain = async () => {
    setLoading(true);
    setError(null);
    try {
      // Build the _explain endpoint from the _search endpoint
      const explainEndpoint = endpoint.replace(/\/_search\s*$/, `/_explain/${productId}`);
      const payload = payloadTemplate.replace(/\{\{keyword\}\}/g, keyword);
      
      // Remove size/from/sort from the payload since _explain doesn't need them
      let payloadObj: any;
      try {
        payloadObj = JSON.parse(payload);
        delete payloadObj.size;
        delete payloadObj.from;
        delete payloadObj.sort;
        delete payloadObj._source;
        delete payloadObj.highlight;
      } catch {
        payloadObj = payload;
      }
      
      const finalPayload = typeof payloadObj === 'string' ? payloadObj : JSON.stringify(payloadObj);

      const proxyUrl = getProxyUrl();
      let data: any;
      
      if (proxyUrl) {
        const response = await fetch(proxyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: explainEndpoint, payload: finalPayload }),
        });
        if (!response.ok) {
          const errorBody = await response.text().catch(() => '');
          throw new Error(`Proxy error ${response.status}${errorBody ? `: ${errorBody}` : ''}`);
        }
        data = await response.json();
      } else {
        const response = await fetch(explainEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: finalPayload,
        });
        if (!response.ok) {
          const errorBody = await response.text().catch(() => '');
          throw new Error(`API error ${response.status}${errorBody ? `: ${errorBody}` : ''}`);
        }
        data = await response.json();
      }

      // Validate response has explanation
      if (!data || !data.explanation) {
        console.warn('[ExplainScore] Response sem campo explanation:', data);
        throw new Error('Resposta da API não contém o campo "explanation". Endpoint: ' + explainEndpoint);
      }

      setRawResponse(data);
      const parsed = parseExplainResponse(productId, data);
      setResult(parsed);
    } catch (e: any) {
      console.error('[ExplainScore] Erro:', e);
      setError(e.message || 'Erro ao consultar _explain');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2 flex-wrap">
              <span>Score Explain</span>
              <Badge variant="secondary" className="text-[10px] font-mono-data">{productId}</Badge>
              {productTitle && <span className="text-xs text-muted-foreground font-normal truncate max-w-[300px]">{productTitle}</span>}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-auto space-y-4">
            {loading && (
              <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Consultando _explain...</span>
              </div>
            )}

            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4">
                <p className="text-sm text-destructive font-medium">Erro na consulta</p>
                <p className="text-xs text-muted-foreground mt-1 font-mono-data break-all">{error}</p>
              </div>
            )}

            {result && (
              <>
                {/* Summary */}
                <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg text-sm flex-wrap">
                  <div>
                    <span className="text-muted-foreground">Document:</span>{' '}
                    <span className="font-mono-data font-medium">{result.documentId}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Score final:</span>{' '}
                    <span className="font-mono-data font-semibold">{result.scoreFinal.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Matched:</span>{' '}
                    <Badge variant={result.matched ? 'default' : 'destructive'} className="text-[10px]">
                      {result.matched ? 'Sim' : 'Não'}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Critérios:</span>{' '}
                    <span className="font-mono-data">{result.rows.length}</span>
                  </div>
                  {rawResponse && (
                    <Button variant="ghost" size="sm" onClick={() => setShowRaw(true)} className="text-xs gap-1 ml-auto">
                      <Code2 className="h-3 w-3" /> Ver response
                    </Button>
                  )}
                </div>

                {/* Table */}
                <div className="border border-border rounded-md overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/50 text-muted-foreground">
                        <th className="text-right px-3 py-2 font-medium whitespace-nowrap">
                          <span className="flex items-center justify-end gap-1">Valor <ArrowDown className="h-3 w-3" /></span>
                        </th>
                        <th className="text-left px-3 py-2 font-medium">Grupo</th>
                        <th className="text-left px-3 py-2 font-medium">Campo</th>
                        <th className="text-left px-3 py-2 font-medium">Termo / Regra</th>
                        <th className="text-left px-3 py-2 font-medium">Tipo</th>
                        <th className="text-left px-3 py-2 font-medium">Descrição Original</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.rows.map((row, i) => (
                        <tr key={i} className="border-t border-border hover:bg-muted/20 transition-colors">
                          <td className="text-right px-3 py-2 font-mono-data font-semibold whitespace-nowrap">
                            {row.valor.toLocaleString('pt-BR', { maximumFractionDigits: 4 })}
                          </td>
                          <td className="px-3 py-2">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium border ${GRUPO_COLORS[row.grupo] || GRUPO_COLORS.outro}`}>
                              {row.grupo}
                            </span>
                          </td>
                          <td className="px-3 py-2 font-mono-data text-foreground max-w-[150px] truncate" title={row.campo}>
                            {row.campo || '—'}
                          </td>
                          <td className="px-3 py-2 font-mono-data text-muted-foreground max-w-[120px] truncate" title={row.termo_ou_regra}>
                            {row.termo_ou_regra || '—'}
                          </td>
                          <td className="px-3 py-2">
                            <span className="text-[10px] text-muted-foreground">{row.tipo}</span>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground max-w-[300px] truncate font-mono-data" title={row.descricao_original}>
                            {row.descricao_original}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {rawResponse && (
        <PayloadViewerDialog
          open={showRaw}
          onOpenChange={setShowRaw}
          payload={rawResponse}
          title={`_explain — ${productId}`}
        />
      )}
    </>
  );
}
