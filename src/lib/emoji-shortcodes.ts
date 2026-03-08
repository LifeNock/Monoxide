// @ts-ignore - emoji-mart data types are incomplete
import data from '@emoji-mart/data';

// Build shortcode -> native emoji map from emoji-mart data
const shortcodeMap: Record<string, string> = {};

for (const [id, emoji] of Object.entries((data as any).emojis as Record<string, any>)) {
  const native = emoji.skins?.[0]?.native;
  if (native) {
    shortcodeMap[id] = native;
  }
}

// Common aliases that emoji-mart uses different IDs for
const aliases: Record<string, string> = {
  thumbsup: '+1',
  thumbsdown: '-1',
  '+1': '+1',
  '-1': '-1',
};

export function replaceShortcodes(text: string): string {
  return text.replace(/:([a-zA-Z0-9_+-]+):/g, (match, code) => {
    const lower = code.toLowerCase();
    // Check direct match first, then aliases
    if (shortcodeMap[lower]) return shortcodeMap[lower];
    const aliasId = aliases[lower];
    if (aliasId && shortcodeMap[aliasId]) return shortcodeMap[aliasId];
    return match; // Return original if no match
  });
}

export function getShortcodeSuggestions(query: string, limit = 8): { id: string; native: string }[] {
  if (!query) return [];
  const lower = query.toLowerCase();
  const results: { id: string; native: string }[] = [];

  for (const [id, native] of Object.entries(shortcodeMap)) {
    if (id.includes(lower)) {
      results.push({ id, native });
      if (results.length >= limit) break;
    }
  }

  // Sort exact prefix matches first
  results.sort((a, b) => {
    const aStarts = a.id.startsWith(lower) ? 0 : 1;
    const bStarts = b.id.startsWith(lower) ? 0 : 1;
    return aStarts - bStarts || a.id.localeCompare(b.id);
  });

  return results;
}
