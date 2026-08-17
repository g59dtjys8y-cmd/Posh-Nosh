// Supabase Edge Function: fetch-recipe
//
// Fetches a recipe web page server-side (browsers can't fetch another site's
// HTML directly — CORS blocks it) and extracts structured recipe data from
// the schema.org/Recipe JSON-LD block most recipe blogs embed for Google's
// rich search results. Returns { recipe: {...} } on success, or
// { error: "..." } on any failure — always with HTTP 200, so the client
// only has to branch on the response body, not on status codes.
//
// Deliberately has no database access and touches no user data, so it's
// deployed with JWT verification off (see supabase/config.toml) — anyone
// with the function URL can call it, but the worst they can do is make this
// function fetch a URL on their behalf, same as a public "paste a link"
// reader-view tool would allow.

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const USER_AGENT =
  'Mozilla/5.0 (compatible; PoshNoshRecipeImporter/1.0; +https://github.com/g59dtjys8y-cmd/Posh-Nosh)';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === 'localhost' || h.endsWith('.local')) return true;
  if (h === '0.0.0.0' || h === '::1' || h === '[::1]') return true;
  if (/^127\./.test(h)) return true;
  if (/^10\./.test(h)) return true;
  if (/^192\.168\./.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
  if (/^169\.254\./.test(h)) return true;
  return false;
}

function decodeEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));
}

function stripHtml(str: string): string {
  return decodeEntities(String(str).replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

/** Converts an ISO 8601 duration ("PT1H30M") to whole minutes. */
function parseDurationToMinutes(iso: unknown): number {
  if (typeof iso !== 'string') return 0;
  const match = iso.match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/i);
  if (!match) return 0;
  const days = parseInt(match[1] || '0', 10);
  const hours = parseInt(match[2] || '0', 10);
  const minutes = parseInt(match[3] || '0', 10);
  return days * 24 * 60 + hours * 60 + minutes;
}

function extractServings(recipe: Record<string, unknown>): number | null {
  let y = recipe.recipeYield ?? recipe.yield;
  if (Array.isArray(y)) y = y[0];
  if (typeof y === 'number' && Number.isFinite(y)) return Math.round(y);
  if (typeof y === 'string') {
    const m = y.match(/\d+/);
    if (m) return parseInt(m[0], 10);
  }
  return null;
}

function extractIngredients(recipe: Record<string, unknown>): string[] {
  const raw = recipe.recipeIngredient ?? recipe.ingredients ?? [];
  const arr = Array.isArray(raw) ? raw : [raw];
  return arr.map((s) => stripHtml(String(s))).filter(Boolean);
}

function flattenInstructions(instructions: unknown): string[] {
  if (!instructions) return [];
  if (typeof instructions === 'string') {
    return instructions
      .split(/\r?\n+/)
      .map((s) => stripHtml(s))
      .filter(Boolean);
  }
  if (Array.isArray(instructions)) {
    return instructions.flatMap((item): string[] => {
      if (typeof item === 'string') return [stripHtml(item)].filter(Boolean);
      if (item && typeof item === 'object') {
        const obj = item as Record<string, unknown>;
        const type = obj['@type'];
        if (type === 'HowToSection' && Array.isArray(obj.itemListElement)) {
          return flattenInstructions(obj.itemListElement);
        }
        if (typeof obj.text === 'string') return [stripHtml(obj.text)].filter(Boolean);
        if (typeof obj.name === 'string') return [stripHtml(obj.name)].filter(Boolean);
      }
      return [];
    });
  }
  return [];
}

/** Recursively searches parsed JSON-LD (handles @graph wrappers and arrays) for a Recipe node. */
function findRecipe(node: unknown): Record<string, unknown> | null {
  if (!node) return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findRecipe(item);
      if (found) return found;
    }
    return null;
  }
  if (typeof node !== 'object') return null;
  const obj = node as Record<string, unknown>;
  const type = obj['@type'];
  const types = Array.isArray(type) ? type : [type];
  if (types.some((t) => typeof t === 'string' && t.toLowerCase() === 'recipe')) {
    return obj;
  }
  if (obj['@graph']) {
    const found = findRecipe(obj['@graph']);
    if (found) return found;
  }
  return null;
}

function extractRecipeFromHtml(html: string): Record<string, unknown> | null {
  const scriptPattern = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = scriptPattern.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      const recipe = findRecipe(parsed);
      if (recipe) return recipe;
    } catch {
      // Malformed JSON-LD block — skip it and keep looking.
    }
  }
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Use POST.' }, 405);
  }

  let url: string;
  try {
    const body = await req.json();
    url = String(body?.url || '').trim();
  } catch {
    return jsonResponse({ error: 'Send { url } as JSON.' });
  }

  if (!url) {
    return jsonResponse({ error: 'No URL provided.' });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return jsonResponse({ error: "That doesn't look like a valid URL." });
  }
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return jsonResponse({ error: 'Only http/https URLs are supported.' });
  }
  if (isBlockedHost(parsedUrl.hostname)) {
    return jsonResponse({ error: "That URL isn't allowed." });
  }

  let html: string;
  try {
    const res = await fetch(parsedUrl.toString(), {
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' },
      signal: AbortSignal.timeout(10_000),
      redirect: 'follow',
    });
    if (!res.ok) {
      return jsonResponse({ error: `Could not load that page (HTTP ${res.status}).` });
    }
    html = await res.text();
  } catch {
    return jsonResponse({ error: "Couldn't reach that page — check the URL and try again." });
  }

  const recipe = extractRecipeFromHtml(html);
  if (!recipe) {
    return jsonResponse({
      error: "Couldn't find recipe data on that page. Try pasting the ingredients and steps in manually.",
    });
  }

  const result = {
    title: stripHtml(String(recipe.name || '')),
    ingredients: extractIngredients(recipe),
    steps: flattenInstructions(recipe.recipeInstructions),
    prep: parseDurationToMinutes(recipe.prepTime),
    cook: parseDurationToMinutes(recipe.cookTime),
    servings: extractServings(recipe),
    notes: stripHtml(String(recipe.description || '')),
  };

  if (!result.title && result.ingredients.length === 0 && result.steps.length === 0) {
    return jsonResponse({
      error: "Found recipe data on that page, but couldn't read any of it. Try pasting it in manually.",
    });
  }

  return jsonResponse({ recipe: result });
});
