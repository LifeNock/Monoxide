'use client';

import { useState } from 'react';
import { Gamepad2 } from 'lucide-react';

interface GameCardProps {
  name: string;
  image: string;
  category: string;
  onClick: () => void;
}

export default function GameCard({ name, image, category, onClick }: GameCardProps) {
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <button
      onClick={onClick}
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        padding: 0,
        overflow: 'hidden',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 0.25s ease',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.borderColor = 'var(--text-muted)';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.4)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div style={{
        width: '100%',
        aspectRatio: '16/10',
        background: 'var(--bg-tertiary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        position: 'relative',
      }}>
        {(!imgLoaded || imgError) && (
          <Gamepad2 size={28} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
        )}
        {!imgError && (
          <img
            src={image}
            alt={name}
            loading="lazy"
            style={{
              width: '100%', height: '100%', objectFit: 'cover',
              position: 'absolute', inset: 0,
              opacity: imgLoaded ? 1 : 0,
              transition: 'opacity 0.3s',
            }}
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
          />
        )}
      </div>
      <div style={{ padding: '0.65rem 0.75rem' }}>
        <p style={{ fontWeight: 600, fontSize: '0.82rem', marginBottom: '0.25rem', lineHeight: 1.2 }}>{name}</p>
        <span style={{
          display: 'inline-block',
          padding: '2px 7px',
          borderRadius: 5,
          fontSize: '0.65rem',
          fontWeight: 500,
          background: 'var(--accent-muted)',
          color: 'var(--text-secondary)',
          textTransform: 'capitalize',
        }}>
          {category.replace('-', ' ')}
        </span>
      </div>
    </button>
  );
}
