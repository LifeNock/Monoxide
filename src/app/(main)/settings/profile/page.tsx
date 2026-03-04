'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function ProfileSettingsPage() {
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [pronouns, setPronouns] = useState('');
  const [bannerColor, setBannerColor] = useState('#FFD700');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (data) {
      setDisplayName(data.display_name || '');
      setUsername(data.username || '');
      setBio(data.bio || '');
      setPronouns(data.pronouns || '');
      setBannerColor(data.banner_color || '#FFD700');
      if (data.avatar_url) setAvatarPreview(data.avatar_url);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let avatarUrl = avatarPreview;

    // Upload avatar if changed
    if (avatarFile) {
      const path = `${user.id}/avatar.webp`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, avatarFile, { upsert: true });

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(path);
        avatarUrl = urlData.publicUrl;
      }
    }

    await supabase.from('profiles').update({
      display_name: displayName,
      bio,
      pronouns,
      banner_color: bannerColor,
      avatar_url: avatarUrl || '',
    }).eq('id', user.id);

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '1.5rem' }}>Profile Settings</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'var(--bg-tertiary)',
            overflow: 'hidden',
            flexShrink: 0,
          }}>
            {avatarPreview && (
              <img src={avatarPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            )}
          </div>
          <label className="btn-secondary" style={{ cursor: 'pointer', fontSize: '0.85rem' }}>
            Change Avatar
            <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
          </label>
        </div>

        {/* Display name */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: 6 }}>
            Display Name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>

        {/* Username (read-only display) */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: 6 }}>
            Username
          </label>
          <input
            type="text"
            value={username}
            disabled
            style={{ width: '100%', opacity: 0.6 }}
          />
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Username cannot be changed
          </p>
        </div>

        {/* Pronouns */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: 6 }}>
            Pronouns
          </label>
          <select value={pronouns} onChange={(e) => setPronouns(e.target.value)} style={{ width: '100%' }}>
            <option value="">None</option>
            <option value="he/him">he/him</option>
            <option value="she/her">she/her</option>
            <option value="they/them">they/them</option>
            <option value="he/they">he/they</option>
            <option value="she/they">she/they</option>
            <option value="any">any pronouns</option>
          </select>
        </div>

        {/* Bio */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: 6 }}>
            Bio
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={200}
            rows={3}
            style={{ width: '100%', resize: 'vertical' }}
          />
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
            {bio.length}/200
          </p>
        </div>

        {/* Banner color */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: 6 }}>
            Banner Color
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <input
              type="color"
              value={bannerColor}
              onChange={(e) => setBannerColor(e.target.value)}
              style={{ width: 48, height: 36, padding: 2, cursor: 'pointer' }}
            />
            <div style={{
              flex: 1,
              height: 36,
              borderRadius: 8,
              background: bannerColor,
            }} />
          </div>
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          className="btn-primary"
          disabled={saving}
          style={{ alignSelf: 'flex-start' }}
        >
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
