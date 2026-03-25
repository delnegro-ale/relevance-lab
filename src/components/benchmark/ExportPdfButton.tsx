import { useState } from 'react';
import { VariantResult } from '@/types/experiment';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import {
  PDF_COLORS, A4_LANDSCAPE, drawBg, drawCard, drawFooter, drawCrown,
  getVariantHex, preloadImages, drawProductHit, fmt,
} from '@/lib/pdf-helpers';

interface Props {
  results: VariantResult[];
}

export function ExportPdfButton({ results }: Props) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (results.length === 0) return;
    setExporting(true);

    try {
      // Preload all cover images
      const allCoverUrls: string[] = [];
      results.forEach(r => {
        r.keywordResults.forEach(kr => {
          (kr.hits || []).forEach(hit => {
            allCoverUrls.push(hit.coverUrl || `https://media3.ubook.com/catalog/book-cover-image/${hit.productId}/200x300/`);
          });
        });
      });
      const imageMap = await preloadImages(allCoverUrls);

      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const { W, H, margin } = A4_LANDSCAPE;
      const contentW = W - margin * 2;

      // ===== PAGE 1: Title + Hit Rate Hero =====
      drawBg(pdf);

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(24);
      pdf.setTextColor(PDF_COLORS.text);
      pdf.text('Ubook Search Insights', margin, margin + 10);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(PDF_COLORS.textMuted);
      pdf.text(`Relatório gerado em ${new Date().toLocaleString('pt-BR')}`, margin, margin + 17);
      pdf.text(`${results[0].keywordResults.length} keywords · ${results.length} motores`, margin, margin + 23);

      // Hit Rate Hero — with crown icon
      const heroY = margin + 32;
      drawCrown(pdf, margin + 4, heroY - 2, 8, PDF_COLORS.accent);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(13);
      pdf.setTextColor(PDF_COLORS.accent);
      pdf.text('Hit Rate @10 — Critério de Vitória', margin + 10, heroY);

      const hitRateWinner = results.reduce((best, r) =>
        r.metrics.hitRate > best.metrics.hitRate ? r : best
      );

      const cardW = Math.min((contentW - (results.length - 1) * 6) / results.length, 60);
      const cardY = heroY + 8;
      const cardH = 48;

      results.forEach((r, i) => {
        const x = margin + i * (cardW + 6);
        const isWinner = r === hitRateWinner;

        drawCard(pdf, x, cardY, cardW, cardH);

        if (isWinner) {
          pdf.setDrawColor(PDF_COLORS.accent);
          pdf.setLineWidth(1);
          pdf.roundedRect(x, cardY, cardW, cardH, 3, 3, 'S');

          pdf.setFillColor(PDF_COLORS.accent);
          pdf.roundedRect(x + cardW / 2 - 14, cardY - 3.5, 28, 7, 2, 2, 'F');
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(6);
          pdf.setTextColor('#1a1a1a');
          pdf.text('VENCEDOR', x + cardW / 2, cardY + 1.5, { align: 'center' });
        }

        // Variant dot + name
        pdf.setFillColor(getVariantHex(r.variant.color));
        pdf.circle(x + 6, cardY + 11, 1.5, 'F');

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(PDF_COLORS.text);
        const name = r.variant.name.length > 14 ? r.variant.name.slice(0, 13) + '…' : r.variant.name;
        pdf.text(name, x + 10, cardY + 12);

        // Big percentage
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(22);
        pdf.setTextColor(isWinner ? PDF_COLORS.accent : PDF_COLORS.text);
        pdf.text(`${(r.metrics.hitRate * 100).toFixed(1)}%`, x + cardW / 2, cardY + 30, { align: 'center' });

        // Hit count
        const hitCount = r.keywordResults.filter(kr => kr.hitRate > 0).length;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7);
        pdf.setTextColor(PDF_COLORS.textMuted);
        pdf.text(`${hitCount} de ${r.keywordResults.length} keywords`, x + cardW / 2, cardY + 37, { align: 'center' });

        // Progress bar
        const barY = cardY + 41;
        const barW = cardW - 10;
        pdf.setFillColor('#2a2d3a');
        pdf.roundedRect(x + 5, barY, barW, 2.5, 1, 1, 'F');
        const fillW = barW * r.metrics.hitRate;
        if (fillW > 0) {
          pdf.setFillColor(isWinner ? PDF_COLORS.accent : PDF_COLORS.textMuted);
          pdf.roundedRect(x + 5, barY, fillW, 2.5, 1, 1, 'F');
        }
      });

      // Metrics grid
      const metricsY = cardY + cardH + 14;
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.setTextColor(PDF_COLORS.text);
      pdf.text('Métricas Secundárias', margin, metricsY);

      const METRICS = [
        { key: 'perfectMatchRate' as const, label: 'Match Perfeito', pct: true, higherBetter: true },
        { key: 'mrr' as const, label: 'MRR', pct: false, higherBetter: true },
        { key: 'coverage' as const, label: 'Cobertura', pct: true, higherBetter: true },
        { key: 'avgPosition' as const, label: 'Posição Média', pct: false, higherBetter: false },
      ];

      const metricCardW = (contentW - 18) / 4;
      const metricCardH = 55;
      const metricStartY = metricsY + 6;
      const baseline = results[0];

      METRICS.forEach((m, mi) => {
        const x = margin + mi * (metricCardW + 6);
        drawCard(pdf, x, metricStartY, metricCardW, metricCardH);

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8);
        pdf.setTextColor(PDF_COLORS.textMuted);
        pdf.text(m.label.toUpperCase(), x + 5, metricStartY + 9);

        const sorted = [...results].sort((a, b) => {
          const aVal = a.metrics[m.key];
          const bVal = b.metrics[m.key];
          return m.higherBetter ? bVal - aVal : aVal - bVal;
        });

        sorted.forEach((r, ri) => {
          const rowY = metricStartY + 16 + ri * 9;
          const val = r.metrics[m.key];
          const delta = val - baseline.metrics[m.key];
          const isBase = r === baseline;

          pdf.setFillColor(getVariantHex(r.variant.color));
          pdf.circle(x + 6, rowY - 1, 1.2, 'F');

          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(8);
          pdf.setTextColor(PDF_COLORS.text);
          const vName = r.variant.name.length > 11 ? r.variant.name.slice(0, 10) + '…' : r.variant.name;
          pdf.text(vName, x + 9, rowY);

          pdf.setFont('helvetica', 'bold');
          pdf.text(fmt(val, m.pct), x + metricCardW - 6, rowY, { align: 'right' });

          if (!isBase && Math.abs(delta) > 0.001) {
            const isPositive = m.higherBetter ? delta > 0 : delta < 0;
            pdf.setFontSize(7);
            pdf.setTextColor(isPositive ? PDF_COLORS.success : PDF_COLORS.danger);
            const deltaStr = `${delta > 0 ? '+' : ''}${m.pct ? (delta * 100).toFixed(1) : delta.toFixed(2)}`;
            pdf.text(deltaStr, x + metricCardW - 6, rowY + 4.5, { align: 'right' });
          }
        });
      });


      // ===== PAGE 2+: Keyword Summary Table =====
      const keywords = results[0].keywordResults.map(kr => kr.keyword);
      const rowsPerPage = 22;
      const tableStartY = margin + 20;

      for (let page = 0; page * rowsPerPage < keywords.length; page++) {
        pdf.addPage('a4', 'landscape');
        drawBg(pdf);

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(13);
        pdf.setTextColor(PDF_COLORS.text);
        pdf.text(`Análise por Keyword (${page + 1}/${Math.ceil(keywords.length / rowsPerPage)})`, margin, margin + 10);

        const colKeywordW = 55;
        const colVariantW = (contentW - colKeywordW) / results.length;

        pdf.setFillColor(PDF_COLORS.cardBg);
        pdf.rect(margin, tableStartY, contentW, 8, 'F');

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8);
        pdf.setTextColor(PDF_COLORS.textMuted);
        pdf.text('KEYWORD', margin + 4, tableStartY + 5.5);

        results.forEach((r, vi) => {
          const x = margin + colKeywordW + vi * colVariantW;
          pdf.text(r.variant.name.toUpperCase().slice(0, 18), x + 4, tableStartY + 5.5);
        });

        const pageKeywords = keywords.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
        const rowH = 7;
        pageKeywords.forEach((kw, ki) => {
          const rowY = tableStartY + 8 + ki * rowH;

          if (ki % 2 === 0) {
            pdf.setFillColor('#13151f');
            pdf.rect(margin, rowY, contentW, rowH, 'F');
          }

          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(8);
          pdf.setTextColor(PDF_COLORS.text);
          const kwDisplay = kw.length > 28 ? kw.slice(0, 27) + '…' : kw;
          pdf.text(kwDisplay, margin + 4, rowY + 5);

          results.forEach((r, vi) => {
            const kr = r.keywordResults.find(k => k.keyword === kw);
            const x = margin + colKeywordW + vi * colVariantW;

            if (!kr || kr.error) {
              pdf.setTextColor(PDF_COLORS.danger);
              pdf.text(kr?.error ? 'ERRO' : '—', x + 4, rowY + 5);
              return;
            }

            const hitRate = kr.hitRate;
            if (hitRate === 1) pdf.setTextColor(PDF_COLORS.success);
            else if (hitRate > 0) pdf.setTextColor(PDF_COLORS.warning);
            else pdf.setTextColor(PDF_COLORS.danger);

            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(8);
            pdf.text(`${(hitRate * 100).toFixed(0)}%`, x + 4, rowY + 5);

            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(PDF_COLORS.textMuted);
            pdf.text(`(${kr.foundIds.length}/${kr.expectedIds.length})`, x + 16, rowY + 5);
          });
        });

      }

      // ===== KEYWORD DETAIL PAGES =====
      keywords.forEach((kw) => {
        pdf.addPage('a4', 'landscape');
        drawBg(pdf);

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(14);
        pdf.setTextColor(PDF_COLORS.primary);
        pdf.text(`"${kw}"`, margin, margin + 7);

        const variantCount = results.length;
        const colW = (contentW - (variantCount - 1) * 4) / variantCount;
        const detailStartY = margin + 12;

        results.forEach((r, vi) => {
          const kr = r.keywordResults.find(k => k.keyword === kw);
          const x = margin + vi * (colW + 5);

          // Variant header
          pdf.setFillColor(getVariantHex(r.variant.color));
          pdf.circle(x + 4, detailStartY + 2, 2, 'F');

          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(10);
          pdf.setTextColor(PDF_COLORS.text);
          pdf.text(r.variant.name, x + 9, detailStartY + 4);

          if (!kr || kr.error) {
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(8);
            pdf.setTextColor(PDF_COLORS.danger);
            pdf.text(kr?.error ? `Erro: ${kr.error.slice(0, 60)}` : 'Sem dados', x + 4, detailStartY + 14);
            return;
          }

          // Hit rate badge
          const hitPct = `${(kr.hitRate * 100).toFixed(0)}% hit rate (${kr.foundIds.length}/${kr.expectedIds.length})`;
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(8);
          pdf.setTextColor(PDF_COLORS.textMuted);
          pdf.text(hitPct, x + colW - 4, detailStartY + 4, { align: 'right' });

          // Product hits — compact rows to fit 10
          const hits = kr.hits || [];
          const rowH = 17;
          const gap = 0.8;
          hits.slice(0, 10).forEach((hit, hi) => {
            const rowY = detailStartY + 10 + hi * (rowH + gap);
            if (rowY + rowH > H - 2) return;

            const isExpected = kr.expectedIds.includes(hit.productId);
            drawProductHit(pdf, hit, x + 2, rowY, colW - 4, isExpected, imageMap);
          });

          // Missing IDs
          const missingIds = kr.missingIds || [];
          if (missingIds.length > 0) {
            const missingY = detailStartY + 10 + Math.min(hits.length, 10) * (rowH + gap) + 2;
            if (missingY < H - 2) {
              pdf.setFont('helvetica', 'bold');
              pdf.setFontSize(7);
              pdf.setTextColor(PDF_COLORS.danger);
              const missingText = `Não encontrados: ${missingIds.join(', ')}`;
              const maxLen = Math.floor((colW - 8) / 1.5);
              pdf.text(missingText.length > maxLen ? missingText.slice(0, maxLen - 1) + '…' : missingText, x + 4, missingY);
            }
          }
        });

        drawFooter(pdf);
      });

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
      {exporting ? 'Gerando PDF…' : 'Exportar PDF'}
    </Button>
  );
}
