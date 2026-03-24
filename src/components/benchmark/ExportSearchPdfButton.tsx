import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import { KeywordSearchGroup } from '@/pages/SearchPreview';

interface Props {
  searchGroups: KeywordSearchGroup[];
}

export function ExportSearchPdfButton({ searchGroups }: Props) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (searchGroups.length === 0) return;
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
      };

      const drawBg = () => {
        pdf.setFillColor(colors.bg);
        pdf.rect(0, 0, W, H, 'F');
      };

      const drawFooter = () => {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(6);
        pdf.setTextColor(colors.textMuted);
        pdf.text('Ubook Search Insights — Search Preview', margin, H - 8);
        pdf.text(new Date().toLocaleString('pt-BR'), W - margin, H - 8, { align: 'right' });
      };

      // One page per keyword
      searchGroups.forEach((group, gi) => {
        if (gi > 0) pdf.addPage('a4', 'landscape');
        drawBg();

        // Title
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(14);
        pdf.setTextColor(colors.primary);
        pdf.text(`"${group.keyword}"`, margin, margin + 8);

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(colors.textMuted);
        pdf.text(`Keyword ${gi + 1} de ${searchGroups.length}`, margin, margin + 14);

        const variantCount = group.results.length;
        const colW = (contentW - (variantCount - 1) * 4) / variantCount;
        const startY = margin + 22;

        group.results.forEach((r, vi) => {
          const x = margin + vi * (colW + 4);

          // Variant header
          const hslMatch = (r.variant.color || '').match(/(\d+)\s+(\d+)%\s+(\d+)%/);
          if (hslMatch) {
            pdf.setFillColor(hslToHex(parseInt(hslMatch[1]), parseInt(hslMatch[2]), parseInt(hslMatch[3])));
          } else {
            pdf.setFillColor(colors.textMuted);
          }
          pdf.circle(x + 3, startY + 2, 1.5, 'F');

          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(8);
          pdf.setTextColor(colors.text);
          pdf.text(r.variant.name, x + 7, startY + 3);

          if (r.error) {
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(7);
            pdf.setTextColor('#ef4444');
            pdf.text(`Erro: ${r.error.slice(0, 80)}`, x + 3, startY + 12);
            return;
          }

          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(7);
          pdf.setTextColor(colors.textMuted);
          pdf.text(`${r.hits.length} resultados`, x + colW - 3, startY + 3, { align: 'right' });

          // Product list
          const hits = r.hits.slice(0, 10);
          hits.forEach((hit, hi) => {
            const rowY = startY + 10 + hi * 14;
            if (rowY > H - 20) return;

            // Position
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(7);
            pdf.setTextColor(colors.textMuted);
            pdf.text(`${hit.position}`, x + 3, rowY + 4);

            // Title
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(7);
            pdf.setTextColor(colors.text);
            const title = (hit.title || 'Sem título').slice(0, 45);
            pdf.text(title, x + 10, rowY + 4);

            // ID + format
            pdf.setFontSize(6);
            pdf.setTextColor(colors.textMuted);
            const meta = `ID: ${hit.productId}${hit.format ? ` · ${hit.format}` : ''}`;
            pdf.text(meta, x + 10, rowY + 9);

            // Separator
            if (hi < hits.length - 1) {
              pdf.setDrawColor(colors.border);
              pdf.setLineWidth(0.1);
              pdf.line(x + 3, rowY + 12, x + colW - 3, rowY + 12);
            }
          });
        });

        drawFooter();
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
