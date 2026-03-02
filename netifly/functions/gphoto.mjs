// Netlify serverless function: /api/gphoto?url=https://photos.app.goo.gl/...
// Resolves a Google Photos short URL to a direct lh3.googleusercontent.com image URL.
// Called from the app on hover — result is cached client-side per session.

export default async (request) => {
  const params = new URL(request.url).searchParams;
  const photoUrl = params.get('url');

  if (!photoUrl) {
    return json({ error: 'Missing ?url= parameter' }, 400);
  }

  // Only allow Google Photos URLs
  if (!photoUrl.match(/^https:\/\/(photos\.app\.goo\.gl|photos\.google\.com|lh3\.googleusercontent\.com)\//)) {
    return json({ error: 'Only Google Photos URLs are supported' }, 400);
  }

  // If it's already a direct lh3 URL, just return it
  if (photoUrl.startsWith('https://lh3.googleusercontent.com/')) {
    return json({ image: photoUrl });
  }

  try {
    const fetchHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    };

    // Step 1: follow the short URL redirect
    const res = await fetch(photoUrl, {
      headers: fetchHeaders,
      redirect: 'follow',
    });

    if (!res.ok) {
      return json({ error: `Fetch failed: HTTP ${res.status}` }, 502);
    }

    const html = await res.text();

    // Step 2: extract lh3.googleusercontent.com image URL
    // Google Photos embeds the image in several places — try each pattern

    // Pattern 1: og:image meta tag (most reliable)
    const ogMatch = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/);
    if (ogMatch && ogMatch[1].includes('lh3.googleusercontent.com')) {
      return json({ image: cleanLh3Url(ogMatch[1]) });
    }

    // Pattern 2: og:image with reversed attribute order
    const ogMatch2 = html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:image"/);
    if (ogMatch2 && ogMatch2[1].includes('lh3.googleusercontent.com')) {
      return json({ image: cleanLh3Url(ogMatch2[1]) });
    }

    // Pattern 3: direct lh3 URL anywhere in the page
    const lh3Match = html.match(/https:\/\/lh3\.googleusercontent\.com\/[^"'\s\]>]+/);
    if (lh3Match) {
      return json({ image: cleanLh3Url(lh3Match[0]) });
    }

    return json({ error: 'Could not extract image URL from Google Photos page' }, 404);

  } catch (e) {
    return json({ error: e.message }, 500);
  }
};

// Strip size params and set a good display size (=s800 = 800px on longest side)
function cleanLh3Url(url) {
  // Remove everything after = size/crop params and set s800
  return url.replace(/=s\d+.*$/, '').replace(/=[^&"'\s]+$/, '') + '=s800';
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': status === 200 ? 'public, max-age=604800' : 'no-store', // cache 7 days
    }
  });
}

export const config = { path: '/api/gphoto' };
