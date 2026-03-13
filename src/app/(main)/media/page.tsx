'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Play, Plus, Check, Clock, ChevronRight, Film, Tv, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';

type MediaType = 'anime' | 'movie' | 'show';

interface MediaItem {
  id: number;
  title: string;
  poster_path: string | null;
  backdrop_path?: string | null;
  rating: number;
  year: string;
  media_type: MediaType;
}

interface WatchHistoryItem {
  id: string;
  tmdb_id: number;
  media_type: MediaType;
  title: string;
  poster_path: string | null;
  season: number | null;
  episode: number | null;
  episode_title: string | null;
  timestamp_seconds: number;
  duration_seconds: number | null;
  completed: boolean;
  last_watched_at: string;
}

interface WatchlistItem {
  id: string;
  tmdb_id: number;
  media_type: MediaType;
  title: string;
  poster_path: string | null;
}

const POSTER_BASE = 'https://image.tmdb.org/t/p/w342';

export default function MediaPage() {
  const router = useRouter();
  const [tab, setTab] = useState<MediaType>('anime');
  const [trending, setTrending] = useState<MediaItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MediaItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [watchlistIds, setWatchlistIds] = useState<Set<string>>(new Set());
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadTrending(tab);
    loadHistory();
    loadWatchlist();
  }, []);

  useEffect(() => {
    setSearchQuery('');
    setSearchResults([]);
    loadTrending(tab);
  }, [tab]);

  const loadTrending = async (type: MediaType) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/media/trending?type=${type}`);
      const data = await res.json();
      setTrending(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    const res = await fetch('/api/media/history');
    const data = await res.json();
    setHistory(Array.isArray(data) ? data : []);
  };

  const loadWatchlist = async () => {
    const res = await fetch('/api/media/watchlist');
    const data = await res.json();
    if (Array.isArray(data)) {
      setWatchlist(data);
      setWatchlistIds(new Set(data.map((w: WatchlistItem) => `${w.tmdb_id}-${w.media_type}`)));
    }
  };

  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    searchTimeout.current = setTimeout(async () => {
      const res = await fetch(`/api/media/search?q=${encodeURIComponent(q)}&type=${tab}`);
      const data = await res.json();
      setSearchResults(Array.isArray(data) ? data : []);
      setSearching(false);
    }, 400);
  }, [tab]);

  const toggleWatchlist = async (item: MediaItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const key = `${item.id}-${item.media_type}`;
    const isIn = watchlistIds.has(key);
    await fetch('/api/media/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tmdb_id: item.id,
        media_type: item.media_type,
        title: item.title,
        poster_path: item.poster_path,
        action: isIn ? 'remove' : 'add',
      }),
    });
    setWatchlistIds(prev => {
      const next = new Set(prev);
      isIn ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const openDetail = (item: MediaItem | WatchlistItem) => {
    const id = 'tmdb_id' in item ? item.tmdb_id : item.id;
    router.push(`/media/${item.media_type}/${id}`);
  };

  const continueWatching = history.filter(h => !h.completed && h.timestamp_seconds > 10).slice(0, 10);
  const displayItems = searchQuery.length >= 2 ? searchResults : trending;

  return (
    <>
      <style>{`
        .media-tab { padding: 0.55rem 1.25rem; border: none; background: none; color: var(--text-muted); font-size: 0.875rem; font-weight: 500; cursor: pointer; border-bottom: 2px solid transparent; transition: color 0.15s, border-color 0.15s; font-family: inherit; white-space: nowrap; }
        .media-tab:hover { color: var(--text-primary); }
        .media-tab.active { color: var(--text-primary); border-bottom-color: var(--accent); font-weight: 600; }
        .media-card { position: relative; cursor: pointer; border-radius: 10px; overflow: hidden; background: var(--bg-secondary); transition: transform 0.2s ease, box-shadow 0.2s ease; flex-shrink: 0; }
        .media-card:hover { transform: translateY(-4px) scale(1.02); box-shadow: 0 12px 32px rgba(0,0,0,0.4); }
        .media-card:hover .card-overlay { opacity: 1; }
        .card-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.85) 40%, transparent 70%); opacity: 0; transition: opacity 0.2s ease; display: flex; flex-direction: column; justify-content: flex-end; padding: 0.75rem; }
        .poster-row { display: flex; gap: 0.75rem; overflow-x: auto; padding-bottom: 0.5rem; scrollbar-width: thin; }
        .poster-row::-webkit-scrollbar { height: 4px; }
        .poster-row::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }
        .watchlist-btn { position: absolute; top: 8px; right: 8px; width: 28px; height: 28px; border-radius: 50%; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: transform 0.15s; z-index: 2; }
        .watchlist-btn:hover { transform: scale(1.15); }
        .section-title { font-size: 1rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem; }
        .progress-bar { position: absolute; bottom: 0; left: 0; right: 0; height: 3px; background: rgba(255,255,255,0.2); }
        .progress-fill { height: 100%; background: var(--accent); }
        .grid-layout { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 0.75rem; }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        .skeleton { background: linear-gradient(90deg, var(--bg-secondary) 25%, var(--bg-tertiary) 50%, var(--bg-secondary) 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 10px; }
      `}</style>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 0.5rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
            {(['anime', 'movie', 'show'] as MediaType[]).map(t => (
              <button key={t} className={`media-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
                {t === 'anime' ? <><Sparkles size={13} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 5 }} />Anime</> :
                 t === 'movie' ? <><Film size={13} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 5 }} />Movies</> :
                 <><Tv size={13} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 5 }} />Shows</>}
              </button>
            ))}
          </div>

          {/* Search */}
          <div style={{ position: 'relative', minWidth: 240 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              placeholder={`Search ${tab}...`}
              style={{ width: '100%', padding: '0.5rem 0.75rem 0.5rem 32px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none', fontFamily: 'inherit' }}
            />
          </div>
        </div>

        {/* Continue Watching */}
        {continueWatching.length > 0 && !searchQuery && (
          <section style={{ marginBottom: '2rem' }}>
            <div className="section-title">
              <Clock size={16} style={{ color: 'var(--accent)' }} /> Continue Watching
            </div>
            <div className="poster-row">
              {continueWatching.map(item => {
                const progress = item.duration_seconds ? (item.timestamp_seconds / item.duration_seconds) * 100 : 0;
                return (
                  <div
                    key={item.id}
                    className="media-card"
                    style={{ width: 140 }}
                    onClick={() => {
                      const params = item.season ? `?s=${item.season}&e=${item.episode}&t=${item.timestamp_seconds}` : `?t=${item.timestamp_seconds}`;
                      router.push(`/media/watch/${item.media_type}/${item.tmdb_id}${params}`);
                    }}
                  >
                    {item.poster_path ? (
                      <img src={`${POSTER_BASE}${item.poster_path}`} alt={item.title} style={{ width: '100%', aspectRatio: '2/3', objectFit: 'cover', display: 'block' }} />
                    ) : (
                      <div style={{ width: '100%', aspectRatio: '2/3', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Film size={32} style={{ opacity: 0.3 }} />
                      </div>
                    )}
                    <div className="card-overlay">
                      <Play size={20} fill="white" style={{ color: 'white', marginBottom: 4 }} />
                      <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#fff', lineHeight: 1.3 }}>{item.title}</div>
                      {item.episode && <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.7)' }}>S{item.season} E{item.episode}</div>}
                    </div>
                    {progress > 0 && (
                      <div className="progress-bar"><div className="progress-fill" style={{ width: `${Math.min(progress, 100)}%` }} /></div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Watchlist */}
        {watchlist.filter(w => w.media_type === tab).length > 0 && !searchQuery && (
          <section style={{ marginBottom: '2rem' }}>
            <div className="section-title">
              <Check size={16} style={{ color: 'var(--accent)' }} /> My List
            </div>
            <div className="poster-row">
              {watchlist.filter(w => w.media_type === tab).map(item => (
                <MediaCard
                  key={item.id}
                  item={{ ...item, id: item.tmdb_id, rating: 0, year: '', backdrop_path: null }}
                  inWatchlist={true}
                  onToggleWatchlist={(e) => toggleWatchlist({ ...item, id: item.tmdb_id, rating: 0, year: '', backdrop_path: null }, e)}
                  onClick={() => openDetail(item)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Trending / Search results */}
        <section>
          <div className="section-title">
            {searchQuery.length >= 2 ? (
              <><Search size={16} style={{ color: 'var(--accent)' }} /> {searching ? 'Searching...' : `Results for "${searchQuery}"`}</>
            ) : (
              <><ChevronRight size={16} style={{ color: 'var(--accent)' }} /> {tab === 'anime' ? 'Popular Anime' : tab === 'movie' ? 'Trending Movies' : 'Trending Shows'}</>
            )}
          </div>

          {loading ? (
            <div className="grid-layout">
              {Array.from({ length: 16 }).map((_, i) => (
                <div key={i} className="skeleton" style={{ aspectRatio: '2/3' }} />
              ))}
            </div>
          ) : (
            <div className="grid-layout">
              {displayItems.map(item => (
                <MediaCard
                  key={item.id}
                  item={item}
                  inWatchlist={watchlistIds.has(`${item.id}-${item.media_type}`)}
                  onToggleWatchlist={(e) => toggleWatchlist(item, e)}
                  onClick={() => openDetail(item)}
                />
              ))}
              {displayItems.length === 0 && searchQuery.length >= 2 && !searching && (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  No results found for &ldquo;{searchQuery}&rdquo;
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function MediaCard({ item, inWatchlist, onToggleWatchlist, onClick }: {
  item: MediaItem;
  inWatchlist: boolean;
  onToggleWatchlist: (e: React.MouseEvent) => void;
  onClick: () => void;
}) {
  return (
    <div className="media-card" onClick={onClick}>
      {item.poster_path ? (
        <img src={`${POSTER_BASE}${item.poster_path}`} alt={item.title} style={{ width: '100%', aspectRatio: '2/3', objectFit: 'cover', display: 'block' }} loading="lazy" />
      ) : (
        <div style={{ width: '100%', aspectRatio: '2/3', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Film size={32} style={{ opacity: 0.3 }} />
        </div>
      )}
      <div className="card-overlay">
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
          <Play size={14} fill="white" style={{ color: 'white', flexShrink: 0 }} />
          <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.8)' }}>{item.year}</span>
          {item.rating > 0 && <span style={{ fontSize: '0.7rem', color: '#fbbf24', marginLeft: 'auto' }}>★ {item.rating.toFixed(1)}</span>}
        </div>
        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#fff', lineHeight: 1.3 }}>{item.title}</div>
      </div>
      <button
        className="watchlist-btn"
        onClick={onToggleWatchlist}
        style={{ background: inWatchlist ? 'var(--accent)' : 'rgba(0,0,0,0.6)' }}
        title={inWatchlist ? 'Remove from list' : 'Add to list'}
      >
        {inWatchlist ? <Check size={13} color="white" /> : <Plus size={13} color="white" />}
      </button>
    </div>
  );
}
