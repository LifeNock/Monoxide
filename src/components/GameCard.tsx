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
        borderRadius: 14,
        padding: 0,
        overflow: 'hidden',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        display: 'flex',
        flexDirection: 'column',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
        e.currentTarget.style.borderColor = 'var(--text-muted)';
        e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.4)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0) scale(1)';
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
        <Gamepad2 size={28} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
        <img
          src={image}
          alt={name}
          style={{
            width: '100%', height: '100%', objectFit: 'cover',
            position: 'absolute', inset: 0,
            transition: 'transform 0.3s',
          }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          onMouseEnter={(e) => { (e.target as HTMLImageElement).style.transform = 'scale(1.05)'; }}
          onMouseLeave={(e) => { (e.target as HTMLImageElement).style.transform = 'scale(1)'; }}
        />
      </div>
      <div style={{ padding: '0.75rem' }}>
        <p style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: '0.3rem' }}>{name}</p>
        <span style={{
          display: 'inline-block',
          padding: '2px 8px',
          borderRadius: 6,
          fontSize: '0.68rem',
          fontWeight: 500,
          background: 'var(--accent-muted)',
          color: 'var(--text-secondary)',
          textTransform: 'capitalize',
          letterSpacing: '0.02em',
        }}>
          {category}
        </span>
      </div>
    </button>
  );
}
