'use client';

import { useState, useEffect, FormEvent } from 'react';
import { Globe, ArrowRight } from 'lucide-react';
import ProxyFrame from '@/components/ProxyFrame';
import { encodeUrl } from '@/lib/proxy/encode';
import type { ProxyEngine } from '@/lib/proxy/register';

export default function ProxyPage() {
  const [url, setUrl] = useState('');
  const [engine, setEngine] = useState<ProxyEngine>('ultraviolet');
  const [proxyUrl, setProxyUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('monoxide-proxy-engine') as ProxyEngine | null;
    if (saved) setEngine(saved);
  }, []);

  const handleEngineChange = (e: ProxyEngine) => {
    setEngine(e);
    localStorage.setItem('monoxide-proxy-engine', e);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setError('');
    setLoading(true);

    try {
      // Dynamic import to avoid SSR issues
      const { registerServiceWorker } = await import('@/lib/proxy/register');
      await registerServiceWorker(engine);

      const encoded = encodeUrl(url.trim(), engine);
      setProxyUrl(encoded);
    } catch (err: any) {
      setError(err.message || 'Failed to start proxy');
    }

    setLoading(false);
  };

  if (proxyUrl) {
    return <ProxyFrame url={proxyUrl} onClose={() => setProxyUrl(null)} />;
  }

  return (
    <div style={{
      maxWidth: 640,
      margin: '4rem auto',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '2rem',
    }}>
      <Globe size={48} style={{ color: 'var(--accent)' }} />
      <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Web Proxy</h1>
      <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>
        Browse the web freely. Enter a URL or search term below.
      </p>

      {/* Engine toggle */}
      <div style={{
        display: 'flex',
        background: 'var(--bg-tertiary)',
        borderRadius: 8,
        padding: 3,
        gap: 2,
      }}>
        {(['ultraviolet', 'scramjet'] as ProxyEngine[]).map((e) => (
          <button
            key={e}
            onClick={() => handleEngineChange(e)}
            style={{
              padding: '6px 16px',
              borderRadius: 6,
              fontSize: '0.85rem',
              fontWeight: engine === e ? 600 : 400,
              background: engine === e ? 'var(--accent)' : 'transparent',
              color: engine === e ? '#000' : 'var(--text-secondary)',
            }}
          >
            {e === 'ultraviolet' ? 'Ultraviolet' : 'Scramjet'}
          </button>
        ))}
      </div>

      {/* URL input */}
      <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', gap: '0.5rem' }}>
        <input
          type="text"
          placeholder="Enter URL or search term..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          style={{
            flex: 1,
            borderColor: 'var(--accent)',
            fontSize: '1rem',
          }}
        />
        <button
          type="submit"
          className="btn-primary"
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '10px 20px',
          }}
        >
          {loading ? 'Loading...' : <><ArrowRight size={18} /> Go</>}
        </button>
      </form>

      {error && (
        <p style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>{error}</p>
      )}
    </div>
  );
}
