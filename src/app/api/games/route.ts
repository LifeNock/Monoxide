import { NextRequest, NextResponse } from 'next/server';
import games from '@/data/games.json';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const category = searchParams.get('category');
  const search = searchParams.get('search');
  const sort = searchParams.get('sort');

  let filtered = [...games];

  if (category && category !== 'all') {
    filtered = filtered.filter((g) => g.category === category);
  }

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter((g) =>
      g.name.toLowerCase().includes(q) || g.category.toLowerCase().includes(q)
    );
  }

  if (sort === 'az') {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sort === 'popular') {
    filtered.sort((a, b) => (b.popular ? 1 : 0) - (a.popular ? 1 : 0));
  }

  return NextResponse.json(filtered);
}
