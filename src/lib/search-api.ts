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
  // The Ubook API returns { success, message, data: { count, products: [...] } }
  let items: any[] = [];

  if (data?.data?.products && Array.isArray(data.data.products)) {
    items = data.data.products;
  } else if (Array.isArray(data?.results)) {
    items = data.results;
  } else if (Array.isArray(data?.hits?.hits)) {
    items = data.hits.hits;
  } else if (Array.isArray(data?.products)) {
    items = data.products;
  } else if (Array.isArray(data?.items)) {
    items = data.items;
  }

  return items.map((item: any, i: number) => ({
    productId: String(item.catalog_id || item.id || item.product_id || item.productId || item._id || ''),
    title: item.title || item.name || '',
    position: i + 1,
    score: item.score || item._score || null,
  }));
}

export async function searchElasticsearch(keyword: string, endpoint: string, payloadTemplate: string): Promise<SearchHit[]> {
  const payload = payloadTemplate.replace(/\{\{keyword\}\}/g, keyword);

  // Try via Edge Function proxy first
  const proxyUrl = getProxyUrl();
  if (proxyUrl) {
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint, payload }),
    });
    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      throw new Error(`Proxy error ${response.status}: ${errBody}`);
    }
    const data = await response.json();
    const hits = data.hits?.hits || [];
    return hits.map((hit: any, i: number) => ({
      productId: String(hit._source?.catalog_id || hit._source?.id || hit._id || ''),
      title: hit._source?.title || '',
      position: i + 1,
      score: hit._score || null,
    }));
  }

  // Direct call (may fail due to CORS/VPC)
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
  });
  if (!response.ok) throw new Error(`ES API error: ${response.status}`);

  const data = await response.json();
  const hits = data.hits?.hits || [];
  return hits.map((hit: any, i: number) => ({
    productId: String(hit._source?.catalog_id || hit._source?.id || hit._id || ''),
    title: hit._source?.title || '',
    position: i + 1,
    score: hit._score || null,
  }));
}

function getProxyUrl(): string | null {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  if (!projectId) return null;
  return `https://${projectId}.supabase.co/functions/v1/search-proxy`;
}
