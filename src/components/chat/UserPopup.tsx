'use client';

import { useState, useEffect, useRef } from 'react';
import { Calendar, X, Plus } from 'lucide-react';

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
  onClose,
  position,
}: UserPopupProps) {
  const [profile, setProfile] = useState<any>(null);
  const [roles, setRoles] = useState<any[]>([]);
  const [badges, setBadges] = useState<any[]>([]);
  const [showFullProfile, setShowFullProfile] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [allRoles, setAllRoles] = useState<any[]>([]);
  const [showRolePicker, setShowRolePicker] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [adjusted, setAdjusted] = useState(position);

  useEffect(() => {
    fetch(`/api/profile?username=${encodeURIComponent(username)}`)
      .then(r => r.json())
      .then(data => {
        if (data.profile) setProfile(data.profile);
        if (data.roles) setRoles(data.roles);
        if (data.badges) setBadges(data.badges);
      })
      .catch(() => {});
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => {
        if (data.isAdmin) {
          setIsAdmin(true);
          fetch('/api/roles').then(r => r.json()).then(setAllRoles);
        }
      })
      .catch(() => {});
  }, [username]);

  const assignRole = async (roleId: string) => {
    if (!profile) return;
    await fetch('/api/roles/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: profile.id, roleId }),
    });
    const res = await fetch(`/api/profile?username=${encodeURIComponent(username)}`);
    const data = await res.json();
    if (data.roles) setRoles(data.roles);
    setShowRolePicker(false);
  };

  const removeRole = async (roleId: string) => {
    if (!profile) return;
    await fetch('/api/roles/assign', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: profile.id, roleId }),
    });
    const res = await fetch(`/api/profile?username=${encodeURIComponent(username)}`);
    const data = await res.json();
    if (data.roles) setRoles(data.roles);
  };

  useEffect(() => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    let x = position.x;
    let y = position.y;
    if (x + rect.width > window.innerWidth - 12) x = position.x - rect.width - 52;
    if (y + rect.height > window.innerHeight - 12) y = window.innerHeight - rect.height - 12;
    if (y < 12) y = 12;
    if (x < 12) x = 12;
    setAdjusted({ x, y });
  }, [position, profile]);

  const topRole = roles[0] || null;
  const bannerUrl = profile?.banner_url;
  const bannerColor = profile?.banner_color || topRole?.color || 'var(--accent)';
  const joinDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : null;
  const fullJoinDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null;

  if (showFullProfile) {
    return (
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 600,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'overlayFadeIn 0.2s ease-out',
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '100%', maxWidth: 520,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: '0 16px 64px rgba(0,0,0,0.5)',
            animation: 'overlayCardIn 0.25s ease-out',
          }}
        >
          <div style={{
            height: 120, position: 'relative',
            background: bannerUrl ? `url(${bannerUrl}) center/cover` : bannerColor,
          }}>
            <button onClick={onClose} style={{
              position: 'absolute', top: 10, right: 10,
              width: 28, height: 28, borderRadius: '50%',
              background: 'rgba(0,0,0,0.5)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: 'none', cursor: 'pointer',
            }}>
              <X size={14} />
            </button>
            <div style={{
              position: 'absolute', bottom: -36, left: 20,
              width: 72, height: 72, borderRadius: '50%',
              background: 'var(--bg-secondary)', border: '4px solid var(--bg-secondary)',
              overflow: 'hidden',
            }}>
              {(profile?.avatar_url || avatarUrl) ? (
                <img src={profile?.avatar_url || avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{
                  width: '100%', height: '100%', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.5rem', color: 'var(--text-muted)', background: 'var(--bg-tertiary)',
                }}>
                  {displayName[0]?.toUpperCase() || '?'}
                </div>
              )}
            </div>
          </div>

          <div style={{ padding: '2.75rem 1.25rem 1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>{profile?.display_name || displayName}</h2>
              {topRole && (
                <span style={{
                  padding: '2px 8px', borderRadius: 4, fontSize: '0.7rem',
                  fontWeight: 600, background: `${topRole.color}22`, color: topRole.color,
                }}>
                  {topRole.name}
                </span>
              )}
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>@{username}</p>
            {(profile?.pronouns || pronouns) && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: 2 }}>{profile?.pronouns || pronouns}</p>
            )}

            {profile?.bio && (
              <p style={{
                color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.75rem',
                lineHeight: 1.5,
              }}>
                {profile.bio}
              </p>
            )}

            {badges.length > 0 && (
              <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                {badges.map((b: any) => (
                  <span key={b.id} title={b.description} style={{
                    padding: '3px 8px', borderRadius: 5, fontSize: '0.7rem',
                    fontWeight: 600, background: `${b.color}22`, color: b.color,
                  }}>
                    {b.icon} {b.name}
                  </span>
                ))}
              </div>
            )}

            {(roles.length > 0 || isAdmin) && (
              <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.75rem', flexWrap: 'wrap', alignItems: 'center', position: 'relative' }}>
                {roles.map((r: any) => (
                  <span key={r.id} onClick={() => isAdmin && removeRole(r.id)} style={{
                    padding: '2px 8px', borderRadius: 4, fontSize: '0.68rem',
                    background: `${r.color}15`, color: r.color, border: `1px solid ${r.color}30`,
                    cursor: isAdmin ? 'pointer' : 'default',
                  }}>
                    {r.name}{isAdmin ? ' x' : ''}
                  </span>
                ))}
                {isAdmin && (
                  <button onClick={() => setShowRolePicker(!showRolePicker)} style={{
                    width: 22, height: 22, borderRadius: 4, border: '1px dashed var(--border)',
                    background: 'none', color: 'var(--text-muted)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Plus size={12} />
                  </button>
                )}
                {showRolePicker && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, marginTop: 4,
                    background: 'var(--bg-primary)', border: '1px solid var(--border)',
                    borderRadius: 8, padding: '0.25rem', zIndex: 10, minWidth: 160,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                  }}>
                    {allRoles.filter(r => !roles.some((ur: any) => ur.id === r.id)).map((r: any) => (
                      <button key={r.id} onClick={() => assignRole(r.id)} style={{
                        display: 'flex', alignItems: 'center', gap: '0.4rem',
                        width: '100%', padding: '0.35rem 0.5rem', borderRadius: 4,
                        background: 'none', color: r.color, fontSize: '0.78rem',
                        cursor: 'pointer', border: 'none', textAlign: 'left',
                      }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: r.color }} />
                        {r.name}
                      </button>
                    ))}
                    {allRoles.filter(r => !roles.some((ur: any) => ur.id === r.id)).length === 0 && (
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '0.3rem 0.5rem' }}>All roles assigned</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {fullJoinDate && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                marginTop: '0.75rem', paddingTop: '0.75rem',
                borderTop: '1px solid var(--border)',
                color: 'var(--text-muted)', fontSize: '0.78rem',
              }}>
                <Calendar size={13} />
                Joined {fullJoinDate}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 500 }} />

      <div
        ref={cardRef}
        style={{
          position: 'fixed', left: adjusted.x, top: adjusted.y, zIndex: 501,
          width: 280, background: 'var(--bg-secondary)',
          border: '1px solid var(--border)', borderRadius: 12,
          overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}
      >
        <div style={{
          height: 56,
          background: bannerUrl ? `url(${bannerUrl}) center/cover` : bannerColor,
        }} />

        <div style={{ padding: '0 1rem', marginTop: -24 }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: 'var(--bg-tertiary)', border: '3px solid var(--bg-secondary)',
            overflow: 'hidden',
          }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{
                width: '100%', height: '100%', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontSize: '1.1rem', color: 'var(--text-muted)', background: 'var(--bg-tertiary)',
              }}>
                {displayName[0]?.toUpperCase() || '?'}
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: '0.4rem 1rem 0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            <p style={{ fontWeight: 700, fontSize: '0.95rem' }}>{profile?.display_name || displayName}</p>
            {topRole && (
              <span style={{
                padding: '1px 5px', borderRadius: 3, fontSize: '0.6rem',
                fontWeight: 600, background: `${topRole.color}22`, color: topRole.color,
              }}>
                {topRole.name}
              </span>
            )}
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>@{username}</p>
          {pronouns && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: 1 }}>{pronouns}</p>
          )}

          {profile?.bio && (
            <p style={{
              color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.35rem',
              lineHeight: 1.35,
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}>
              {profile.bio}
            </p>
          )}

          {joinDate && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.3rem',
              marginTop: '0.35rem', color: 'var(--text-muted)', fontSize: '0.68rem',
            }}>
              <Calendar size={10} />
              Joined {joinDate}
            </div>
          )}

          <button
            onClick={() => setShowFullProfile(true)}
            style={{
              display: 'block', width: '100%',
              marginTop: '0.6rem', padding: '0.4rem',
              borderRadius: 8, background: 'var(--accent)',
              color: 'var(--bg-primary)', fontSize: '0.78rem',
              fontWeight: 600, textAlign: 'center',
              cursor: 'pointer', border: 'none',
              transition: 'opacity 0.15s',
            }}
          >
            View Full Profile
          </button>
        </div>
      </div>
    </>
  );
}
