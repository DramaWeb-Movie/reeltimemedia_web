import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseNumericRating } from '@/lib/movies';
import type { Drama } from '@/types';

const PLACEHOLDER = 'https://placehold.co/400x600/f3f4f6/9ca3af?text=No+Image';

type MovieRow = {
  id: string;
  title: string;
  title_kh?: string | null;
  thumbnail_url: string | null;
  thumnail_url?: string | null;
  cover_url?: string | null;
  release_date: string | null;
  genre: string | null;
  country: string | null;
  content_rating?: string | null;
};

/**
 * GET /api/profile/library
 * Returns the current user's purchased movies (library) using server Supabase
 * so RLS and session are correct. Used by the profile page to avoid client-side
 * movies table access issues.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: purchaseRows, error: purchasesError } = await supabase
    .from('purchases')
    .select('content_id, purchased_at')
    .eq('user_id', user.id)
    .eq('content_type', 'movie')
    .order('purchased_at', { ascending: false });

  if (purchasesError) {
    console.error('Profile library: failed to load purchases', purchasesError);
    return NextResponse.json({ library: [] });
  }

  if (!purchaseRows?.length) {
    return NextResponse.json({ library: [] });
  }

  const contentIds = purchaseRows
    .map((r: { content_id: string }) => r.content_id)
    .filter(Boolean);
  if (contentIds.length === 0) {
    return NextResponse.json({ library: [] });
  }

  const { data: movieRows, error: moviesError } = await (async () => {
    const preferred = await supabase
      .from('movies')
      .select('id, title, title_kh, thumbnail_url, thumnail_url, cover_url, release_date, genre, country')
      .in('id', contentIds)
      .eq('status', 'published');
    if (!preferred.error) return preferred;

    const legacy = await supabase
      .from('movies')
      .select('id, title, title_kh, thumbnail_url, release_date, genre, country')
      .in('id', contentIds)
      .eq('status', 'published');
    if (!legacy.error) return legacy;

    return supabase
      .from('movies')
      .select('id, title, title_kh, thumnail_url, cover_url, release_date, genre, country')
      .in('id', contentIds)
      .eq('status', 'published');
  })();

  let rows: MovieRow[] = movieRows ?? [];
  if (moviesError) {
    const { data: fallback } = await supabase
      .from('movies')
      .select('id, title, title_kh, thumbnail_url, thumnail_url, cover_url')
      .in('id', contentIds);
    rows = (fallback ?? []).map(
      (r: {
        id: string;
        title: string;
        title_kh?: string | null;
        thumbnail_url: string | null;
        thumnail_url?: string | null;
        cover_url?: string | null;
      }) => ({
        ...r,
        release_date: null,
        genre: null,
        country: null,
      })
    );
  }

  const byId = new Map<string, MovieRow>();
  rows.forEach((row) => byId.set(row.id, row));

  const library: Drama[] = [];
  for (const id of contentIds) {
    const row = byId.get(id);
    if (!row) continue;
    const rating = parseNumericRating(row.content_rating);
    library.push({
      id: row.id,
      title: row.title,
      titleKh: row.title_kh?.trim() || undefined,
      description: '',
      posterUrl: row.cover_url?.trim() || row.thumbnail_url?.trim() || row.thumnail_url?.trim() || PLACEHOLDER,
      releaseYear: row.release_date
        ? new Date(row.release_date).getFullYear()
        : new Date().getFullYear(),
      ...(rating != null && { rating }),
      genres: row.genre
        ? row.genre.split(',').map((g: string) => g.trim()).filter(Boolean)
        : [],
      episodes: [],
      cast: [],
      status: 'completed',
      totalEpisodes: 1,
      contentType: 'movie',
    });
  }

  return NextResponse.json({ library });
}
