'use client';

import { Hash, Lock } from 'lucide-react';

interface Channel {
  id: string;
  name: string;
  description: string;
  is_locked: boolean;
}

interface ChannelSidebarProps {
  channels: Channel[];
  activeId: string | null;
  onSelect: (id: string) => void;
}

export default function ChannelSidebar({ channels, activeId, onSelect }: ChannelSidebarProps) {
  return (
    <div style={{
      width: 220,
      background: 'var(--sidebar-bg)',
      borderRight: '1px solid var(--border)',
      padding: '1rem 0.5rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.25rem',
    }}>
      <p style={{
        fontSize: '0.7rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: 'var(--text-muted)',
        padding: '0 0.5rem',
        marginBottom: '0.5rem',
      }}>
        Channels
      </p>

      {channels.map((ch) => (
        <button
          key={ch.id}
          onClick={() => onSelect(ch.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 0.75rem',
            borderRadius: 6,
            background: activeId === ch.id ? 'var(--accent-muted)' : 'transparent',
            color: activeId === ch.id ? 'var(--accent)' : 'var(--text-secondary)',
            fontSize: '0.9rem',
            fontWeight: activeId === ch.id ? 600 : 400,
            width: '100%',
            textAlign: 'left',
          }}
        >
          {ch.is_locked ? <Lock size={14} /> : <Hash size={14} />}
          {ch.name}
        </button>
      ))}
    </div>
  );
}
