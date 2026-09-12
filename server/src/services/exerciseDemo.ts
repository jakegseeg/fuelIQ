/**
 * Exercise demo image lookup via the free wger API (no API key required).
 * Results are cached in-memory. Falls back to null so the client can show a
 * placeholder. (Swap in ExerciseDB/RapidAPI here if a GIF source is preferred.)
 */
const cache = new Map<string, string | null>();
const WGER = 'https://wger.de';

interface WgerSuggestion {
  data?: { image?: string | null; image_thumbnail?: string | null; name?: string };
}

async function fetchWithTimeout(url: string, ms = 4000): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json', 'User-Agent': 'FuelIQ/0.1' },
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function getExerciseDemo(name: string): Promise<{ name: string; imageUrl: string | null }> {
  const key = name.trim().toLowerCase();
  if (cache.has(key)) return { name, imageUrl: cache.get(key) ?? null };

  let imageUrl: string | null = null;
  try {
    const url = `${WGER}/api/v2/exercise/search/?language=english&term=${encodeURIComponent(name)}`;
    const res = await fetchWithTimeout(url);
    if (res.ok) {
      const data = (await res.json()) as { suggestions?: WgerSuggestion[] };
      const withImage = (data.suggestions ?? []).find((s) => s.data?.image || s.data?.image_thumbnail);
      const img = withImage?.data?.image || withImage?.data?.image_thumbnail || null;
      if (img) imageUrl = img.startsWith('http') ? img : `${WGER}${img}`;
    }
  } catch {
    imageUrl = null;
  }

  cache.set(key, imageUrl);
  return { name, imageUrl };
}
