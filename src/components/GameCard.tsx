'use client';

import { Gamepad2 } from 'lucide-react';

interface GameCardProps {
  name: string;
  image: string;
  category: string;
  onClick: () => void;
}

export default function GameCard({ name, image, category, onClick }: GameCardProps) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: 0,
        overflow: 'hidden',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'transform 0.15s, border-color 0.15s',
        display: 'flex',
        flexDirection: 'column',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.borderColor = 'var(--accent)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = 'var(--border)';
      }}
    >
      {/* Thumbnail */}
      <div style={{
        width: '100%',
        aspectRatio: '16/10',
        background: 'var(--bg-tertiary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}>
        <img
          src={image}
          alt={name}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            e.currentTarget.parentElement!.innerHTML = '';
            const icon = document.createElement('div');
            icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-muted)"><line x1="6" x2="10" y1="11" y2="11"/><line x1="8" x2="8" y1="9" y2="13"/><line x1="15" x2="15.01" y1="12" y2="12"/><line x1="18" x2="18.01" y1="10" y2="10"/><path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z"/></svg>`;
            e.currentTarget.parentElement!.appendChild(icon);
          }}
        />
      </div>

      {/* Info */}
      <div style={{ padding: '0.75rem' }}>
        <p style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.25rem' }}>{name}</p>
        <span style={{
          display: 'inline-block',
          padding: '2px 8px',
          borderRadius: 4,
          fontSize: '0.7rem',
          fontWeight: 500,
          background: 'var(--accent-muted)',
          color: 'var(--accent)',
          textTransform: 'capitalize',
        }}>
          {category}
        </span>
      </div>
    </button>
  );
}
