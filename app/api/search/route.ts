import { NextRequest, NextResponse } from 'next/server';
import { createAnonClient } from '@/lib/supabase/server';
import type { MovieCard } from '@/lib/movies';
import { enforceRateLimit } from '@/lib/api/rateLimit';

const CARD_COLUMNS_PREFERRED =
  'id, title, title_kh, description, genre, release_date, thumbnail_url, thumnail_url, cover_url, type, price, free_episodes_count, total_episodes';
const CARD_COLUMNS_LEGACY =
  'id, title, title_kh, description, genre, release_date, thumbnail_url, type, price, free_episodes_count, total_episodes';
const CARD_COLUMNS_TYPO =
  'id, title, title_kh, description, genre, release_date, thumnail_url, cover_url, type, price, free_episodes_count, total_episodes';

const PLACEHOLDER_IMAGE = 'https://placehold.co/400x600/1a1a1a/808080?text=No+Image';

function normalizeSearchQuery(input: string): string {
  return input
    .normalize('NFKC')
    .replace(/[%_*()[\]{}<>"'`;$\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeForILike(value: string): string {
  return value.replace(/[%_]/g, (m) => `\\${m}`);
}

export async function GET(request: NextRequest) {
  const blocked = await enforceRateLimit(
    request,
    {
    namespace: 'api:search',
    max: 40,
    windowMs: 60 * 1000,
    blockMs: 5 * 60 * 1000,
    },
    { type: 'json', body: { error: 'Too many requests' } }
  );
  if (blocked) return blocked;

  const { searchParams } = request.nextUrl;
  const qRaw = searchParams.get('q')?.trim() ?? '';
  const q = normalizeSearchQuery(qRaw);
  const limit = Math.min(Number(searchParams.get('limit') ?? 20), 50);

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const supabase = createAnonClient();

  // Prefer PostgreSQL full-text search if the DB has an FTS expression/index.
  // Fallback to escaped ILIKE for compatibility with current schema.
  const { data, error } = await (async () => {
    const runSearch = async (columns: string) => {
      const fts = await supabase
        .from('movies')
        .select(columns)
        .eq('status', 'published')
        .textSearch('search_vector', q, { type: 'websearch', config: 'simple' })
        .order('created_at', { ascending: false })
        .limit(limit);
      if (!fts.error) return fts;

      const likeQ = escapeForILike(q);
      return supabase
        .from('movies')
        .select(columns)
        .eq('status', 'published')
        .or(`title.ilike.%${likeQ}%,title_kh.ilike.%${likeQ}%,description.ilike.%${likeQ}%,genre.ilike.%${likeQ}%`)
        .order('created_at', { ascending: false })
        .limit(limit);
    };

    const preferred = await runSearch(CARD_COLUMNS_PREFERRED);
    if (!preferred.error) return preferred;

    const legacy = await runSearch(CARD_COLUMNS_LEGACY);
    if (!legacy.error) return legacy;

    return runSearch(CARD_COLUMNS_TYPO);
  })();

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
      image:
        (row.cover_url as string | null)?.trim()
        || (row.thumbnail_url as string | null)?.trim()
        || (row.thumnail_url as string | null)?.trim()
        || PLACEHOLDER_IMAGE,
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
