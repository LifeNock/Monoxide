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
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <style>{`
        .channel-btn {
          transition: background 0.15s ease, color 0.15s ease, padding-left 0.15s ease, transform 0.1s ease;
        }
        .channel-btn:hover:not(.channel-active) {
          background: var(--bg-tertiary);
          color: var(--text-primary);
          padding-left: 0.85rem;
        }
        .channel-btn:active {
          transform: scale(0.98);
        }
        .channel-active {
          background: var(--accent-muted) !important;
          color: var(--text-primary) !important;
        }
        .channel-indicator {
          transition: height 0.2s ease, opacity 0.2s ease;
        }
      `}</style>

      {/* Header */}
      <div style={{
        padding: '0.85rem 1rem',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          Monoxide{' '}
          <span style={{ color: 'var(--text-secondary)', fontWeight: 700 }}>Chat</span>
        </span>
      </div>

      {/* Channel list */}
      <div style={{
        padding: '0.5rem 0.4rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
      }}>
        {channels.map((ch) => {
          const isActive = activeId === ch.id;
          return (
            <button
              key={ch.id}
              onClick={() => onSelect(ch.id)}
              className={`channel-btn${isActive ? ' channel-active' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.6rem 0.45rem 0.75rem',
                borderRadius: 6,
                background: 'transparent',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontSize: '0.82rem',
                fontWeight: isActive ? 600 : 400,
                width: '100%',
                textAlign: 'left',
                cursor: 'pointer',
                border: 'none',
                position: 'relative',
              }}
            >
              {isActive && (
                <div
                  className="channel-indicator"
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: '20%',
                    bottom: '20%',
                    width: 3,
                    borderRadius: '0 2px 2px 0',
                    background: 'var(--accent)',
                  }}
                />
              )}
              {ch.is_locked ? <Lock size={13} style={{ opacity: 0.7, flexShrink: 0 }} /> : <Hash size={13} style={{ opacity: 0.7, flexShrink: 0 }} />}
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ch.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
