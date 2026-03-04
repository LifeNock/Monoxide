import type { ProxyEngine } from './register';

function xorEncode(str: string): string {
  if (!str) return str;
  return encodeURIComponent(
    str
      .toString()
      .split('')
      .map((char, ind) =>
        ind % 2 ? String.fromCharCode(char.charCodeAt(0) ^ 2) : char
      )
      .join('')
  );
}

export function encodeUrl(url: string, engine: ProxyEngine): string {
  // Ensure URL has protocol
  if (!/^https?:\/\//.test(url)) {
    url = 'https://' + url;
  }

  if (engine === 'ultraviolet') {
    return '/uv/service/' + xorEncode(url);
  } else {
    // Scramjet uses its own codec
    return '/scram/service/' + encodeURIComponent(url);
  }
}
