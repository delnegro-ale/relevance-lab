import jsPDF from 'jspdf';

export const PDF_COLORS = {
  bg: '#0f1117',
  cardBg: '#1a1d27',
  border: '#2a2d3a',
  text: '#e2e8f0',
  textMuted: '#8b92a5',
  primary: '#ff5b00',
  success: '#22c55e',
  successBg: '#22c55e',
  danger: '#ef4444',
  warning: '#eab308',
};

export const A4_LANDSCAPE = { W: 297, H: 210, margin: 15 };

export function hslToHex(h: number, s: number, l: number): string {
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

export function getVariantHex(color: string): string {
  const m = (color || '').match(/(\d+)\s+(\d+)%\s+(\d+)%/);
  return m ? hslToHex(parseInt(m[1]), parseInt(m[2]), parseInt(m[3])) : PDF_COLORS.textMuted;
}

export function drawBg(pdf: jsPDF) {
  pdf.setFillColor(PDF_COLORS.bg);
  pdf.rect(0, 0, A4_LANDSCAPE.W, A4_LANDSCAPE.H, 'F');
}

export function drawCard(pdf: jsPDF, x: number, y: number, w: number, h: number) {
  pdf.setFillColor(PDF_COLORS.cardBg);
  pdf.roundedRect(x, y, w, h, 3, 3, 'F');
  pdf.setDrawColor(PDF_COLORS.border);
  pdf.setLineWidth(0.3);
  pdf.roundedRect(x, y, w, h, 3, 3, 'S');
}

export function drawFooter(pdf: jsPDF, label = 'Ubook Search Insights') {
  const { W, H, margin } = A4_LANDSCAPE;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(PDF_COLORS.textMuted);
  pdf.text(label, margin, H - 8);
  pdf.text(new Date().toLocaleString('pt-BR'), W - margin, H - 8, { align: 'right' });
}

/**
 * Preload images and return a map of URL → base64 data URI.
 * Silently skips images that fail to load.
 */
export async function preloadImages(urls: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(urls)];
  const map = new Map<string, string>();

  const loadOne = (url: string): Promise<void> =>
    new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            map.set(url, canvas.toDataURL('image/jpeg', 0.8));
          }
        } catch {
          // CORS or other error, skip
        }
        resolve();
      };
      img.onerror = () => resolve();
      img.src = url;
    });

  // Load in batches of 10 to avoid flooding
  for (let i = 0; i < unique.length; i += 10) {
    await Promise.all(unique.slice(i, i + 10).map(loadOne));
  }

  return map;
}

/**
 * Draw a product hit row in the PDF with cover image, green box for expected hits,
 * publisher name, and format icon text.
 */
export function drawProductHit(
  pdf: jsPDF,
  hit: { productId: string; title?: string; position: number; publisher?: string; format?: string; coverUrl?: string },
  x: number,
  y: number,
  colW: number,
  isExpected: boolean,
  imageMap: Map<string, string>,
) {
  const rowH = 16;
  const coverW = 8;
  const coverH = 12;
  const textX = x + coverW + 6;
  const maxTextW = colW - coverW - 10;

  // Green highlight box for expected hits
  if (isExpected) {
    pdf.setFillColor('#1a3a2a');
    pdf.roundedRect(x, y, colW, rowH, 2, 2, 'F');
    pdf.setDrawColor('#22c55e');
    pdf.setLineWidth(0.4);
    pdf.roundedRect(x, y, colW, rowH, 2, 2, 'S');
  }

  // Position number
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(PDF_COLORS.textMuted);
  pdf.text(`${hit.position}`, x + 2, y + 5);

  // Cover image
  const coverUrl = hit.coverUrl || `https://media3.ubook.com/catalog/book-cover-image/${hit.productId}/200x300/`;
  const imgData = imageMap.get(coverUrl);
  if (imgData) {
    try {
      pdf.addImage(imgData, 'JPEG', x + 6, y + 2, coverW, coverH);
    } catch {
      // fallback: draw placeholder
      pdf.setFillColor(PDF_COLORS.border);
      pdf.roundedRect(x + 6, y + 2, coverW, coverH, 1, 1, 'F');
    }
  } else {
    pdf.setFillColor(PDF_COLORS.border);
    pdf.roundedRect(x + 6, y + 2, coverW, coverH, 1, 1, 'F');
  }

  // Title
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.setTextColor(isExpected ? PDF_COLORS.success : PDF_COLORS.text);
  const title = (hit.title || 'Sem título');
  const maxChars = Math.floor(maxTextW / 1.8);
  const displayTitle = title.length > maxChars ? title.slice(0, maxChars - 1) + '…' : title;
  pdf.text(displayTitle, textX, y + 5);

  // Second line: ID · Publisher · Format
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(PDF_COLORS.textMuted);
  const parts = [`ID: ${hit.productId}`];
  if (hit.publisher) parts.push(hit.publisher);
  if (hit.format) {
    const f = hit.format.toLowerCase();
    const icon = f.includes('audio') || f.includes('mp3') ? '🎧' : f.includes('ebook') || f.includes('epub') ? '📄' : '📖';
    parts.push(`${icon} ${hit.format}`);
  }
  const metaLine = parts.join(' · ');
  const displayMeta = metaLine.length > maxChars + 10 ? metaLine.slice(0, maxChars + 9) + '…' : metaLine;
  pdf.text(displayMeta, textX, y + 10);

  return rowH;
}

export function fmt(val: number, pct: boolean) {
  return pct ? `${(val * 100).toFixed(1)}%` : val.toFixed(2);
}
