import { createClient } from '@/lib/supabase/client';

let cachedWords: string[] = [];
let lastFetch = 0;
const CACHE_TTL = 60000; // 1 minute

export async function loadFilterWords(): Promise<string[]> {
  if (Date.now() - lastFetch < CACHE_TTL && cachedWords.length > 0) {
    return cachedWords;
  }

  const supabase = createClient();
  const { data } = await supabase.from('word_filter').select('word');
  cachedWords = (data || []).map((w) => w.word.toLowerCase());
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
