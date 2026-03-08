'use client';

import { useTheme, type Theme } from '@/contexts/ThemeContext';
import { useFont, type FontOption } from '@/contexts/FontContext';

const themes: { id: Theme; name: string; color: string; bg: string }[] = [
  { id: 'carbon', name: 'Carbon', color: '#FFD700', bg: '#121212' },
  { id: 'light', name: 'Light', color: '#D4A800', bg: '#F5F5F5' },
  { id: 'midnight', name: 'Midnight', color: '#5B8DEF', bg: '#0B1026' },
  { id: 'forest', name: 'Forest', color: '#4CAF50', bg: '#0D1A0D' },
  { id: 'crimson', name: 'Crimson', color: '#EF4444', bg: '#1A0D0D' },
  { id: 'christmas', name: 'Christmas', color: '#d42a2a', bg: '#0a0f0a' },
];

const fonts: { id: FontOption; name: string }[] = [
  { id: 'barlow', name: 'Barlow' },
  { id: 'rajdhani', name: 'Rajdhani' },
  { id: 'space-grotesk', name: 'Space Grotesk' },
  { id: 'ibm-plex-sans', name: 'IBM Plex Sans' },
];

export default function AppearancePage() {
  const { theme, setTheme } = useTheme();
  const { font, setFont } = useFont();

  const saveToDb = async (t: Theme, f: FontOption) => {
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme: t, font: f }),
    });
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '1.5rem' }}>Appearance</h1>

      <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Theme</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '2rem' }}>
        {themes.map((t) => (
          <button key={t.id} onClick={() => { setTheme(t.id); saveToDb(t.id, font); }} style={{
            background: t.bg, border: theme === t.id ? `2px solid ${t.color}` : '2px solid var(--border)',
            borderRadius: 12, padding: '1rem', cursor: 'pointer', textAlign: 'center', transition: 'border-color 0.15s',
          }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: t.color, margin: '0 auto 0.5rem' }} />
            <p style={{ fontSize: '0.85rem', fontWeight: 600, color: t.id === 'light' ? '#1A1A1A' : '#FFFFFF' }}>{t.name}</p>
          </button>
        ))}
      </div>

      <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Font</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {fonts.map((f) => {
          const fontVar: Record<string, string> = {
            barlow: 'var(--font-barlow)',
            rajdhani: 'var(--font-rajdhani)',
            'space-grotesk': 'var(--font-space-grotesk)',
            'ibm-plex-sans': 'var(--font-ibm-plex-sans)',
          };
          return (
            <button key={f.id} onClick={() => { setFont(f.id); saveToDb(theme, f.id); }} className="card" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer',
              borderColor: font === f.id ? 'var(--accent)' : 'var(--border)', textAlign: 'left',
            }}>
              <span style={{ fontSize: '0.95rem', fontFamily: `${fontVar[f.id]}, sans-serif` }}>{f.name}</span>
              {font === f.id && <span style={{ color: 'var(--accent)', fontSize: '0.8rem', fontWeight: 600 }}>Active</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
