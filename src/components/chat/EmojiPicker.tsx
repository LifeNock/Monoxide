'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { emojis, emojiCategories } from '@/data/emojis';

interface EmojiPickerProps {
  onSelect: (emojiId: string) => void;
  onClose: () => void;
}

export default function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const [activeCategory, setActiveCategory] = useState<string>('reactions');

  const filtered = emojis.filter((e) => e.category === activeCategory);

  return (
    <div style={{
      width: 280,
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      overflow: 'hidden',
      boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.5rem 0.75rem',
        borderBottom: '1px solid var(--border)',
      }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Emojis</span>
        <button onClick={onClose} style={{ background: 'none', padding: 2, color: 'var(--text-muted)' }}>
          <X size={14} />
        </button>
      </div>

      {/* Category tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
        {emojiCategories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            style={{
              flex: 1,
              padding: '0.4rem',
              fontSize: '0.7rem',
              fontWeight: activeCategory === cat ? 600 : 400,
              background: activeCategory === cat ? 'var(--accent-muted)' : 'transparent',
              color: activeCategory === cat ? 'var(--accent)' : 'var(--text-secondary)',
              textTransform: 'capitalize',
              borderBottom: activeCategory === cat ? '2px solid var(--accent)' : '2px solid transparent',
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Emoji grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(6, 1fr)',
        gap: '0.25rem',
        padding: '0.5rem',
        maxHeight: 200,
        overflowY: 'auto',
      }}>
        {filtered.map((emoji) => (
          <button
            key={emoji.id}
            onClick={() => onSelect(emoji.id)}
            title={emoji.name}
            style={{
              background: 'none',
              padding: '0.25rem',
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
          >
            <img src={emoji.src} alt={emoji.name} width={22} height={22} />
          </button>
        ))}
      </div>
    </div>
  );
}
