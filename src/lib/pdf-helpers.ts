import jsPDF from 'jspdf';

export const PDF_COLORS = {
  bg: '#0f1117',
  cardBg: '#1a1d27',
  border: '#2a2d3a',
  text: '#e2e8f0',
  textMuted: '#8b92a5',
  primary: '#ff5b00',
  accent: '#e8a308',   // hsl(38, 92%, 50%) — golden yellow for winner
  success: '#22c55e',
  successBg: '#1a3a2a',
  successBorder: '#2a6e3f',
  danger: '#ef4444',
  warning: '#eab308',
};

export const A4_LANDSCAPE = { W: 297, H: 210, margin: 5 };

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
  if (typeof (pdf as any).setCharSpace === 'function') (pdf as any).setCharSpace(0);
  pdf.text(label, margin, H - 4);
  pdf.text(new Date().toLocaleString('pt-BR'), W - margin, H - 4, { align: 'right' });
}

/** Draw a small crown icon using PDF primitives */
export function drawCrown(pdf: jsPDF, cx: number, cy: number, size: number, color: string) {
  pdf.setFillColor(color);
  const w = size;
  const h = size * 0.7;
  const x = cx - w / 2;
  const y = cy - h / 2;
  // Base rectangle
  pdf.rect(x, y + h * 0.5, w, h * 0.5, 'F');
  // Three triangular points
  const points = [
    { x1: x, y1: y + h * 0.6, x2: x + w * 0.15, y2: y },
    { x1: x + w * 0.35, y1: y + h * 0.6, x2: x + w * 0.5, y2: y },
    { x1: x + w * 0.7, y1: y + h * 0.6, x2: x + w * 0.85, y2: y },
  ];
  points.forEach(p => {
    pdf.triangle(p.x1, p.y1, p.x2, p.y2, p.x1 + (p.x2 - p.x1) * 2, p.y1, 'F');
  });
}

/**
 * Preload images using multiple strategies to handle CORS.
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
      const separator = url.includes('?') ? '&' : '?';
      img.src = useCors ? `${url}${separator}_cors=1` : url;
    });
  };

  const loadOne = async (url: string): Promise<void> => {
    if (await loadViaFetch(url)) return;
    if (await loadViaImg(url, true)) return;
    await loadViaImg(url, false);
  };

  for (let i = 0; i < unique.length; i += 8) {
    await Promise.all(unique.slice(i, i + 8).map(loadOne));
  }

  console.log(`[PDF] Preloaded ${map.size}/${unique.length} images`);
  return map;
}

/** Helper to set consistent text style and always reset char spacing */
function setTextStyle(pdf: jsPDF, font: string, style: string, size: number, color: string) {
  pdf.setFont(font, style);
  pdf.setFontSize(size);
  pdf.setTextColor(color);
  if (typeof (pdf as any).setCharSpace === 'function') (pdf as any).setCharSpace(0);
}

/**
 * Draw a product hit row — compact layout to fit 10 per page.
 * Cover image, title, ID, format, publisher on separate lines.
 * Green highlight box for expected hits.
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
  const rowH = 17;
  const coverW = 9;
  const coverH = 13;
  const posW = 8;
  const textX = x + posW + coverW + 3;
  const maxTextW = colW - posW - coverW - 6;

  // Green highlight box for expected hits — thin border, tight padding
  if (isExpected) {
    pdf.setFillColor(PDF_COLORS.successBg);
    pdf.roundedRect(x + 0.5, y + 0.5, colW - 1, rowH - 1, 1.5, 1.5, 'F');
    pdf.setDrawColor(PDF_COLORS.successBorder);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(x + 0.5, y + 0.5, colW - 1, rowH - 1, 1.5, 1.5, 'S');
  }

  // Position number
  setTextStyle(pdf, 'helvetica', 'bold', 9, PDF_COLORS.textMuted);
  pdf.text(`${hit.position}`, x + 3, y + rowH / 2 + 1);

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
  const maxChars = Math.floor(maxTextW / 1.5);
  setTextStyle(pdf, 'helvetica', 'bold', 8, isExpected ? PDF_COLORS.success : PDF_COLORS.text);
  const title = hit.title || 'Sem título';
  const displayTitle = title.length > maxChars ? title.slice(0, maxChars - 1) + '…' : title;
  pdf.text(displayTitle, textX, y + 4.5);

  // ID (line 2)
  setTextStyle(pdf, 'helvetica', 'normal', 7, PDF_COLORS.textMuted);
  pdf.text(`ID: ${hit.productId}`, textX, y + 8.5);

  // Format (line 3) — plain text, no emoji
  if (hit.format) {
    setTextStyle(pdf, 'helvetica', 'normal', 7, PDF_COLORS.textMuted);
    pdf.text(hit.format, textX, y + 12);
  }

  // Publisher (line 4)
  if (hit.publisher) {
    setTextStyle(pdf, 'helvetica', 'normal', 7, PDF_COLORS.textMuted);
    const pub = hit.publisher.length > maxChars ? hit.publisher.slice(0, maxChars - 1) + '…' : hit.publisher;
    const pubY = hit.format ? y + 15.5 : y + 12;
    pdf.text(pub, textX, pubY);
  }

  return rowH;
}

export function fmt(val: number, pct: boolean) {
  return pct ? `${(val * 100).toFixed(2)}%` : val.toFixed(2);
}
