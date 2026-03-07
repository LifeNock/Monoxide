'use client';

import { useState, useEffect } from 'react';
import { ImagePlus } from 'lucide-react';

export default function ProfileSettingsPage() {
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [pronouns, setPronouns] = useState('');
  const [bannerColor, setBannerColor] = useState('#FFD700');
  const [bannerUrl, setBannerUrl] = useState('');
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    const res = await fetch('/api/auth/me');
    const data = await res.json();
    if (data.user) {
      setDisplayName(data.user.display_name || '');
      setUsername(data.user.username || '');
      setBio(data.user.bio || '');
      setPronouns(data.user.pronouns || '');
      setBannerColor(data.user.banner_color || '#FFD700');
      setBannerUrl(data.user.banner_url || '');
      if (data.user.banner_url) setBannerPreview(data.user.banner_url);
      if (data.user.avatar_url) setAvatarPreview(data.user.avatar_url);
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

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBannerFile(file);
    const reader = new FileReader();
    reader.onload = () => setBannerPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    if (res.ok) {
      const data = await res.json();
      return data.url;
    }
    return null;
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);

    let avatarUrlFinal = avatarPreview;
    if (avatarFile) {
      const url = await uploadFile(avatarFile);
      if (url) avatarUrlFinal = url;
    }

    let bannerUrlFinal: string | undefined = bannerUrl || undefined;
    if (bannerFile) {
      const url = await uploadFile(bannerFile);
      if (url) bannerUrlFinal = url;
    }

    await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName, bio, pronouns, bannerColor,
        avatarUrl: avatarUrlFinal,
        bannerUrl: bannerUrlFinal,
      }),
    });

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const removeBanner = async () => {
    setBannerFile(null);
    setBannerPreview(null);
    setBannerUrl('');
    await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bannerUrl: '' }),
    });
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '1.5rem' }}>Profile Settings</h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--bg-tertiary)', overflow: 'hidden', flexShrink: 0 }}>
            {avatarPreview && <img src={avatarPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
          </div>
          <label className="btn-secondary" style={{ cursor: 'pointer', fontSize: '0.85rem' }}>
            Change Avatar
            <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
          </label>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: 6 }}>Banner Image</label>
          <div style={{
            height: 80, borderRadius: 10, overflow: 'hidden', position: 'relative',
            background: bannerPreview ? `url(${bannerPreview}) center/cover` : bannerColor,
            border: '1px solid var(--border)',
          }}>
            <label style={{
              position: 'absolute', inset: 0, display: 'flex',
              alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
              cursor: 'pointer', color: '#fff', fontSize: '0.8rem', fontWeight: 500,
              background: 'rgba(0,0,0,0.35)',
              opacity: 0, transition: 'opacity 0.15s',
            }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '0'; }}
            >
              <ImagePlus size={16} />
              Upload Banner
              <input type="file" accept="image/*" onChange={handleBannerChange} style={{ display: 'none' }} />
            </label>
          </div>
          {bannerPreview && (
            <button onClick={removeBanner} style={{
              marginTop: 4, fontSize: '0.72rem', color: 'var(--danger)',
              background: 'none', padding: 0, border: 'none',
            }}>
              Remove banner image
            </button>
          )}
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: 6 }}>Display Name</label>
          <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} style={{ width: '100%' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: 6 }}>Username</label>
          <input type="text" value={username} disabled style={{ width: '100%', opacity: 0.6 }} />
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>Username cannot be changed</p>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: 6 }}>Pronouns</label>
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
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: 6 }}>Bio</label>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={200} rows={3} style={{ width: '100%', resize: 'vertical' }} />
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>{bio.length}/200</p>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: 6 }}>Banner Color</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <input type="color" value={bannerColor} onChange={(e) => setBannerColor(e.target.value)} style={{ width: 48, height: 36, padding: 2, cursor: 'pointer' }} />
            <div style={{ flex: 1, height: 36, borderRadius: 8, background: bannerColor }} />
          </div>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>Used when no banner image is set</p>
        </div>
        <button onClick={handleSave} className="btn-primary" disabled={saving} style={{ alignSelf: 'flex-start' }}>
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
