'use client';

import Link from 'next/link';

interface UserPopupProps {
  username: string;
  displayName: string;
  avatarUrl: string;
  pronouns: string;
  roleColor?: string;
  onClose: () => void;
  position: { x: number; y: number };
}

export default function UserPopup({
  username,
  displayName,
  avatarUrl,
  pronouns,
  roleColor,
  onClose,
  position,
}: UserPopupProps) {
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 500,
        }}
      />

      {/* Popup card */}
      <div style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 501,
        width: 240,
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
      }}>
        {/* Banner */}
        <div style={{
          height: 40,
          background: roleColor || 'var(--accent)',
        }} />

        {/* Avatar */}
        <div style={{
          marginTop: -24,
          padding: '0 0.75rem',
        }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'var(--bg-tertiary)',
            border: '3px solid var(--bg-secondary)',
            overflow: 'hidden',
          }}>
            {avatarUrl && (
              <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            )}
          </div>
        </div>

        {/* Info */}
        <div style={{ padding: '0.5rem 0.75rem 0.75rem' }}>
          <p style={{ fontWeight: 700, fontSize: '0.95rem' }}>{displayName}</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>@{username}</p>
          {pronouns && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 2 }}>{pronouns}</p>
          )}
          <Link
            href={`/profile/${username}`}
            onClick={onClose}
            style={{
              display: 'block',
              marginTop: '0.5rem',
              padding: '0.4rem',
              borderRadius: 6,
              background: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)',
              fontSize: '0.8rem',
              textAlign: 'center',
              textDecoration: 'none',
            }}
          >
            View Full Profile
          </Link>
        </div>
      </div>
    </>
  );
}
