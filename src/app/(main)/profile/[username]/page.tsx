'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Calendar } from 'lucide-react';

export default function ProfilePage() {
  const params = useParams();
  const username = params.username as string;
  const [profile, setProfile] = useState<any>(null);
  const [badges, setBadges] = useState<any[]>([]);
  const [topRole, setTopRole] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/profile?username=${encodeURIComponent(username)}`)
      .then((r) => r.json())
      .then((data) => {
        setProfile(data.profile);
        setBadges(data.badges || []);
        setTopRole(data.roles?.[0] || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [username]);

  if (loading) return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Loading...</div>;
  if (!profile) return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>User not found</div>;

  const joinDate = new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <div style={{
        height: 140,
        background: profile.banner_url
          ? `url(${profile.banner_url}) center/cover`
          : (profile.banner_color || 'var(--accent)'),
        borderRadius: '12px 12px 0 0',
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute', bottom: -40, left: 24, width: 88, height: 88,
          borderRadius: '50%', background: 'var(--bg-primary)', border: '4px solid var(--bg-primary)', overflow: 'hidden',
        }}>
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', color: 'var(--text-muted)' }}>
              {profile.display_name?.[0]?.toUpperCase() || '?'}
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ borderRadius: '0 0 12px 12px', paddingTop: '3.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{profile.display_name}</h1>
          {topRole && (
            <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600, background: `${topRole.color}22`, color: topRole.color }}>
              {topRole.name}
            </span>
          )}
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>@{profile.username}</p>
        {profile.pronouns && <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>{profile.pronouns}</p>}
        {profile.bio && <p style={{ marginTop: '1rem', lineHeight: 1.6 }}>{profile.bio}</p>}

        {badges.length > 0 && (
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
            {badges.map((b: any) => (
              <span key={b.id} title={b.description} style={{ padding: '4px 10px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600, background: `${b.color}22`, color: b.color }}>
                {b.icon} {b.name}
              </span>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          <Calendar size={14} />
          Joined {joinDate}
        </div>
      </div>
    </div>
  );
}
