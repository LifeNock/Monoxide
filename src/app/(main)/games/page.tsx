'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, X, ArrowLeft } from 'lucide-react';
import GameCard from '@/components/GameCard';

interface Game {
  id: number;
  name: string;
  url: string;
  image: string;
  category: string;
  popular: boolean;
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

  useEffect(() => {
    fetch('/api/games')
      .then(r => r.json())
      .then(data => { setGames(data); setLoaded(true); });
  }, []);

  // Reset visible count when filters change
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

  // Only show categories that have games
  const activeCategories = useMemo(() => {
    return categories.filter(cat => {
      if (cat === 'all' || cat === 'popular') return true;
      return games.some(g => g.category === cat);
    });
  }, [games]);

  if (activeGame) {
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 1000, display: 'flex', flexDirection: 'column',
        background: '#000',
      }}>
        <div style={{
          height: 40, background: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', padding: '0 10px', gap: 6,
        }}>
          <button onClick={() => setActiveGame(null)} style={{
            background: 'none', color: 'var(--text-secondary)',
            padding: 4, display: 'flex', alignItems: 'center', cursor: 'pointer', border: 'none',
          }}>
            <ArrowLeft size={17} />
          </button>
          <span style={{ fontWeight: 600, fontSize: '0.85rem', flex: 1 }}>{activeGame.name}</span>
          <button onClick={() => setActiveGame(null)} style={{
            background: 'none', color: 'var(--text-secondary)',
            padding: 4, display: 'flex', alignItems: 'center', cursor: 'pointer', border: 'none',
          }}>
            <X size={17} />
          </button>
        </div>
        <iframe
          src={activeGame.url}
          style={{ flex: 1, border: 'none', width: '100%', background: '#000' }}
          allow="autoplay; fullscreen; gamepad; accelerometer; gyroscope"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div>
      {/* Search */}
      <div style={{ position: 'relative', maxWidth: 340, marginBottom: '0.75rem' }}>
        <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input type="text" placeholder="Search 700+ games..." value={search} onChange={(e) => setSearch(e.target.value)}
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

      {/* Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(145px, 1fr))',
        gap: '0.6rem',
      }}>
        {visible.map((game) => (
          <GameCard
            key={game.id}
            name={game.name}
            image={game.image}
            category={game.category}
            onClick={() => setActiveGame(game)}
          />
        ))}
      </div>

      {/* Load more */}
      {visibleCount < filtered.length && (
        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <button onClick={() => setVisibleCount(v => v + PAGE_SIZE)} style={{
            padding: '8px 24px', borderRadius: 8, fontSize: '0.82rem',
            background: 'var(--bg-tertiary)', color: 'var(--text-secondary)',
            border: '1px solid var(--border)', cursor: 'pointer',
            transition: 'all 0.2s',
          }}>
            Load More ({filtered.length - visibleCount} remaining)
          </button>
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
