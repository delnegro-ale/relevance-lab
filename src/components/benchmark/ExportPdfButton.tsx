import { useState } from 'react';
import { VariantResult } from '@/types/experiment';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';

interface Props {
  results: VariantResult[];
}

function fmt(val: number, pct: boolean) {
  return pct ? `${(val * 100).toFixed(1)}%` : val.toFixed(2);
}

export function ExportPdfButton({ results }: Props) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (results.length === 0) return;
    setExporting(true);

    try {
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const W = 297;
      const H = 210;
      const margin = 15;
      const contentW = W - margin * 2;

      const colors = {
        bg: '#0f1117',
        cardBg: '#1a1d27',
        border: '#2a2d3a',
        text: '#e2e8f0',
        textMuted: '#8b92a5',
        primary: '#ff5b00',
        success: '#22c55e',
        danger: '#ef4444',
        warning: '#eab308',
      };

      // Helper functions
      const drawBg = () => {
        pdf.setFillColor(colors.bg);
        pdf.rect(0, 0, W, H, 'F');
      };

      const drawCard = (x: number, y: number, w: number, h: number) => {
        pdf.setFillColor(colors.cardBg);
        pdf.roundedRect(x, y, w, h, 3, 3, 'F');
        pdf.setDrawColor(colors.border);
        pdf.setLineWidth(0.3);
        pdf.roundedRect(x, y, w, h, 3, 3, 'S');
      };

      // ===== PAGE 1: Title + Hit Rate Hero =====
      drawBg();

      // Title
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(22);
      pdf.setTextColor(colors.text);
      pdf.text('Ubook Search Insights', margin, margin + 8);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(colors.textMuted);
      pdf.text(`Relatório gerado em ${new Date().toLocaleString('pt-BR')}`, margin, margin + 15);
      pdf.text(`${results[0].keywordResults.length} keywords · ${results.length} motores`, margin, margin + 20);

      // Hit Rate Hero Section
      const heroY = margin + 28;
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.setTextColor(colors.primary);
      pdf.text('Hit Rate @10 — Critério de Vitória', margin, heroY);

      const hitRateWinner = results.reduce((best, r) =>
        r.metrics.hitRate > best.metrics.hitRate ? r : best
      );

      const cardW = Math.min((contentW - (results.length - 1) * 5) / results.length, 55);
      const cardsStartX = margin;
      const cardY = heroY + 6;
      const cardH = 45;

      results.forEach((r, i) => {
        const x = cardsStartX + i * (cardW + 5);
        const isWinner = r === hitRateWinner;

        drawCard(x, cardY, cardW, cardH);

        if (isWinner) {
          pdf.setDrawColor(colors.primary);
          pdf.setLineWidth(0.8);
          pdf.roundedRect(x, cardY, cardW, cardH, 3, 3, 'S');

          pdf.setFillColor(colors.primary);
          pdf.roundedRect(x + cardW / 2 - 12, cardY - 3, 24, 6, 2, 2, 'F');
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(5);
          pdf.setTextColor('#ffffff');
          pdf.text('VENCEDOR', x + cardW / 2, cardY + 1, { align: 'center' });
        }

        // Variant name with color dot
        const dotSize = 2;
        const variantColor = r.variant.color || '0 0% 50%';
        const hslMatch = variantColor.match(/(\d+)\s+(\d+)%\s+(\d+)%/);
        if (hslMatch) {
          const hex = hslToHex(parseInt(hslMatch[1]), parseInt(hslMatch[2]), parseInt(hslMatch[3]));
          pdf.setFillColor(hex);
        } else {
          pdf.setFillColor(colors.textMuted);
        }
        pdf.circle(x + 5, cardY + 10, dotSize / 2, 'F');

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7);
        pdf.setTextColor(colors.text);
        const name = r.variant.name.length > 15 ? r.variant.name.slice(0, 14) + '…' : r.variant.name;
        pdf.text(name, x + 8, cardY + 11);

        // Big percentage
        const pct = (r.metrics.hitRate * 100).toFixed(1);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(20);
        pdf.setTextColor(isWinner ? colors.primary : colors.text);
        pdf.text(`${pct}%`, x + cardW / 2, cardY + 28, { align: 'center' });

        // Hit count
        const hitCount = r.keywordResults.filter(kr => kr.hitRate > 0).length;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(6);
        pdf.setTextColor(colors.textMuted);
        pdf.text(`${hitCount} de ${r.keywordResults.length} keywords com hits`, x + cardW / 2, cardY + 35, { align: 'center' });

        // Progress bar
        const barY = cardY + 38;
        const barW = cardW - 8;
        const barH = 2;
        pdf.setFillColor('#2a2d3a');
        pdf.roundedRect(x + 4, barY, barW, barH, 1, 1, 'F');
        const fillW = barW * r.metrics.hitRate;
        if (fillW > 0) {
          pdf.setFillColor(isWinner ? colors.primary : colors.textMuted);
          pdf.roundedRect(x + 4, barY, fillW, barH, 1, 1, 'F');
        }
      });

      // Metrics grid
      const metricsY = cardY + cardH + 10;
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(colors.text);
      pdf.text('Métricas Secundárias', margin, metricsY);

      const METRICS = [
        { key: 'perfectMatchRate' as const, label: 'Match Perfeito', pct: true, higherBetter: true },
        { key: 'mrr' as const, label: 'MRR', pct: false, higherBetter: true },
        { key: 'coverage' as const, label: 'Cobertura', pct: true, higherBetter: true },
        { key: 'avgPosition' as const, label: 'Posição Média', pct: false, higherBetter: false },
      ];

      const metricCardW = (contentW - 15) / 4;
      const metricCardH = 50;
      const metricStartY = metricsY + 5;
      const baseline = results[0];

      METRICS.forEach((m, mi) => {
        const x = margin + mi * (metricCardW + 5);
        drawCard(x, metricStartY, metricCardW, metricCardH);

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7);
        pdf.setTextColor(colors.textMuted);
        pdf.text(m.label.toUpperCase(), x + 4, metricStartY + 8);

        const sorted = [...results].sort((a, b) => {
          const aVal = a.metrics[m.key];
          const bVal = b.metrics[m.key];
          return m.higherBetter ? bVal - aVal : aVal - bVal;
        });

        sorted.forEach((r, ri) => {
          const rowY = metricStartY + 14 + ri * 8;
          const val = r.metrics[m.key];
          const delta = val - baseline.metrics[m.key];
          const isBaseline = r === baseline;

          const hslMatch = (r.variant.color || '').match(/(\d+)\s+(\d+)%\s+(\d+)%/);
          if (hslMatch) {
            pdf.setFillColor(hslToHex(parseInt(hslMatch[1]), parseInt(hslMatch[2]), parseInt(hslMatch[3])));
          } else {
            pdf.setFillColor(colors.textMuted);
          }
          pdf.circle(x + 5, rowY - 1, 1, 'F');

          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(7);
          pdf.setTextColor(colors.text);
          const vName = r.variant.name.length > 12 ? r.variant.name.slice(0, 11) + '…' : r.variant.name;
          pdf.text(vName, x + 8, rowY);

          pdf.setFont('helvetica', 'bold');
          pdf.text(fmt(val, m.pct), x + metricCardW - 5, rowY, { align: 'right' });

          if (!isBaseline && Math.abs(delta) > 0.001) {
            const isPositive = m.higherBetter ? delta > 0 : delta < 0;
            pdf.setFontSize(6);
            pdf.setTextColor(isPositive ? colors.success : colors.danger);
            const deltaStr = `${delta > 0 ? '+' : ''}${m.pct ? (delta * 100).toFixed(1) : delta.toFixed(2)}`;
            pdf.text(deltaStr, x + metricCardW - 5, rowY + 4, { align: 'right' });
          }
        });
      });

      // ===== PAGE 2+: Keyword Breakdown =====
      const keywords = results[0].keywordResults.map(kr => kr.keyword);
      const rowsPerPage = 28;
      const tableStartY = margin + 18;

      for (let page = 0; page * rowsPerPage < keywords.length; page++) {
        pdf.addPage('a4', 'landscape');
        drawBg();

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        pdf.setTextColor(colors.text);
        pdf.text(`Análise por Keyword (${page + 1}/${Math.ceil(keywords.length / rowsPerPage)})`, margin, margin + 8);

        // Table header
        const colKeywordW = 50;
        const colVariantW = (contentW - colKeywordW) / results.length;

        pdf.setFillColor(colors.cardBg);
        pdf.rect(margin, tableStartY, contentW, 7, 'F');

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(6);
        pdf.setTextColor(colors.textMuted);
        pdf.text('KEYWORD', margin + 3, tableStartY + 5);

        results.forEach((r, vi) => {
          const x = margin + colKeywordW + vi * colVariantW;
          pdf.text(r.variant.name.toUpperCase().slice(0, 18), x + 3, tableStartY + 5);
        });

        // Table rows
        const pageKeywords = keywords.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
        pageKeywords.forEach((kw, ki) => {
          const rowY = tableStartY + 7 + ki * 5.5;

          if (ki % 2 === 0) {
            pdf.setFillColor('#13151f');
            pdf.rect(margin, rowY, contentW, 5.5, 'F');
          }

          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(6);
          pdf.setTextColor(colors.text);
          const kwDisplay = kw.length > 25 ? kw.slice(0, 24) + '…' : kw;
          pdf.text(kwDisplay, margin + 3, rowY + 4);

          results.forEach((r, vi) => {
            const kr = r.keywordResults.find(k => k.keyword === kw);
            const x = margin + colKeywordW + vi * colVariantW;

            if (!kr || kr.error) {
              pdf.setTextColor(colors.danger);
              pdf.text(kr?.error ? 'ERRO' : '—', x + 3, rowY + 4);
              return;
            }

            const hitRate = kr.hitRate;
            if (hitRate === 1) pdf.setTextColor(colors.success);
            else if (hitRate > 0) pdf.setTextColor(colors.warning);
            else pdf.setTextColor(colors.danger);

            pdf.setFont('helvetica', 'bold');
            pdf.text(`${(hitRate * 100).toFixed(0)}%`, x + 3, rowY + 4);

            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(colors.textMuted);
            pdf.text(`(${kr.foundIds.length}/${kr.expectedIds.length})`, x + 14, rowY + 4);
          });
        });

        // Footer
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(6);
        pdf.setTextColor(colors.textMuted);
        pdf.text('Ubook Search Insights', margin, H - 8);
        pdf.text(new Date().toLocaleString('pt-BR'), W - margin, H - 8, { align: 'right' });
      }

      // Add footer to first page too
      pdf.setPage(1);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(6);
      pdf.setTextColor(colors.textMuted);
      pdf.text('Ubook Search Insights', margin, H - 8);
      pdf.text(new Date().toLocaleString('pt-BR'), W - margin, H - 8, { align: 'right' });

      pdf.save(`search-insights-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error('PDF export error:', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleExport}
      disabled={exporting || results.length === 0}
      className="text-muted-foreground text-xs"
    >
      {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <FileDown className="h-3.5 w-3.5 mr-1.5" />}
      Exportar PDF
    </Button>
  );
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}
