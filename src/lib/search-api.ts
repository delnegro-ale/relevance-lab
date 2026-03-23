import { SearchHit, DEFAULT_BASELINE_ENDPOINT } from '@/types/experiment';

export async function searchBaseline(keyword: string): Promise<SearchHit[]> {
  const formData = new FormData();
  formData.append('imagesUrl', '//media3.ubook.com/catalog/book-cover-image/replaced_product_id/400x600/');
  formData.append('ebookImagesUrl', '//media3.ubook.com/catalog/ebook-cover-image/replaced_product_id/400x600/');
  formData.append('audioURL', '//media3.ubook.com/audio/mp3-64/');
  formData.append('default_extension', 'mp3');
  formData.append('epubURL', '//media3.ubook.com/ebook/');
  formData.append('q', keyword);

  const response = await fetch(DEFAULT_BASELINE_ENDPOINT, { method: 'POST', body: formData });
  if (!response.ok) throw new Error(`Baseline API error: ${response.status}`);

  const data = await response.json();
  return parseBaselineResponse(data);
}

function parseBaselineResponse(data: any): SearchHit[] {
  const items = data.results || data.hits || data.products || data.data || data.items || [];
  const list = Array.isArray(items) ? items : (items.hits || []);
  return list.map((item: any, i: number) => ({
    productId: String(item.id || item.product_id || item.productId || item._id || ''),
    title: item.title || item.name || '',
    position: i + 1,
    score: item.score || item._score || null,
  }));
}

export async function searchElasticsearch(keyword: string, endpoint: string, payloadTemplate: string): Promise<SearchHit[]> {
  const payload = payloadTemplate.replace(/\{\{keyword\}\}/g, keyword);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
  });
  if (!response.ok) throw new Error(`ES API error: ${response.status}`);

  const data = await response.json();
  const hits = data.hits?.hits || [];
  return hits.map((hit: any, i: number) => ({
    productId: String(hit._source?.id || hit._id || ''),
    title: hit._source?.title || '',
    position: i + 1,
    score: hit._score || null,
  }));
}
