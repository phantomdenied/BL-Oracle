// Netlify serverless function: /api/card-image?name=Aether+Vial+foil

export default async (request) => {
  const url = new URL(request.url);
  const cardName = url.searchParams.get('name');

  if (!cardName) {
    return json({ error: 'Missing ?name= parameter' }, 400);
  }

  const slug = cardName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  const candidates = [
    `https://blacklotuscards.com/product/${slug}-mtg-proxy-cards/`,
    `https://blacklotuscards.com/product/${slug}-mtg-cards/`,
  ];

  const fetchHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Referer': 'https://blacklotuscards.com/',
  };

  const debugInfo = [];

  for (const productUrl of candidates) {
    try {
      const res = await fetch(productUrl, { headers: fetchHeaders });
      debugInfo.push({ url: productUrl, status: res.status });

      if (!res.ok) continue;

      const html = await res.text();

      // WooCommerce og:image meta tag — most reliable
      const ogMatch = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/);
      if (ogMatch) {
        return json({ image: ogMatch[1], productUrl, slug });
      }

      // Fallback: first product image in page
      const imgMatch = html.match(/https:\/\/blacklotuscards\.com\/wp-content\/uploads\/[^"'\s]+\.(?:jpg|jpeg|png|webp|avif)/i);
      if (imgMatch) {
        return json({ image: imgMatch[0], productUrl, slug });
      }

    } catch (e) {
      debugInfo.push({ url: productUrl, error: e.message });
    }
  }

  return json({ error: 'Not found', slug, candidates, debug: debugInfo }, 404);
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': status === 200 ? 'public, max-age=86400' : 'no-store',
    }
  });
}

export const config = { path: '/api/card-image' };
