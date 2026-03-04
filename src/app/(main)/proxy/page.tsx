'use client';

import { useState, useEffect, FormEvent } from 'react';
import { Globe, ArrowRight, Search } from 'lucide-react';
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
      const { registerServiceWorker } = await import('@/lib/proxy/register');
      await registerServiceWorker(engine);
      setProxyUrl(encodeUrl(url.trim(), engine));
    } catch (err: any) {
      setError(err.message || 'Failed to start proxy');
    }
    setLoading(false);
  };

  if (proxyUrl) return <ProxyFrame url={proxyUrl} onClose={() => setProxyUrl(null)} />;

  return (
    <div style={{
      maxWidth: 580,
      margin: '6rem auto 0',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '2rem',
    }}>
      <div className="animate-in-up" style={{ textAlign: 'center' }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16, margin: '0 auto 1rem',
          background: 'var(--accent-muted)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Globe size={26} style={{ color: 'var(--accent)' }} />
        </div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.4rem' }}>Web Proxy</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
          Browse freely. Enter a URL below.
        </p>
      </div>

      {/* Engine toggle */}
      <div className="animate-in stagger-2" style={{
        display: 'flex',
        background: 'var(--bg-tertiary)',
        borderRadius: 10,
        padding: 3,
        border: '1px solid var(--border)',
      }}>
        {(['ultraviolet', 'scramjet'] as ProxyEngine[]).map((e) => (
          <button key={e} onClick={() => handleEngineChange(e)} style={{
            padding: '7px 18px',
            borderRadius: 8,
            fontSize: '0.82rem',
            fontWeight: engine === e ? 600 : 400,
            background: engine === e ? 'var(--accent)' : 'transparent',
            color: engine === e ? 'var(--bg-primary)' : 'var(--text-muted)',
            transition: 'all 0.2s',
          }}>
            {e === 'ultraviolet' ? 'Ultraviolet' : 'Scramjet'}
          </button>
        ))}
      </div>

      {/* URL input */}
      <form onSubmit={handleSubmit} className="animate-in stagger-3" style={{ width: '100%', position: 'relative' }}>
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{
            position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text-muted)',
          }} />
          <input
            type="text"
            placeholder="Search or enter URL..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            style={{
              paddingLeft: 44,
              paddingRight: 52,
              height: 50,
              fontSize: '0.95rem',
              borderRadius: 14,
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
            }}
          />
          <button
            type="submit"
            disabled={loading || !url.trim()}
            style={{
              position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
              width: 38, height: 38, borderRadius: 10,
              background: url.trim() ? 'var(--accent)' : 'var(--bg-tertiary)',
              color: url.trim() ? 'var(--bg-primary)' : 'var(--text-muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
            }}
          >
            <ArrowRight size={16} />
          </button>
        </div>
      </form>

      {error && (
        <p style={{ color: 'var(--danger)', fontSize: '0.82rem', animation: 'fadeIn 0.2s' }}>{error}</p>
      )}
    </div>
  );
}
