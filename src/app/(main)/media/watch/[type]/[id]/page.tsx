'use client';

import { Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { ChevronLeft, Loader2, AlertCircle, RefreshCw } from 'lucide-react';

function WatchPageInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const type = params.type as string;
  const tmdbId = params.id as string;
  const season = searchParams.get('s');
  const episode = searchParams.get('e');
  const epTitle = searchParams.get('eptitle');
  const startTime = parseInt(searchParams.get('t') || '0', 10);

  const [source, setSource] = useState<{ type: string; url: string | null; subtitles?: any[]; provider?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<{ title: string; poster_path: string | null } | null>(null);
  const [dubbed, setDubbed] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);
  const lastSaved = useRef(0);

  useEffect(() => {
    loadDetails();
  }, []);

  useEffect(() => {
    loadSource(dubbed);
  }, [dubbed]);

  const loadDetails = async () => {
    try {
      const res = await fetch(`/api/media/details?id=${tmdbId}&type=${type}`);
      const data = await res.json();
      if (data.title) setDetails({ title: data.title, poster_path: data.poster_path });
    } catch {}
  };

  const loadSource = async (dub: boolean) => {
    setLoading(true);
    setError(null);
    try {
      let apiUrl = `/api/media/source?type=${type}&id=${tmdbId}&dub=${dub ? '1' : '0'}`;
      if (season) apiUrl += `&s=${season}`;
      if (episode) apiUrl += `&e=${episode}`;

      const res = await fetch(apiUrl);
      const data = await res.json();

      if (!res.ok || data.error) throw new Error(data.error || `API error ${res.status}`);
      if (!data.url) throw new Error('No stream URL returned');

      setSource(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load stream');
    } finally {
      setLoading(false);
    }
  };

  // Init HLS for direct streams
  useEffect(() => {
    if (!source || source.type !== 'hls' || !source.url || !videoRef.current) return;
    const initHls = async () => {
      const Hls = (await import('hls.js')).default;
      if (hlsRef.current) hlsRef.current.destroy();
      if (Hls.isSupported()) {
        const hls = new Hls();
        hlsRef.current = hls;
        hls.loadSource(source.url!);
        hls.attachMedia(videoRef.current!);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          const v = videoRef.current;
          if (!v) return;
          if (startTime > 0) v.currentTime = startTime;
          v.play().catch(() => {});
        });
        hls.on(Hls.Events.ERROR, (_: any, data: any) => {
          if (data.fatal) setError(`Stream error: ${data.details}`);
        });
      } else if (videoRef.current?.canPlayType('application/vnd.apple.mpegurl')) {
        const v = videoRef.current;
        v.src = source.url!;
        if (startTime > 0) v.currentTime = startTime;
        v.play().catch(() => {});
      }
    };
    initHls();
  }, [source]);

  const saveProgress = useCallback(async (currentTime: number, duration: number) => {
    if (!details || Math.abs(currentTime - lastSaved.current) < 15) return;
    lastSaved.current = currentTime;
    await fetch('/api/media/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tmdb_id: parseInt(tmdbId),
        media_type: type,
        title: details.title,
        poster_path: details.poster_path,
        season: season ? parseInt(season) : null,
        episode: episode ? parseInt(episode) : null,
        episode_title: epTitle || null,
        timestamp_seconds: Math.floor(currentTime),
        duration_seconds: Math.floor(duration),
        completed: duration > 0 && currentTime / duration > 0.9,
      }),
    });
  }, [details, tmdbId, type, season, episode, epTitle]);

  // For embeds: mark watched after 30s
  useEffect(() => {
    if (source?.type !== 'embed' || !details) return;
    const timer = setTimeout(() => {
      fetch('/api/media/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tmdb_id: parseInt(tmdbId),
          media_type: type,
          title: details.title,
          poster_path: details.poster_path,
          season: season ? parseInt(season) : null,
          episode: episode ? parseInt(episode) : null,
          episode_title: epTitle || null,
          timestamp_seconds: 30,
          duration_seconds: null,
          completed: false,
        }),
      });
    }, 30000);
    return () => clearTimeout(timer);
  }, [source, details]);

  const title = details?.title || 'Loading...';
  const subtitle = season && episode
    ? `S${season} E${episode}${epTitle ? ` — ${epTitle}` : ''}`
    : null;

  return (
    <>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 50 }}>

        {/* Top bar */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 56, display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0 1rem', background: 'linear-gradient(to bottom, rgba(0,0,0,0.85), transparent)', zIndex: 20 }}>
          <button onClick={() => router.back()} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', cursor: 'pointer', padding: '6px 12px', borderRadius: 6, fontSize: '0.82rem', fontFamily: 'inherit' }}>
            <ChevronLeft size={16} /> Back
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>{title}</div>
            {subtitle && <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.75rem' }}>{subtitle}</div>}
          </div>

          {/* Sub / Dub toggle — hidden for anikai embeds (player has its own) */}
          {source?.provider !== 'anikai' && (
            <div style={{ display: 'flex', background: 'rgba(0,0,0,0.5)', borderRadius: 6, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.15)' }}>
              <button
                onClick={() => setDubbed(false)}
                style={{ padding: '5px 12px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.78rem', fontWeight: 600, background: !dubbed ? 'rgba(255,255,255,0.2)' : 'transparent', color: !dubbed ? '#fff' : 'rgba(255,255,255,0.5)', transition: 'all 0.15s' }}
              >
                SUB
              </button>
              <button
                onClick={() => setDubbed(true)}
                style={{ padding: '5px 12px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.78rem', fontWeight: 600, background: dubbed ? 'rgba(255,255,255,0.2)' : 'transparent', color: dubbed ? '#fff' : 'rgba(255,255,255,0.5)', transition: 'all 0.15s' }}
              >
                DUB
              </button>
            </div>
          )}
          {source?.provider === 'anikai' && (
            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', background: 'rgba(0,0,0,0.4)', padding: '5px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)' }}>
              Use DUB/SUB buttons inside the player
            </div>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', color: '#fff' }}>
            <Loader2 size={40} style={{ animation: 'spin 1s linear infinite' }} />
            <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>Loading stream...</div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', color: '#fff', textAlign: 'center', padding: '2rem' }}>
            <AlertCircle size={40} style={{ color: '#ef4444' }} />
            <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>Failed to load stream</div>
            <div style={{ fontSize: '0.85rem', opacity: 0.7, maxWidth: 400, background: 'rgba(255,255,255,0.07)', padding: '0.6rem 1rem', borderRadius: 8, fontFamily: 'monospace', wordBreak: 'break-all' }}>
              {error}
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button onClick={() => loadSource(dubbed)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.5rem 1.25rem', borderRadius: 8, border: 'none', background: '#6366f1', color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: '0.85rem' }}>
                <RefreshCw size={14} /> Retry
              </button>
              <button onClick={() => router.back()} style={{ padding: '0.5rem 1.25rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'none', color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: '0.85rem' }}>
                Go Back
              </button>
            </div>
          </div>
        )}

        {/* Player */}
        {!loading && !error && source && (
          <>
            {source.type === 'hls' && (
              <video
                ref={videoRef}
                controls
                onTimeUpdate={() => {
                  const v = videoRef.current;
                  if (v?.duration) saveProgress(v.currentTime, v.duration);
                }}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', background: '#000' }}
                crossOrigin="anonymous"
              >
                {source.subtitles?.map((sub: any, i: number) => (
                  <track key={i} kind="subtitles" src={sub.url} label={sub.lang} srcLang={sub.lang} default={i === 0} />
                ))}
              </video>
            )}

            {source.type === 'embed' && source.url && (
              <iframe
                ref={iframeRef}
                src={source.url}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
                allowFullScreen
                allow="autoplay; fullscreen"
                referrerPolicy="no-referrer"
              />
            )}
          </>
        )}
      </div>
    </>
  );
}

export default function WatchPage() {
  return (
    <Suspense fallback={
      <div style={{ position: 'fixed', inset: 0, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={40} color="white" style={{ animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <WatchPageInner />
    </Suspense>
  );
}
