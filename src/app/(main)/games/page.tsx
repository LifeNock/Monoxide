'use client';

import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import GameCard from '@/components/GameCard';
import ProxyFrame from '@/components/ProxyFrame';
import { encodeUrl } from '@/lib/proxy/encode';
import type { ProxyEngine } from '@/lib/proxy/register';

interface Game {
  id: string;
  name: string;
  url: string;
  image: string;
  category: string;
  popular: boolean;
}

const categories = ['all', 'popular', 'arcade', 'puzzle', 'action', 'sports', 'strategy', 'multiplayer', 'other'];

export default function GamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [proxyUrl, setProxyUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchGames();
  }, [category]);

  const fetchGames = async () => {
    const params = new URLSearchParams();
    if (category === 'popular') {
      params.set('sort', 'popular');
    } else if (category !== 'all') {
      params.set('category', category);
    }
    const res = await fetch(`/api/games?${params}`);
    const data = await res.json();
    setGames(category === 'popular' ? data.filter((g: Game) => g.popular) : data);
  };

  const filtered = search
    ? games.filter((g) => g.name.toLowerCase().includes(search.toLowerCase()))
    : games;

  const playGame = async (gameUrl: string) => {
    const engine = (localStorage.getItem('monoxide-proxy-engine') || 'ultraviolet') as ProxyEngine;
    try {
      const { registerServiceWorker } = await import('@/lib/proxy/register');
      await registerServiceWorker(engine);
      setProxyUrl(encodeUrl(gameUrl, engine));
    } catch {
      // Fallback: open directly
      setProxyUrl(encodeUrl(gameUrl, engine));
    }
  };

  if (proxyUrl) {
    return <ProxyFrame url={proxyUrl} onClose={() => setProxyUrl(null)} />;
  }

  return (
    <div>
      {/* Search bar */}
      <div style={{ position: 'relative', maxWidth: 400, marginBottom: '1.5rem' }}>
        <Search size={16} style={{
          position: 'absolute',
          left: 12,
          top: '50%',
          transform: 'translateY(-50%)',
          color: 'var(--text-muted)',
        }} />
        <input
          type="text"
          placeholder="Search games..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '100%', paddingLeft: 36 }}
        />
      </div>

      {/* Category tabs */}
      <div style={{
        display: 'flex',
        gap: '0.25rem',
        marginBottom: '1.5rem',
        overflowX: 'auto',
        paddingBottom: '0.5rem',
      }}>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              fontSize: '0.8rem',
              fontWeight: category === cat ? 600 : 400,
              background: category === cat ? 'var(--accent)' : 'var(--bg-tertiary)',
              color: category === cat ? '#000' : 'var(--text-secondary)',
              textTransform: 'capitalize',
              whiteSpace: 'nowrap',
            }}
          >
            {cat === 'all' ? 'All' : cat === 'popular' ? 'Popular' : cat}
          </button>
        ))}
      </div>

      {/* Games grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: '1rem',
      }}>
        {filtered.map((game) => (
          <GameCard
            key={game.id}
            name={game.name}
            image={game.image}
            category={game.category}
            onClick={() => playGame(game.url)}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '3rem' }}>
          No games found
        </p>
      )}
    </div>
  );
}
