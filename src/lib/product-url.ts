/**
 * Build a Ubook product URL from format + product ID.
 * Audio formats → /audiobook/, everything else → /ebook/
 */
export function buildProductUrl(productId: string, format?: string, isSeries?: boolean): string {
  if (isSeries) {
    return `https://www.ubook.com/browse/serie/id/${productId}`;
  }
  const f = (format || '').toLowerCase();
  const isAudio = f.includes('audio') || f.includes('mp3');
  const slug = isAudio ? 'audiobook' : 'ebook';
  return `https://www.ubook.com/${slug}/${productId}`;
}
