import { NextRequest, NextResponse } from 'next/server';
import { createAnonClient } from '@/lib/supabase/server';
import type { MovieCard } from '@/lib/movies';

const CARD_COLUMNS =
  'id, title, title_kh, description, genre, release_date, thumbnail_url, type, price, free_episodes_count, total_episodes';

const PLACEHOLDER_IMAGE = 'https://placehold.co/400x600/1a1a1a/808080?text=No+Image';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const q = searchParams.get('q')?.trim();
  const limit = Math.min(Number(searchParams.get('limit') ?? 20), 50);

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const supabase = createAnonClient();

  const { data, error } = await supabase
    .from('movies')
    .select(CARD_COLUMNS)
    .eq('status', 'published')
    .or(`title.ilike.%${q}%,title_kh.ilike.%${q}%,description.ilike.%${q}%,genre.ilike.%${q}%`)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }

  const results: MovieCard[] = (data ?? []).map((row) => {
    const contentType = row.type === 'series' ? 'series' : 'movie';
    const episodes = contentType === 'series' ? Math.max(1, row.total_episodes ?? 1) : 1;
    const genres = row.genre
      ? (row.genre as string).split(',').map((g: string) => g.trim()).filter(Boolean)
      : undefined;
    return {
      id: row.id,
      title: row.title,
      titleKh: row.title_kh?.trim() || undefined,
      episodes,
      image: (row.thumbnail_url as string | null)?.trim() || PLACEHOLDER_IMAGE,
      contentType,
      description: row.description ?? undefined,
      genres,
      year: row.release_date
        ? new Date(row.release_date as string).getFullYear().toString()
        : undefined,
      ...(contentType === 'movie' && row.price != null && { price: Number(row.price) }),
      freeEpisodesCount:
        row.free_episodes_count != null ? Number(row.free_episodes_count) : undefined,
    };
  });

  return NextResponse.json({ results });
}
