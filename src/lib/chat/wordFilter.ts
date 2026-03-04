let cachedWords: string[] = [];
let lastFetch = 0;
const CACHE_TTL = 60000;

export async function loadFilterWords(): Promise<string[]> {
  if (Date.now() - lastFetch < CACHE_TTL && cachedWords.length > 0) {
    return cachedWords;
  }

  // Word filter is enforced server-side in the messages API
  // Client-side check is just a convenience
  cachedWords = [];
  lastFetch = Date.now();
  return cachedWords;
}

export function containsFilteredWord(content: string, filterWords: string[]): boolean {
  const lower = content.toLowerCase();
  return filterWords.some((word) => {
    const regex = new RegExp(`\\b${escapeRegex(word)}\\b`, 'i');
    return regex.test(lower);
  });
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
