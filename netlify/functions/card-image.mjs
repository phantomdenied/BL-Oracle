// Netlify serverless function: /.netlify/functions/card-image?name=Lightning+Bolt
// Fetches the product page from blacklotuscards.com and extracts the card image URL.

export default async (request) => {
  const url = new URL(request.url);
  const cardName = url.searchParams.get('name');

  if (!cardName) {
    return new Response(JSON.stringify({ error: 'Missing ?name= parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Build the slug the same way the site does:
  // "Abhorrent Oculus #42 regular" → "abhorrent-oculus-42-regular-mtg-proxy-cards"
  // Strip special chars, lowercase, replace spaces with hyphens
  const slug = cardName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')   // remove special chars (apostrophes, #, etc)
    .replace(/\s+/g, '-')            // spaces to hyphens
    .replace(/-+/g, '-')             // collapse multiple hyphens
    .replace(/^-|-$/g, '');          // trim leading/trailing hyphens

  // Try both URL patterns the site uses
  const candidates = [
    `https://blacklotuscards.com/product/${slug}-mtg-proxy-cards/`,
    `https://blacklotuscards.com/product/${slug}-mtg-cards/`,
  ];

  for (const productUrl of candidates) {
    try {
      const res = await fetch(productUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36'
        }
      });

      if (!res.ok) continue;

      const html = await res.text();

      // Extract the main product image — WooCommerce puts it in og:image meta tag
      const ogMatch = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/);
      if (ogMatch) {
        return new Response(JSON.stringify({
          image: ogMatch[1],
          productUrl,
          slug
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=86400'  // cache 24h
          }
        });
      }

      // Fallback: grab first wp-content upload image from the page
      const imgMatch = html.match(/https:\/\/blacklotuscards\.com\/wp-content\/uploads\/[^"'\s]+\.(?:jpg|jpeg|png|webp)/i);
      if (imgMatch) {
        return new Response(JSON.stringify({
          image: imgMatch[0],
          productUrl,
          slug
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=86400'
          }
        });
      }
    } catch (e) {
      // try next candidate
    }
  }

  // Nothing found
  return new Response(JSON.stringify({ error: 'Not found', slug, candidates }), {
    status: 404,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
};

export const config = { path: '/api/card-image' };
