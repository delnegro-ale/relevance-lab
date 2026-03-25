import jsPDF from 'jspdf';

export const PDF_COLORS = {
  bg: '#0f1117',
  cardBg: '#1a1d27',
  border: '#2a2d3a',
  text: '#e2e8f0',
  textMuted: '#8b92a5',
  primary: '#ff5b00',
  success: '#22c55e',
  successBg: '#1a3a2a',
  successBorder: '#22c55e',
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
 * Preload images using multiple strategies to handle CORS.
 * Strategy 1: fetch as blob (works with CORS headers)
 * Strategy 2: Image with crossOrigin=anonymous
 * Strategy 3: Image without crossOrigin (canvas may be tainted but try anyway)
 */
export async function preloadImages(urls: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(urls)];
  const map = new Map<string, string>();

  const canvasExtract = (img: HTMLImageElement): string | null => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || 200;
      canvas.height = img.naturalHeight || 300;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(img, 0, 0);
      return canvas.toDataURL('image/jpeg', 0.85);
    } catch {
      return null;
    }
  };

  const loadViaFetch = async (url: string): Promise<boolean> => {
    try {
      const resp = await fetch(url, { credentials: 'omit' });
      if (!resp.ok) return false;
      const blob = await resp.blob();
      const objectUrl = URL.createObjectURL(blob);
      return new Promise<boolean>((resolve) => {
        const img = new Image();
        img.onload = () => {
          const data = canvasExtract(img);
          URL.revokeObjectURL(objectUrl);
          if (data) { map.set(url, data); resolve(true); }
          else resolve(false);
        };
        img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(false); };
        img.src = objectUrl;
      });
    } catch {
      return false;
    }
  };

  const loadViaImg = async (url: string, useCors: boolean): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      const img = new Image();
      if (useCors) img.crossOrigin = 'anonymous';
      img.onload = () => {
        const data = canvasExtract(img);
        if (data) { map.set(url, data); resolve(true); }
        else resolve(false);
      };
      img.onerror = () => resolve(false);
      // Add cache-buster to avoid cached non-CORS responses
      const separator = url.includes('?') ? '&' : '?';
      img.src = useCors ? `${url}${separator}_cors=1` : url;
    });
  };

  const loadOne = async (url: string): Promise<void> => {
    // Strategy 1: fetch as blob
    if (await loadViaFetch(url)) return;
    // Strategy 2: img with crossOrigin
    if (await loadViaImg(url, true)) return;
    // Strategy 3: img without crossOrigin (may taint canvas)
    await loadViaImg(url, false);
  };

  // Load in batches of 8
  for (let i = 0; i < unique.length; i += 8) {
    await Promise.all(unique.slice(i, i + 8).map(loadOne));
  }

  console.log(`[PDF] Preloaded ${map.size}/${unique.length} images`);
  return map;
}

/** Helper to set consistent text style and reset char spacing */
function setTextStyle(pdf: jsPDF, font: string, style: string, size: number, color: string) {
  pdf.setFont(font, style);
  pdf.setFontSize(size);
  pdf.setTextColor(color);
  // @ts-ignore — setCharSpace exists on jsPDF
  if (typeof pdf.setCharSpace === 'function') pdf.setCharSpace(0);
}

/**
 * Draw a product hit row in the PDF with cover image, green box for expected hits,
 * and separate lines for title, ID, format, publisher.
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
  const rowH = 22;
  const coverW = 11;
  const coverH = 16;
  const posW = 10;
  const textX = x + posW + coverW + 4;
  const maxTextW = colW - posW - coverW - 8;

  // Green highlight box for expected hits
  if (isExpected) {
    pdf.setFillColor(PDF_COLORS.successBg);
    pdf.roundedRect(x, y, colW, rowH, 2, 2, 'F');
    pdf.setDrawColor(PDF_COLORS.successBorder);
    pdf.setLineWidth(0.6);
    pdf.roundedRect(x, y, colW, rowH, 2, 2, 'S');
  }

  // Position number
  setTextStyle(pdf, 'helvetica', 'bold', 10, PDF_COLORS.textMuted);
  pdf.text(`${hit.position}`, x + 4, y + rowH / 2 + 1);

  // Cover image
  const coverUrl = hit.coverUrl || `https://media3.ubook.com/catalog/book-cover-image/${hit.productId}/200x300/`;
  const imgData = imageMap.get(coverUrl);
  const imgX = x + posW;
  const imgY = y + (rowH - coverH) / 2;
  if (imgData) {
    try {
      pdf.addImage(imgData, 'JPEG', imgX, imgY, coverW, coverH);
    } catch {
      pdf.setFillColor(PDF_COLORS.border);
      pdf.roundedRect(imgX, imgY, coverW, coverH, 1, 1, 'F');
    }
  } else {
    pdf.setFillColor(PDF_COLORS.border);
    pdf.roundedRect(imgX, imgY, coverW, coverH, 1, 1, 'F');
  }

  // Title (line 1)
  const maxChars = Math.floor(maxTextW / 1.6);
  setTextStyle(pdf, 'helvetica', 'bold', 9, isExpected ? PDF_COLORS.success : PDF_COLORS.text);
  const title = hit.title || 'Sem título';
  const displayTitle = title.length > maxChars ? title.slice(0, maxChars - 1) + '…' : title;
  pdf.text(displayTitle, textX, y + 5.5);

  // ID (line 2)
  setTextStyle(pdf, 'helvetica', 'normal', 8, PDF_COLORS.textMuted);
  pdf.text(`ID: ${hit.productId}`, textX, y + 10.5);

  // Format (line 3) - if available
  if (hit.format) {
    const f = hit.format.toLowerCase();
    const icon = f.includes('audio') || f.includes('mp3') ? '🎧' : f.includes('ebook') || f.includes('epub') ? '📄' : '📖';
    setTextStyle(pdf, 'helvetica', 'normal', 7.5, PDF_COLORS.textMuted);
    pdf.text(`${icon} ${hit.format}`, textX, y + 14.5);
  }

  // Publisher (line 4) - if available
  if (hit.publisher) {
    setTextStyle(pdf, 'helvetica', 'normal', 7.5, PDF_COLORS.textMuted);
    const pub = hit.publisher.length > maxChars ? hit.publisher.slice(0, maxChars - 1) + '…' : hit.publisher;
    const pubY = hit.format ? y + 18 : y + 14.5;
    pdf.text(pub, textX, pubY);
  }

  return rowH;
}

export function fmt(val: number, pct: boolean) {
  return pct ? `${(val * 100).toFixed(1)}%` : val.toFixed(2);
}
