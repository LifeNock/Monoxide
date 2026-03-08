'use client';

import type { TypingUser } from '@/lib/chat/client';

interface TypingIndicatorProps {
  users: TypingUser[];
}

export default function TypingIndicator({ users }: TypingIndicatorProps) {
  if (users.length === 0) return null;

  const MAX_AVATARS = 5;
  const shown = users.slice(0, MAX_AVATARS);
  const overflow = users.length - MAX_AVATARS;

  return (
    <div style={{
      padding: '0.4rem 1.25rem 0.5rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      animation: 'typingSlideIn 0.25s ease',
    }}>
      <style>{`
        @keyframes typingDot {
          0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
          30% { opacity: 1; transform: translateY(-3px); }
        }
        @keyframes typingSlideIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes typingAvatarPop {
          from { opacity: 0; transform: scale(0.5); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {/* Avatar stack */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {shown.map((user, i) => (
          <div
            key={user.username}
            title={user.username}
            style={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: 'var(--bg-tertiary)',
              border: '2px solid var(--bg-primary)',
              overflow: 'hidden',
              marginLeft: i > 0 ? -8 : 0,
              zIndex: MAX_AVATARS - i,
              flexShrink: 0,
              animation: `typingAvatarPop 0.2s ease ${i * 0.06}s both`,
            }}
          >
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{
                width: '100%', height: '100%', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontSize: '0.55rem', color: 'var(--text-muted)',
              }}>
                {user.username[0]?.toUpperCase() || '?'}
              </div>
            )}
          </div>
        ))}
        {overflow > 0 && (
          <div style={{
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: 'var(--bg-tertiary)',
            border: '2px solid var(--bg-primary)',
            marginLeft: -8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.55rem',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            flexShrink: 0,
          }}>
            +{overflow}
          </div>
        )}
      </div>

      {/* Typing dots bubble */}
      <div style={{
        background: 'var(--bubble-bg)',
        border: '1px solid var(--bubble-border)',
        borderRadius: '12px 12px 12px 4px',
        padding: '6px 14px',
        display: 'inline-flex',
        gap: 4,
        alignItems: 'center',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: 'var(--text-muted)',
              display: 'inline-block',
              animation: `typingDot 1.4s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
