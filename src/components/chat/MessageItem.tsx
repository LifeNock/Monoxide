'use client';

import { useState } from 'react';
import { Trash2, Reply, SmilePlus } from 'lucide-react';
import type { Message } from '@/lib/chat/client';
import { getEmojiById } from '@/data/emojis';

interface MessageItemProps {
  message: Message;
  currentUserId: string | null;
  onReply: (msg: Message) => void;
  onDelete: (id: string) => void;
  onReact: (messageId: string) => void;
  reactions?: { emoji_id: string; count: number; user_reacted: boolean }[];
}

export default function MessageItem({
  message,
  currentUserId,
  onReply,
  onDelete,
  onReact,
  reactions = [],
}: MessageItemProps) {
  const [hovering, setHovering] = useState(false);
  const profile = message.profiles;
  const isOwn = currentUserId === message.user_id;

  const time = new Date(message.created_at).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      style={{
        display: 'flex',
        gap: '0.75rem',
        padding: '0.5rem 1rem',
        borderRadius: 4,
        background: hovering ? 'var(--bg-hover)' : 'transparent',
        position: 'relative',
        transition: 'background 0.1s',
      }}
    >
      {/* Avatar */}
      <div style={{
        width: 36,
        height: 36,
        borderRadius: '50%',
        background: 'var(--bg-tertiary)',
        flexShrink: 0,
        overflow: 'hidden',
      }}>
        {profile?.avatar_url && (
          <img
            src={profile.avatar_url}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
            {profile?.display_name || 'Unknown'}
          </span>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{time}</span>
        </div>
        <p style={{
          fontSize: '0.9rem',
          color: 'var(--text-primary)',
          wordBreak: 'break-word',
          lineHeight: 1.5,
          marginTop: 2,
        }}>
          {message.content}
        </p>

        {/* Reactions */}
        {reactions.length > 0 && (
          <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
            {reactions.map((r) => {
              const emoji = getEmojiById(r.emoji_id);
              return (
                <button
                  key={r.emoji_id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    padding: '2px 6px',
                    borderRadius: 4,
                    fontSize: '0.75rem',
                    background: r.user_reacted ? 'var(--accent-muted)' : 'var(--bg-tertiary)',
                    border: r.user_reacted ? '1px solid var(--accent)' : '1px solid transparent',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {emoji && <img src={emoji.src} alt={emoji.name} width={14} height={14} />}
                  {r.count}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Actions */}
      {hovering && (
        <div style={{
          position: 'absolute',
          top: -8,
          right: 8,
          display: 'flex',
          gap: '0.25rem',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: 6,
          padding: '2px',
        }}>
          <button
            onClick={() => onReact(message.id)}
            style={{ background: 'none', padding: 4, color: 'var(--text-muted)' }}
            title="React"
          >
            <SmilePlus size={14} />
          </button>
          <button
            onClick={() => onReply(message)}
            style={{ background: 'none', padding: 4, color: 'var(--text-muted)' }}
            title="Reply"
          >
            <Reply size={14} />
          </button>
          {isOwn && (
            <button
              onClick={() => onDelete(message.id)}
              style={{ background: 'none', padding: 4, color: 'var(--danger)' }}
              title="Delete"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
