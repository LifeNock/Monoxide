'use client';

import React from 'react';
import emojiRegex from 'emoji-regex';

function emojiToCodepoint(emoji: string): string {
  const codepoints: string[] = [];
  let i = 0;
  while (i < emoji.length) {
    const cp = emoji.codePointAt(i);
    if (cp === undefined) break;
    // Skip variation selector (0xfe0f) unless it's the only codepoint
    if (cp !== 0xfe0f) {
      codepoints.push(cp.toString(16));
    }
    i += cp > 0xffff ? 2 : 1;
  }
  return codepoints.join('-');
}

export function getTwemojiUrl(emoji: string): string {
  const codepoint = emojiToCodepoint(emoji);
  return `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${codepoint}.svg`;
}

export function TwemojiText({ text, size = 18 }: { text: string; size?: number }) {
  if (!text) return null;

  const regex = emojiRegex();
  const parts: (string | JSX.Element)[] = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add text before this emoji
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const emoji = match[0];
    parts.push(
      <img
        key={match.index}
        src={getTwemojiUrl(emoji)}
        alt={emoji}
        draggable={false}
        style={{
          width: size,
          height: size,
          display: 'inline-block',
          verticalAlign: '-0.3em',
        }}
        onError={(e) => {
          // Fallback to native emoji if Twemoji image not found
          const span = document.createElement('span');
          span.textContent = emoji;
          (e.target as HTMLElement).replaceWith(span);
        }}
      />
    );
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? <>{parts}</> : <>{text}</>;
}

export function TwemojiEmoji({ emoji, size = 18 }: { emoji: string; size?: number }) {
  return (
    <img
      src={getTwemojiUrl(emoji)}
      alt={emoji}
      draggable={false}
      style={{
        width: size,
        height: size,
        display: 'inline-block',
        verticalAlign: '-0.2em',
      }}
      onError={(e) => {
        const span = document.createElement('span');
        span.textContent = emoji;
        span.style.fontSize = `${size}px`;
        (e.target as HTMLElement).replaceWith(span);
      }}
    />
  );
}
