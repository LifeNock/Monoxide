'use client';

import { useEffect, useRef, useState } from 'react';
import Picker from '@emoji-mart/react';

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

// Fetch twitter-specific emoji data (includes sheet positions for spritesheet rendering)
let twitterDataPromise: Promise<any> | null = null;
function getTwitterData() {
  if (!twitterDataPromise) {
    twitterDataPromise = fetch(
      'https://cdn.jsdelivr.net/npm/@emoji-mart/data@latest/sets/15/twitter.json'
    ).then((r) => r.json());
  }
  return twitterDataPromise;
}

export default function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [twitterData, setTwitterData] = useState<any>(null);

  useEffect(() => {
    getTwitterData().then(setTwitterData);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  if (!twitterData) {
    return (
      <div style={{
        width: 352,
        height: 435,
        background: 'var(--bg-secondary)',
        borderRadius: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-muted)',
        fontSize: '0.85rem',
      }}>
        Loading...
      </div>
    );
  }

  return (
    <div ref={ref}>
      <Picker
        data={twitterData}
        onEmojiSelect={(emoji: any) => {
          const native = emoji.native || emoji.skins?.[0]?.native;
          if (native) onSelect(native);
        }}
        theme="dark"
        previewPosition="none"
        skinTonePosition="none"
        maxFrequentRows={1}
        perLine={8}
        set="twitter"
      />
    </div>
  );
}
