import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import { KeywordSearchGroup } from '@/pages/SearchPreview';
import {
  PDF_COLORS, A4_LANDSCAPE, drawBg, drawFooter,
  getVariantHex, preloadImages, drawProductHit,
} from '@/lib/pdf-helpers';

interface Props {
  searchGroups: KeywordSearchGroup[];
}

export function ExportSearchPdfButton({ searchGroups }: Props) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (searchGroups.length === 0) return;
    setExporting(true);

    try {
      // Preload cover images
      const allCoverUrls: string[] = [];
      searchGroups.forEach(group => {
        group.results.forEach(r => {
          (r.hits || []).forEach(hit => {
            allCoverUrls.push(hit.coverUrl || `https://media3.ubook.com/catalog/book-cover-image/${hit.productId}/200x300/`);
          });
        });
      });
      const imageMap = await preloadImages(allCoverUrls);

      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const { W, H, margin } = A4_LANDSCAPE;
      const contentW = W - margin * 2;

      searchGroups.forEach((group, gi) => {
        if (gi > 0) pdf.addPage('a4', 'landscape');
        drawBg(pdf);

        // Title
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(16);
        pdf.setTextColor(PDF_COLORS.primary);
        pdf.text(`"${group.keyword}"`, margin, margin + 10);

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(PDF_COLORS.textMuted);
        pdf.text(`Keyword ${gi + 1} de ${searchGroups.length}`, margin, margin + 16);

        const variantCount = group.results.length;
        const colW = (contentW - (variantCount - 1) * 5) / variantCount;
        const startY = margin + 24;

        group.results.forEach((r, vi) => {
          const x = margin + vi * (colW + 5);

          // Variant header
          pdf.setFillColor(getVariantHex(r.variant.color || ''));
          pdf.circle(x + 4, startY + 2, 2, 'F');

          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(10);
          pdf.setTextColor(PDF_COLORS.text);
          pdf.text(r.variant.name, x + 9, startY + 4);

          if (r.error) {
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(8);
            pdf.setTextColor(PDF_COLORS.danger);
            pdf.text(`Erro: ${r.error.slice(0, 60)}`, x + 4, startY + 14);
            return;
          }

          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(8);
          pdf.setTextColor(PDF_COLORS.textMuted);
          pdf.text(`${r.hits.length} resultados`, x + colW - 4, startY + 4, { align: 'right' });

          // Product list with covers — compact to fit 10
          const hits = r.hits.slice(0, 10);
          const rowH = 17;
          const gap = 1.5;
          hits.forEach((hit, hi) => {
            const rowY = startY + 12 + hi * (rowH + gap);
            if (rowY + rowH > H - 8) return;

            drawProductHit(pdf, hit, x + 2, rowY, colW - 4, false, imageMap);
          });
        });

        drawFooter(pdf, 'Ubook Search Insights — Search Preview');
      });

      pdf.save(`search-preview-${new Date().toISOString().slice(0, 10)}.pdf`);
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
      disabled={exporting || searchGroups.length === 0}
      className="text-muted-foreground text-xs"
    >
      {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <FileDown className="h-3.5 w-3.5 mr-1.5" />}
      {exporting ? 'Gerando PDF…' : 'Exportar PDF'}
    </Button>
  );
}
