'use client';

import { useState, useEffect, useRef, FormEvent } from 'react';
import { Globe, ArrowRight, Search, X, ArrowLeft, RefreshCw, Loader2 } from 'lucide-react';

type ProxyEngine = 'ultraviolet' | 'scramjet';

export default function ProxyPage() {
  const [url, setUrl] = useState('');
  const [engine, setEngine] = useState<ProxyEngine>('scramjet');
  const [proxyUrl, setProxyUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const initRef = useRef(false);

  useEffect(() => {
    const saved = localStorage.getItem('monoxide-proxy-engine') as ProxyEngine | null;
    if (saved) setEngine(saved);
    if (!initRef.current) {
      initRef.current = true;
      initProxy();
    }
  }, []);

  async function initProxy() {
    if (!('serviceWorker' in navigator)) {
      setError('Service workers not supported');
      return;
    }

    try {
      const reg = await navigator.serviceWorker.register('/uv/sw.js', { scope: '/uv/service/' });

      const sw = reg.installing || reg.waiting || reg.active;
      if (sw && sw.state !== 'activated') {
        await new Promise<void>((resolve, reject) => {
          const t = setTimeout(() => reject(new Error('SW activation timeout')), 15000);
          sw.addEventListener('statechange', () => {
            if (sw.state === 'activated') { clearTimeout(t); resolve(); }
            if (sw.state === 'redundant') { clearTimeout(t); reject(new Error('SW went redundant')); }
          });
        });
      }

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Transport setup timed out')), 12000);
        const s = document.createElement('script');
        s.type = 'module';
        s.src = '/proxy-init.js';

        const onReady = () => { cleanup(); clearTimeout(timeout); resolve(); };
        const onError = () => { cleanup(); clearTimeout(timeout); reject(new Error((window as any).__proxy_error || 'Transport failed')); };
        const cleanup = () => {
          window.removeEventListener('__proxy_ready', onReady);
          window.removeEventListener('__proxy_error', onError);
        };

        window.addEventListener('__proxy_ready', onReady);
        window.addEventListener('__proxy_error', onError);
        document.head.appendChild(s);
      });

      setReady(true);
    } catch (err: any) {
      setError('Failed to initialize proxy: ' + err.message);
    }
  }

  const handleEngineChange = (e: ProxyEngine) => {
    setEngine(e);
    localStorage.setItem('monoxide-proxy-engine', e);
  };

  const isUrl = (val: string) => {
    return /^https?:\/\//.test(val) || (val.includes('.') && !val.startsWith(' '));
  };

  const xorEncode = (str: string) => {
    if (!str) return str;
    return encodeURIComponent(
      str.split('').map((char, i) =>
        i % 2 ? String.fromCharCode(char.charCodeAt(0) ^ 2) : char
      ).join('')
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    let input = url.trim();
    if (!input) return;

    setError('');
    setLoading(true);

    if (!ready) {
      setError('Proxy is still initializing. Please wait.');
      setLoading(false);
      return;
    }

    if (!isUrl(input)) {
      input = `https://www.google.com/search?q=${encodeURIComponent(input)}`;
    } else if (!/^https?:\/\//.test(input)) {
      input = `https://${input}`;
    }

    const encoded = '/uv/service/' + xorEncode(input);
    setProxyUrl(encoded);
  };

  if (proxyUrl) {
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 1000, display: 'flex', flexDirection: 'column',
        background: '#000',
      }}>
        <div style={{
          height: 38, background: '#0a0a0a',
          borderBottom: '1px solid #1a1a1a',
          display: 'flex', alignItems: 'center', padding: '0 6px', gap: 3,
        }}>
          <button onClick={() => {
            const f = document.getElementById('proxy-frame') as HTMLIFrameElement;
            if (f?.contentWindow) f.contentWindow.history.back();
          }} style={{ background: 'none', color: '#888', padding: 4, display: 'flex', alignItems: 'center', cursor: 'pointer', border: 'none' }}>
            <ArrowLeft size={14} />
          </button>
          <button onClick={() => {
            const f = document.getElementById('proxy-frame') as HTMLIFrameElement;
            if (f) f.src = f.src;
          }} style={{ background: 'none', color: '#888', padding: 4, display: 'flex', alignItems: 'center', cursor: 'pointer', border: 'none' }}>
            <RefreshCw size={12} />
          </button>
          <div style={{
            flex: 1, background: '#111', border: '1px solid #222',
            borderRadius: 5, padding: '2px 8px', fontSize: '0.72rem',
            color: '#666', overflow: 'hidden',
            textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {url}
          </div>
          <button onClick={() => { setProxyUrl(null); setLoading(false); }} style={{
            background: 'none', color: '#888', padding: 4,
            display: 'flex', alignItems: 'center', cursor: 'pointer', border: 'none',
          }}>
            <X size={14} />
          </button>
        </div>
        <iframe
          id="proxy-frame"
          src={proxyUrl}
          style={{ flex: 1, border: 'none', width: '100%' }}
          onLoad={() => setLoading(false)}
        />
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: 520, margin: '5rem auto 0',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 48, height: 48, borderRadius: 14, margin: '0 auto 0.6rem',
          background: 'var(--accent-muted)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Globe size={22} style={{ color: 'var(--accent)' }} />
        </div>
        <h1 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.2rem' }}>Monoxide<sup style={{ fontSize: '0.5em', verticalAlign: 'super', opacity: 0.5 }}>™</sup> <span style={{ color: 'var(--text-secondary)' }}>Proxy</span></h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Browse any site freely</p>
      </div>

      <div style={{
        display: 'flex', background: 'var(--bg-tertiary)', borderRadius: 8, padding: 2,
        border: '1px solid var(--border)',
      }}>
        {(['scramjet', 'ultraviolet'] as ProxyEngine[]).map((e) => (
          <button key={e} onClick={() => handleEngineChange(e)} style={{
            padding: '5px 14px', borderRadius: 6, fontSize: '0.78rem',
            fontWeight: engine === e ? 600 : 400,
            background: engine === e ? 'var(--accent)' : 'transparent',
            color: engine === e ? 'var(--bg-primary)' : 'var(--text-muted)',
            transition: 'all 0.15s', cursor: 'pointer', border: 'none',
          }}>
            {e === 'ultraviolet' ? 'Ultraviolet' : 'Scramjet'}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} style={{ width: '100%' }}>
        <div style={{ position: 'relative' }}>
          <Search size={15} style={{
            position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text-muted)',
          }} />
          <input type="text" placeholder="Search or enter URL..." value={url}
            onChange={(e) => setUrl(e.target.value)} autoFocus
            style={{
              paddingLeft: 40, paddingRight: 48, height: 46, fontSize: '0.9rem', borderRadius: 12,
              background: 'var(--bg-secondary)', border: '1px solid var(--border)', width: '100%',
            }}
          />
          <button type="submit" disabled={loading || !url.trim()} style={{
            position: 'absolute', right: 5, top: '50%', transform: 'translateY(-50%)',
            width: 34, height: 34, borderRadius: 8,
            background: url.trim() && !loading ? 'var(--accent)' : 'var(--bg-tertiary)',
            color: url.trim() && !loading ? 'var(--bg-primary)' : 'var(--text-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: url.trim() && !loading ? 'pointer' : 'default', border: 'none',
          }}>
            {loading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <ArrowRight size={14} />}
          </button>
        </div>
      </form>

      {error && <p style={{ color: '#ff4444', fontSize: '0.78rem' }}>{error}</p>}

      <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
        {ready ? 'Proxy ready' : 'Initializing proxy...'}
        {' · '}{engine === 'scramjet' ? 'Scramjet' : 'Ultraviolet'} engine
      </p>
    </div>
  );
}
