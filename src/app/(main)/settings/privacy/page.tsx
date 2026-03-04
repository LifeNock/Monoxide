'use client';

import { useState, useEffect } from 'react';

export default function PrivacySettingsPage() {
  const [panicKey, setPanicKey] = useState('`');
  const [panicUrl, setPanicUrl] = useState('https://www.google.com');
  const [aboutBlankCloak, setAboutBlankCloak] = useState(false);
  const [dmsEnabled, setDmsEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [listeningForKey, setListeningForKey] = useState(false);

  useEffect(() => {
    setPanicKey(localStorage.getItem('monoxide-panic-key') || '`');
    setPanicUrl(localStorage.getItem('monoxide-panic-url') || 'https://www.google.com');
    setAboutBlankCloak(localStorage.getItem('monoxide-cloak') === 'true');
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    localStorage.setItem('monoxide-panic-key', panicKey);
    localStorage.setItem('monoxide-panic-url', panicUrl);
    localStorage.setItem('monoxide-cloak', String(aboutBlankCloak));

    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ panicKey, panicUrl, aboutBlankCloak, dmsEnabled }),
    });

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  useEffect(() => {
    if (!listeningForKey) return;
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      setPanicKey(e.key);
      setListeningForKey(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [listeningForKey]);

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '1.5rem' }}>Privacy & Safety</h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="card">
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Panic Key</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>Press this key to instantly redirect to a safe URL.</p>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.75rem' }}>
            <button onClick={() => setListeningForKey(true)} className="btn-secondary" style={{ minWidth: 80, textAlign: 'center', border: listeningForKey ? '1px solid var(--accent)' : '1px solid var(--border)' }}>
              {listeningForKey ? 'Press a key...' : panicKey === '`' ? 'Backtick (`)' : panicKey}
            </button>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Current key</span>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: 6 }}>Redirect URL</label>
            <input type="url" value={panicUrl} onChange={(e) => setPanicUrl(e.target.value)} placeholder="https://www.google.com" style={{ width: '100%' }} />
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.25rem' }}>About:Blank Cloaking</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Open Monoxide in an about:blank tab with a fake title.</p>
            </div>
            <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24 }}>
              <input type="checkbox" checked={aboutBlankCloak} onChange={(e) => setAboutBlankCloak(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
              <span style={{ position: 'absolute', cursor: 'pointer', inset: 0, background: aboutBlankCloak ? 'var(--accent)' : 'var(--bg-tertiary)', borderRadius: 12, transition: '0.2s' }}>
                <span style={{ position: 'absolute', height: 18, width: 18, left: aboutBlankCloak ? 22 : 3, bottom: 3, background: '#fff', borderRadius: '50%', transition: '0.2s' }} />
              </span>
            </label>
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.25rem' }}>Allow Direct Messages</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Let other users send you direct messages.</p>
            </div>
            <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24 }}>
              <input type="checkbox" checked={dmsEnabled} onChange={(e) => setDmsEnabled(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
              <span style={{ position: 'absolute', cursor: 'pointer', inset: 0, background: dmsEnabled ? 'var(--accent)' : 'var(--bg-tertiary)', borderRadius: 12, transition: '0.2s' }}>
                <span style={{ position: 'absolute', height: 18, width: 18, left: dmsEnabled ? 22 : 3, bottom: 3, background: '#fff', borderRadius: '50%', transition: '0.2s' }} />
              </span>
            </label>
          </div>
        </div>

        <button onClick={handleSave} className="btn-primary" disabled={saving} style={{ alignSelf: 'flex-start' }}>
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
