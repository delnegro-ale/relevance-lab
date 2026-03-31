import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Code2, ArrowDown } from 'lucide-react';
import { parseExplainResponse, ExplainResult } from '@/lib/explain-parser';
import { PayloadViewerDialog } from './PayloadViewerDialog';

interface ExplainTarget {
  productId: string;
  productTitle?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Single product (legacy) or multiple for compare mode */
  productId: string;
  productTitle?: string;
  endpoint: string;
  payloadTemplate: string;
  keyword: string;
  /** Additional products for compare mode */
  compareTargets?: ExplainTarget[];
}

const GRUPO_COLORS: Record<string, string> = {
  texto: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  'função': 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  filtro_com_peso: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  multiplicador: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  outro: 'bg-muted text-muted-foreground border-border',
};

interface ExplainEntry {
  productId: string;
  productTitle?: string;
  loading: boolean;
  error: string | null;
  result: ExplainResult | null;
  rawResponse: Record<string, any> | null;
}

function getProxyUrl(): string | null {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  if (!projectId) return null;
  return `https://${projectId}.supabase.co/functions/v1/search-proxy`;
}

function ExplainTable({ entry, onShowRaw }: { entry: ExplainEntry; onShowRaw: () => void }) {
  const { result } = entry;
  if (!result) return null;

  // Compute subtotal: find top-level multiplication factors
  // The score is typically: textScore * funcScore1 * funcScore2 ...
  const textRows = result.rows.filter(r => r.grupo === 'texto');
  const funcRows = result.rows.filter(r => r.grupo === 'função');
  const filterRows = result.rows.filter(r => r.grupo === 'filtro_com_peso');
  const multRows = result.rows.filter(r => r.grupo === 'multiplicador');

  const textSum = textRows.reduce((s, r) => s + r.valor, 0);
  const funcProduct = funcRows.length > 0 ? funcRows.reduce((p, r) => p * r.valor, 1) : null;
  const filterSum = filterRows.reduce((s, r) => s + r.valor, 0);

  return (
    <div className="space-y-3">
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
        <Button variant="ghost" size="sm" onClick={onShowRaw} className="text-xs gap-1 ml-auto">
          <Code2 className="h-3 w-3" /> Ver response
        </Button>
      </div>

      {/* Subtotal multiplication breakdown */}
      {(textSum > 0 || funcProduct !== null) && (
        <div className="px-3 py-2 bg-primary/5 border border-primary/10 rounded-md">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1.5">Composição do score</p>
          <div className="flex items-center gap-1.5 text-xs font-mono-data flex-wrap">
            {textSum > 0 && (
              <span className="px-2 py-0.5 bg-blue-500/10 text-blue-600 rounded border border-blue-500/20">
                texto: {textSum.toLocaleString('pt-BR', { maximumFractionDigits: 4 })}
              </span>
            )}
            {funcProduct !== null && funcRows.map((fr, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <span className="text-muted-foreground">×</span>
                <span className="px-2 py-0.5 bg-purple-500/10 text-purple-600 rounded border border-purple-500/20">
                  {fr.campo || 'função'}: {fr.valor.toLocaleString('pt-BR', { maximumFractionDigits: 4 })}
                </span>
              </span>
            ))}
            {filterSum > 0 && (
              <span className="flex items-center gap-1.5">
                <span className="text-muted-foreground">+</span>
                <span className="px-2 py-0.5 bg-amber-500/10 text-amber-600 rounded border border-amber-500/20">
                  filtros: {filterSum.toLocaleString('pt-BR', { maximumFractionDigits: 4 })}
                </span>
              </span>
            )}
            {multRows.length > 0 && multRows.map((mr, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <span className="text-muted-foreground">×</span>
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 rounded border border-emerald-500/20">
                  weight: {mr.valor.toLocaleString('pt-BR', { maximumFractionDigits: 4 })}
                </span>
              </span>
            ))}
            <span className="flex items-center gap-1.5">
              <span className="text-muted-foreground">=</span>
              <span className="font-semibold text-foreground">{result.scoreFinal.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</span>
            </span>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="border border-border rounded-md overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/50 text-muted-foreground">
              <th className="text-right px-3 py-2 font-medium whitespace-nowrap">
                <span className="flex items-center justify-end gap-1">Valor <ArrowDown className="h-3 w-3" /></span>
              </th>
              <th className="text-left px-3 py-2 font-medium whitespace-nowrap">Grupo</th>
              <th className="text-left px-3 py-2 font-medium whitespace-nowrap">Campo</th>
              <th className="text-left px-3 py-2 font-medium whitespace-nowrap">Termo / Regra</th>
              <th className="text-left px-3 py-2 font-medium whitespace-nowrap">Tipo</th>
              <th className="text-left px-3 py-2 font-medium whitespace-nowrap">Descrição Original</th>
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row, i) => (
              <tr key={i} className="border-t border-border hover:bg-muted/20 transition-colors">
                <td className="text-right px-3 py-2 font-mono-data font-semibold whitespace-nowrap">
                  {row.valor.toLocaleString('pt-BR', { maximumFractionDigits: 4 })}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium border ${GRUPO_COLORS[row.grupo] || GRUPO_COLORS.outro}`}>
                    {row.grupo}
                  </span>
                </td>
                <td className="px-3 py-2 font-mono-data text-foreground whitespace-nowrap" title={row.campo}>
                  {row.campo || '—'}
                </td>
                <td className="px-3 py-2 font-mono-data text-muted-foreground whitespace-nowrap" title={row.termo_ou_regra}>
                  {row.termo_ou_regra || '—'}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <span className="text-[10px] text-muted-foreground">{row.tipo}</span>
                </td>
                <td className="px-3 py-2 text-muted-foreground whitespace-nowrap font-mono-data" title={row.descricao_original}>
                  {row.descricao_original}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ExplainScoreDialog({ open, onOpenChange, productId, productTitle, endpoint, payloadTemplate, keyword, compareTargets }: Props) {
  const [entries, setEntries] = useState<ExplainEntry[]>([]);
  const [showRawFor, setShowRawFor] = useState<string | null>(null);

  // Build list of all targets
  const allTargets: ExplainTarget[] = [
    { productId, productTitle },
    ...(compareTargets || []),
  ];

  const fetchExplain = useCallback(async (target: ExplainTarget): Promise<ExplainEntry> => {
    try {
      const explainEndpoint = endpoint.replace(/\/_search\s*$/, `/_explain/${target.productId}`);
      const payload = payloadTemplate.replace(/\{\{keyword\}\}/g, keyword);

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

      if (!data || !data.explanation) {
        console.warn('[ExplainScore] Response sem campo explanation:', data);
        throw new Error('Resposta da API não contém o campo "explanation". Endpoint: ' + explainEndpoint);
      }

      const parsed = parseExplainResponse(target.productId, data);
      return {
        productId: target.productId,
        productTitle: target.productTitle,
        loading: false,
        error: null,
        result: parsed,
        rawResponse: data,
      };
    } catch (e: any) {
      console.error('[ExplainScore] Erro:', e);
      return {
        productId: target.productId,
        productTitle: target.productTitle,
        loading: false,
        error: e.message || 'Erro ao consultar _explain',
        result: null,
        rawResponse: null,
      };
    }
  }, [endpoint, payloadTemplate, keyword]);

  useEffect(() => {
    if (open && entries.length === 0) {
      // Initialize loading state
      setEntries(allTargets.map(t => ({
        productId: t.productId,
        productTitle: t.productTitle,
        loading: true,
        error: null,
        result: null,
        rawResponse: null,
      })));

      // Fetch all
      Promise.all(allTargets.map(t => fetchExplain(t))).then(results => {
        setEntries(results);
      });
    }
  }, [open]);

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      setEntries([]);
      setShowRawFor(null);
    }
  }, [open]);

  const rawEntry = entries.find(e => e.productId === showRawFor);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2 flex-wrap">
              <span>Score Explain</span>
              {allTargets.length === 1 && (
                <>
                  <Badge variant="secondary" className="text-[10px] font-mono-data">{productId}</Badge>
                  {productTitle && <span className="text-xs text-muted-foreground font-normal truncate max-w-[300px]">{productTitle}</span>}
                </>
              )}
              {allTargets.length > 1 && (
                <Badge variant="secondary" className="text-[10px]">Comparando {allTargets.length} produtos</Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-auto space-y-6">
            {entries.map((entry, idx) => (
              <div key={entry.productId}>
                {allTargets.length > 1 && (
                  <div className="flex items-center gap-2 mb-2 pb-1 border-b border-border">
                    <span className="text-xs font-semibold">{entry.productTitle || entry.productId}</span>
                    <Badge variant="outline" className="text-[10px] font-mono-data">{entry.productId}</Badge>
                  </div>
                )}

                {entry.loading && (
                  <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Consultando _explain...</span>
                  </div>
                )}

                {entry.error && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4">
                    <p className="text-sm text-destructive font-medium">Erro na consulta</p>
                    <p className="text-xs text-muted-foreground mt-1 font-mono-data break-all">{entry.error}</p>
                  </div>
                )}

                {entry.result && (
                  <ExplainTable entry={entry} onShowRaw={() => setShowRawFor(entry.productId)} />
                )}

                {idx < entries.length - 1 && allTargets.length > 1 && (
                  <div className="border-t border-border mt-4" />
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {rawEntry?.rawResponse && (
        <PayloadViewerDialog
          open={!!showRawFor}
          onOpenChange={(o) => !o && setShowRawFor(null)}
          payload={rawEntry.rawResponse}
          title={`_explain — ${rawEntry.productId}`}
        />
      )}
    </>
  );
}
