// Netlify serverless function: /api/decks?url=https://www.mtggoldfish.com/deck/123456
// Fetches and parses deck lists from MTGGoldfish and Moxfield
// Returns: { name, cards: ["4 Lightning Bolt", ...] }

export default async (request) => {
  const params = new URL(request.url).searchParams;
  const deckUrl = params.get('url');

  if (!deckUrl) return json({ error: 'Missing ?url= parameter' }, 400);

  try {
    if (deckUrl.includes('mtggoldfish.com')) {
      return await fetchMTGGoldfish(deckUrl);
    } else if (deckUrl.includes('moxfield.com')) {
      return await fetchMoxfield(deckUrl);
    } else {
      return json({ error: 'Unsupported site. Supported: MTGGoldfish, Moxfield' }, 400);
    }
  } catch (e) {
    return json({ error: e.message }, 500);
  }
};

// ── MTGGoldfish ──
// Deck URL: https://www.mtggoldfish.com/deck/123456
// Download URL: https://www.mtggoldfish.com/deck/123456/download
async function fetchMTGGoldfish(url) {
  const match = url.match(/mtggoldfish\.com\/deck\/(\d+)/);
  if (!match) return json({ error: 'Could not extract MTGGoldfish deck ID from URL' }, 400);

  const deckId = match[1];
  const downloadUrl = `https://www.mtggoldfish.com/deck/${deckId}/download`;

  const res = await fetch(downloadUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/plain, text/html, */*',
    },
    redirect: 'follow',
  });

  if (!res.ok) throw new Error(`MTGGoldfish returned HTTP ${res.status}`);

  const text = await res.text();

  // MTGGoldfish download format is plain text: "4 Lightning Bolt\n..." with sections
  // Sections start with // like "// Deck" or "// Sideboard"
  const lines = text.split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('//'));  // skip section headers

  if (!lines.length) throw new Error('No cards found in MTGGoldfish deck');

  // Extract deck name from the page (best effort — not in download file)
  // Try fetching the main page to get the title
  let deckName = `MTGGoldfish Deck ${deckId}`;
  try {
    const pageRes = await fetch(`https://www.mtggoldfish.com/deck/${deckId}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const html = await pageRes.text();
    const titleMatch = html.match(/<h1[^>]*class="[^"]*title[^"]*"[^>]*>([^<]+)</);
    if (titleMatch) deckName = titleMatch[1].trim();
  } catch (_) { /* name not critical */ }

  return json({ name: deckName, cards: lines });
}

// ── Moxfield ──
// Deck URL: https://www.moxfield.com/decks/oEWXWHM5eEGMmopExLWRCA
// API: https://api2.moxfield.com/v2/decks/all/oEWXWHM5eEGMmopExLWRCA
async function fetchMoxfield(url) {
  const match = url.match(/moxfield\.com\/decks\/([a-zA-Z0-9_-]+)/);
  if (!match) return json({ error: 'Could not extract Moxfield deck ID from URL' }, 400);

  const deckId = match[1];
  const apiUrl = `https://api2.moxfield.com/v2/decks/all/${deckId}`;

  const res = await fetch(apiUrl, {
    headers: {
      'User-Agent': 'PostmanRuntime/7.31.1',
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    }
  });

  if (!res.ok) throw new Error(`Moxfield API returned HTTP ${res.status}`);

  const data = await res.json();
  const deckName = data.name || `Moxfield Deck ${deckId}`;

  // Moxfield response has boards: mainboard, sideboard, maybeboard, commanders
  const skipBoards = ['sideboard', 'maybeboard'];
  const cards = [];

  for (const [boardName, board] of Object.entries(data.boards || {})) {
    if (skipBoards.includes(boardName)) continue;
    for (const [, entry] of Object.entries(board.cards || {})) {
      const name = entry.card?.name;
      const qty = entry.quantity || 1;
      if (name) cards.push(`${qty} ${name}`);
    }
  }

  if (!cards.length) throw new Error('No cards found in Moxfield deck');

  return json({ name: deckName, cards });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': status === 200 ? 'public, max-age=300' : 'no-store',
    }
  });
}

export const config = { path: '/api/decks' };
