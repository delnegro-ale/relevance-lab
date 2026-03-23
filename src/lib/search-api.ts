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

  return items.map((item: any, i: number) => {
    const productId = String(item.catalog_id || item.id || item.product_id || item.productId || item._id || '');
    const coverImage = item.cover_image || item.cover_url || item.coverUrl || item.image_url || item.imageUrl || '';
    const imagesUrl = '//media3.ubook.com/catalog/book-cover-image/replaced_product_id/400x600/';
    const resolvedCover = coverImage
      ? (coverImage.startsWith('http') || coverImage.startsWith('//') ? coverImage : imagesUrl.replace('replaced_product_id', coverImage))
      : imagesUrl.replace('replaced_product_id', productId);
    
    return {
      productId,
      title: item.title || item.name || '',
      position: i + 1,
      score: item.score || item._score || null,
      publisher: item.publisher || item.publisher_name || item.editora || '',
      format: item.format || item.content_type || item.type || item.formato || '',
      coverUrl: resolvedCover.startsWith('//') ? `https:${resolvedCover}` : resolvedCover,
    };
  });
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
    return parseEsResponse(data);
  }

  // Direct call (may fail due to CORS/VPC)
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
  });
  if (!response.ok) throw new Error(`ES API error: ${response.status}`);

  const data = await response.json();
  return parseEsResponse(data);
}

function parseEsResponse(data: any): SearchHit[] {
  const hits = data.hits?.hits || [];
  return hits.map((hit: any, i: number) => {
    const src = hit._source || {};
    const productId = String(src.catalog_id || src.id || hit._id || '');
    return {
      productId,
      title: src.title || '',
      position: i + 1,
      score: hit._score || null,
      publisher: src.publisher || src.publisher_name || src.editora || '',
      format: src.format || src.content_type || src.type || '',
      coverUrl: src.image_url || src.cover_url || `https://media3.ubook.com/catalog/book-cover-image/${productId}/400x600/`,
    };
  });
}

function getProxyUrl(): string | null {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  if (!projectId) return null;
  return `https://${projectId}.supabase.co/functions/v1/search-proxy`;
}
