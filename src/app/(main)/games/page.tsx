'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Search, X, ArrowLeft, Loader2, Maximize, RefreshCw, ExternalLink, Repeat } from 'lucide-react';
import GameCard from '@/components/GameCard';

interface GameSource {
  provider: string;
  url: string;
}

interface Game {
  id: number;
  name: string;
  url: string;
  image: string;
  category: string;
  popular: boolean;
  source?: string;
  sources?: GameSource[];
}

const categories = [
  'all', 'popular', 'action', 'arcade', 'shooter', 'sports', 'racing', 'puzzle',
  'multiplayer', 'sandbox', 'simulation', 'adventure', 'horror', 'music',
  'strategy', 'idle', 'art', 'dress-up', 'other'
];

const PAGE_SIZE = 60;

export default function GamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [activeGame, setActiveGame] = useState<Game | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/games')
      .then(r => r.json())
      .then(data => { setGames(data); setLoaded(true); });
  }, []);

  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [category, search]);

  const filtered = useMemo(() => {
    let result = games;
    if (category === 'popular') result = result.filter(g => g.popular);
    else if (category !== 'all') result = result.filter(g => g.category === category);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(g => g.name.toLowerCase().includes(q));
    }
    return result;
  }, [games, category, search]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    setTimeout(() => {
      setVisibleCount(v => v + PAGE_SIZE);
      setLoadingMore(false);
    }, 300);
  }, [hasMore, loadingMore]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore, hasMore]);

  const activeCategories = useMemo(() => {
    return categories.filter(cat => {
      if (cat === 'all' || cat === 'popular') return true;
      return games.some(g => g.category === cat);
    });
  }, [games]);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeSourceIdx, setActiveSourceIdx] = useState(0);

  const activeUrl = activeGame?.sources?.[activeSourceIdx]?.url || activeGame?.url || '';
  const activeProvider = activeGame?.sources?.[activeSourceIdx]?.provider || activeGame?.source || 'gnmath';
  const hasFallback = (activeGame?.sources?.length || 0) > 1;

  const switchSource = () => {
    if (!activeGame?.sources || activeGame.sources.length < 2) return;
    setActiveSourceIdx(i => (i + 1) % activeGame.sources!.length);
  };

  const handleFullscreen = async () => {
    const el = gameContainerRef.current;
    if (!el) return;
    try {
      await el.requestFullscreen({ navigationUI: 'hide' });
      if ('keyboard' in navigator && (navigator as any).keyboard?.lock) {
        await (navigator as any).keyboard.lock([]);
      }
    } catch {}
  };

  useEffect(() => {
    const handler = () => {
      const fs = !!document.fullscreenElement;
      setIsFullscreen(fs);
      if (!fs && 'keyboard' in navigator && (navigator as any).keyboard?.unlock) {
        (navigator as any).keyboard.unlock();
      }
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  useEffect(() => {
    (window as any).__monoxide_game_fullscreen = isFullscreen;
    return () => { (window as any).__monoxide_game_fullscreen = false; };
  }, [isFullscreen]);

  const handleRefresh = () => {
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
    }
  };

  const handleNewTab = () => {
    if (activeGame) window.open(activeGame.url, '_blank');
  };

  if (activeGame) {
    const btnStyle = {
      background: 'none', color: 'var(--text-secondary)',
      padding: 6, display: 'flex', alignItems: 'center', cursor: 'pointer',
      border: 'none', borderRadius: 4,
    } as const;

    return (
      <div ref={gameContainerRef} style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 1000, display: 'flex', flexDirection: 'column',
        background: '#000',
      }}>
        <div style={{
          height: 40, background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', padding: '0 10px', gap: 4,
        }}>
          <button onClick={() => setActiveGame(null)} style={btnStyle} title="Back">
            <ArrowLeft size={17} />
          </button>
          <span style={{ fontWeight: 600, fontSize: '0.85rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{activeGame.name}</span>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', padding: '2px 6px', background: 'var(--bg-tertiary)', borderRadius: 4 }}>{activeProvider}</span>
          {hasFallback && (
            <button onClick={switchSource} style={btnStyle} title="Switch source">
              <Repeat size={15} />
            </button>
          )}
          <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 2px' }} />
          <button onClick={handleRefresh} style={btnStyle} title="Reload">
            <RefreshCw size={15} />
          </button>
          <button onClick={handleFullscreen} style={btnStyle} title="Fullscreen">
            <Maximize size={15} />
          </button>
          <button onClick={handleNewTab} style={btnStyle} title="Open in new tab">
            <ExternalLink size={15} />
          </button>
          <button onClick={() => setActiveGame(null)} style={btnStyle} title="Close">
            <X size={17} />
          </button>
        </div>
        <iframe
          ref={iframeRef}
          src={activeUrl}
          style={{ flex: 1, border: 'none', width: '100%', background: '#000' }}
          allow="autoplay; fullscreen; gamepad; accelerometer; gyroscope"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div style={{ overflow: 'hidden', maxWidth: '100%' }}>
      {/* Search */}
      <div style={{ position: 'relative', maxWidth: 340, marginBottom: '0.75rem' }}>
        <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input type="text" placeholder="Search 1000+ games..." value={search} onChange={(e) => setSearch(e.target.value)}
          style={{ paddingLeft: 34, height: 38, fontSize: '0.85rem', borderRadius: 10 }}
        />
      </div>

      {/* Categories */}
      <div style={{
        display: 'flex', gap: '3px', marginBottom: '1rem',
        overflowX: 'auto', paddingBottom: '0.25rem',
        scrollbarWidth: 'thin',
      }}>
        {activeCategories.map((cat) => (
          <button key={cat} onClick={() => setCategory(cat)} style={{
            padding: '5px 12px', borderRadius: 7, fontSize: '0.75rem',
            fontWeight: category === cat ? 600 : 400,
            background: category === cat ? 'var(--accent)' : 'var(--bg-tertiary)',
            color: category === cat ? 'var(--bg-primary)' : 'var(--text-muted)',
            textTransform: 'capitalize', whiteSpace: 'nowrap',
            border: '1px solid transparent',
            borderColor: category === cat ? 'transparent' : 'var(--border)',
            transition: 'all 0.2s', cursor: 'pointer',
          }}>
            {cat === 'all' ? 'All' : cat === 'popular' ? 'Popular' : cat.replace('-', ' ')}
          </button>
        ))}
      </div>

      {/* Game count */}
      <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginBottom: '0.5rem' }}>
        {filtered.length} game{filtered.length !== 1 ? 's' : ''}
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(min(130px, 100%), 1fr))',
        gap: '0.6rem',
        maxWidth: '100%',
      }}>
        {visible.map((game) => (
          <GameCard
            key={game.id}
            name={game.name}
            image={game.image}
            category={game.category}
            onClick={() => { setActiveSourceIdx(0); setActiveGame(game); }}
          />
        ))}
      </div>

      {hasMore && (
        <div ref={sentinelRef} style={{ display: 'flex', justifyContent: 'center', padding: '1.5rem 0' }}>
          <Loader2 size={22} className="spin" style={{ color: 'var(--text-muted)' }} />
        </div>
      )}

      {filtered.length === 0 && loaded && (
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '3rem', fontSize: '0.88rem' }}>
          No games found
        </p>
      )}
    </div>
  );
}
