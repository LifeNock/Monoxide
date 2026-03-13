'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Play, Plus, Check, Star, ChevronLeft, ChevronDown, Loader2 } from 'lucide-react';

const POSTER_BASE = 'https://image.tmdb.org/t/p/w342';
const BACKDROP_BASE = 'https://image.tmdb.org/t/p/w1280';

interface Episode {
  episode_number: number;
  name: string;
  overview: string;
  still_path: string | null;
  runtime: number | null;
  air_date: string;
}

interface Season {
  season_number: number;
  name: string;
  episode_count: number;
  poster_path: string | null;
}

interface Details {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  rating: number;
  year: string;
  runtime?: number;
  genres: string[];
  seasons?: Season[];
  media_type: string;
}

export default function MediaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const type = params.type as string;
  const tmdbId = params.id as string;

  const [details, setDetails] = useState<Details | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [episodesLoading, setEpisodesLoading] = useState(false);
  const [inWatchlist, setInWatchlist] = useState(false);


  useEffect(() => {
    loadDetails();
    checkWatchlist();
  }, [tmdbId, type]);

  useEffect(() => {
    if ((type === 'show' || type === 'anime') && details) {
      loadEpisodes(selectedSeason);
    }
  }, [selectedSeason, details]);

  const loadDetails = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/media/details?id=${tmdbId}&type=${type}`);
      const data = await res.json();
      setDetails(data);
    } finally {
      setLoading(false);
    }
  };

  const loadEpisodes = async (season: number) => {
    setEpisodesLoading(true);
    try {
      const res = await fetch(`/api/media/episodes?id=${tmdbId}&season=${season}`);
      const data = await res.json();
      setEpisodes(Array.isArray(data) ? data : []);
    } finally {
      setEpisodesLoading(false);
    }
  };


  const checkWatchlist = async () => {
    const res = await fetch('/api/media/watchlist');
    const data = await res.json();
    if (Array.isArray(data)) {
      setInWatchlist(data.some((w: any) => w.tmdb_id === parseInt(tmdbId) && w.media_type === type));
    }
  };

  const toggleWatchlist = async () => {
    if (!details) return;
    await fetch('/api/media/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tmdb_id: details.id,
        media_type: type,
        title: details.title,
        poster_path: details.poster_path,
        action: inWatchlist ? 'remove' : 'add',
      }),
    });
    setInWatchlist(!inWatchlist);
  };

  const playMovie = () => {
    router.push(`/media/watch/${type}/${tmdbId}`);
  };

  const playEpisode = (ep: Episode, seasonNum: number) => {
    router.push(`/media/watch/${type}/${tmdbId}?s=${seasonNum}&e=${ep.episode_number}&eptitle=${encodeURIComponent(ep.name)}`);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)' }} />
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!details) return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Content not found.</div>;

  return (
    <>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .ep-row { display: flex; align-items: flex-start; gap: 0.75rem; padding: 0.6rem; border-radius: 8px; cursor: pointer; transition: background 0.15s; border: none; background: none; width: 100%; text-align: left; font-family: inherit; }
        .ep-row:hover { background: var(--bg-tertiary); }
        .ep-still { width: 120px; flex-shrink: 0; aspect-ratio: 16/9; border-radius: 6px; overflow: hidden; background: var(--bg-tertiary); }
      `}</style>

      {/* Backdrop */}
      {details.backdrop_path && (
        <div style={{ position: 'relative', height: 320, overflow: 'hidden', margin: '-1.5rem -1.5rem 0', marginBottom: '1.5rem' }}>
          <img src={`${BACKDROP_BASE}${details.backdrop_path}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, var(--bg-primary) 100%)' }} />
        </div>
      )}

      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <button onClick={() => router.back()} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginBottom: '1rem', fontSize: '0.85rem', fontFamily: 'inherit' }}>
          <ChevronLeft size={16} /> Back
        </button>

        {/* Info row */}
        <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          {/* Poster */}
          <div style={{ width: 180, flexShrink: 0, borderRadius: 12, overflow: 'hidden', background: 'var(--bg-secondary)' }}>
            {details.poster_path ? (
              <img src={`${POSTER_BASE}${details.poster_path}`} alt={details.title} style={{ width: '100%', display: 'block' }} />
            ) : (
              <div style={{ aspectRatio: '2/3', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No image</div>
            )}
          </div>

          {/* Meta */}
          <div style={{ flex: 1, minWidth: 240 }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.4rem', color: 'var(--text-primary)', lineHeight: 1.2 }}>{details.title}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
              {details.year && <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{details.year}</span>}
              {details.rating > 0 && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: '#fbbf24', fontSize: '0.85rem' }}>
                  <Star size={13} fill="#fbbf24" /> {details.rating.toFixed(1)}
                </span>
              )}
              {details.runtime && <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{details.runtime}m</span>}
            </div>
            {details.genres.length > 0 && (
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                {details.genres.map(g => (
                  <span key={g} style={{ padding: '3px 10px', borderRadius: 16, background: 'var(--bg-tertiary)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{g}</span>
                ))}
              </div>
            )}
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.6, marginBottom: '1.25rem', maxWidth: 600 }}>{details.overview}</p>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {type === 'movie' && (
                <button onClick={playMovie} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.5rem', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'inherit' }}>
                  <Play size={16} fill="white" /> Play
                </button>
              )}
              <button onClick={toggleWatchlist} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.25rem', borderRadius: 8, border: '1px solid var(--border)', background: inWatchlist ? 'var(--accent-muted)' : 'var(--bg-secondary)', color: inWatchlist ? 'var(--accent)' : 'var(--text-primary)', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit' }}>
                {inWatchlist ? <><Check size={15} /> In My List</> : <><Plus size={15} /> My List</>}
              </button>
            </div>

          </div>
        </div>

        {/* Episodes — for show and anime */}
        {(type === 'show' || type === 'anime') && details.seasons && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Episodes</h2>
              {details.seasons.length > 1 && (
                <div style={{ position: 'relative' }}>
                  <select
                    value={selectedSeason}
                    onChange={e => setSelectedSeason(Number(e.target.value))}
                    style={{ appearance: 'none', padding: '0.4rem 2rem 0.4rem 0.75rem', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit', outline: 'none' }}
                  >
                    {details.seasons.map(s => (
                      <option key={s.season_number} value={s.season_number}>{s.name} ({s.episode_count} eps)</option>
                    ))}
                  </select>
                  <ChevronDown size={14} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
                </div>
              )}
            </div>

            {episodesLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)' }} />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {episodes.map(ep => (
                  <button key={ep.episode_number} className="ep-row" onClick={() => playEpisode(ep, selectedSeason)}>
                    <div className="ep-still">
                      {ep.still_path ? (
                        <img src={`https://image.tmdb.org/t/p/w300${ep.still_path}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Play size={20} style={{ opacity: 0.3 }} />
                        </div>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 3 }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>E{ep.episode_number}</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{ep.name}</span>
                        {ep.runtime && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>{ep.runtime}m</span>}
                      </div>
                      {ep.overview && (
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {ep.overview}
                        </p>
                      )}
                    </div>
                    <Play size={16} style={{ color: 'var(--text-muted)', flexShrink: 0, alignSelf: 'center' }} />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
