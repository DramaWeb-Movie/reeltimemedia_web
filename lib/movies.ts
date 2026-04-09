/**
 * Server-side movie data from Supabase. Use from API routes or Server Components.
 */
import { unstable_cache } from 'next/cache';
import { createAnonClient, createClient } from '@/lib/supabase/server';
import type { Drama, ContentType } from '@/types';

export interface MovieRow {
  id: string;
  title: string;
  title_kh: string | null;
  description: string | null;
  genre: string | null;
  release_date: string | null;
  duration: number | null;
  thumbnail_url: string | null;
  video_url: string | null;
  hls_manifest_url?: string | null;
  subtitle_url: string | null;
  status: string | null;
  type: string | null;
  price: number | null;
  free_episodes_count: number | null;
  subscription_plan_id: string | null;
  total_episodes: number | null;
  cast: string | null;
  director: string | null;
  producer: string | null;
  language: string | null;
  content_rating: string | null;
  tags: string | null;
  trailer_url: string | null;
  created_at: string | null;
  updated_at: string | null;
}

/** Card shape used by Movies/Series/Browse grids and home sections */
export interface MovieCard {
  id: string;
  title: string;
  titleKh?: string;
  episodes: number;
  image: string;
  contentType: ContentType;
  rating?: number;
  description?: string;
  genres?: string[];
  year?: string;
  /** One-time price for movies (USD) */
  price?: number;
  /** Number of free episodes (series) or 1 if movie is fully free */
  freeEpisodesCount?: number;
}

/** Featured item for home hero carousel */
export interface FeaturedMovie extends MovieCard {
  description: string;
  genres: string[];
  year: string;
}

const PLACEHOLDER_IMAGE = 'https://placehold.co/400x600/1a1a1a/808080?text=No+Image';

/** Use DB content_rating only when it is a numeric score (not e.g. PG-13). */
export function parseNumericRating(contentRating: string | null | undefined): number | undefined {
  if (!contentRating?.trim()) return undefined;
  const n = parseFloat(contentRating.trim());
  if (!Number.isFinite(n)) return undefined;
  if (n < 0 || n > 10) return undefined;
  return n;
}

/** Row shape returned by the series_episodes table */
interface SeriesEpisodeRow {
  id: string;
  episode_number: number;
  title: string;
  duration: number;
  video_url: string;
  hls_manifest_url?: string | null;
}

// Columns needed for card rendering — avoids fetching unused heavy fields
const CARD_COLUMNS =
  'id, title, title_kh, description, genre, release_date, thumbnail_url, type, price, free_episodes_count, total_episodes';

// Columns needed for the full detail / watch page (omit DB columns that may not exist in every project, e.g. content_rating)
const DETAIL_COLUMNS =
  'id, title, title_kh, description, genre, release_date, duration, thumbnail_url, video_url, hls_manifest_url, status, type, price, free_episodes_count, subscription_plan_id, total_episodes, cast, trailer_url';

function rowToCard(row: MovieRow): MovieCard {
  const contentType: ContentType = row.type === 'series' ? 'series' : 'movie';
  const episodes =
    contentType === 'series'
      ? Math.max(1, row.total_episodes ?? 1)
      : 1;
  const image =
    row.thumbnail_url?.trim() || PLACEHOLDER_IMAGE;
  const year = row.release_date
    ? new Date(row.release_date).getFullYear().toString()
    : undefined;
  const genres = row.genre
    ? row.genre.split(',').map((g) => g.trim()).filter(Boolean)
    : undefined;
  const rating = parseNumericRating(row.content_rating);
  return {
    id: row.id,
    title: row.title,
    titleKh: row.title_kh?.trim() || undefined,
    episodes,
    image,
    contentType,
    description: row.description ?? undefined,
    genres,
    year,
    ...(rating != null && { rating }),
    ...(contentType === 'movie' && row.price != null && { price: Number(row.price) }),
    freeEpisodesCount: row.free_episodes_count != null ? Number(row.free_episodes_count) : undefined,
  };
}

function rowToFeatured(row: MovieRow): FeaturedMovie {
  const card = rowToCard(row);
  return {
    ...card,
    description: row.description ?? '',
    genres: row.genre
      ? row.genre.split(',').map((g) => g.trim()).filter(Boolean)
      : [],
    year: row.release_date
      ? new Date(row.release_date).getFullYear().toString()
      : new Date().getFullYear().toString(),
  };
}

function parseCast(castText: string | null): Drama['cast'] {
  if (!castText?.trim()) return [];
  return castText
    .split(',')
    .map((name, i) => ({
      id: `c${i + 1}`,
      name: name.trim(),
      role: '',
    }))
    .filter((c) => c.name);
}

/** Fetch all published movies/series from Supabase (for listing and browse). Cached 60s. */
export async function getMovies(options?: {
  type?: 'single' | 'series';
  status?: string;
}): Promise<MovieCard[]> {
  const status = options?.status ?? 'published';
  const type = options?.type ?? 'all';
  return unstable_cache(
    async () => {
      const supabase = createAnonClient();
      let query = supabase
        .from('movies')
        .select(CARD_COLUMNS)
        .order('created_at', { ascending: false })
        .eq('status', status);
      if (type !== 'all') {
        query = query.eq('type', type);
      }
      const { data, error } = await query;
      if (error) {
        console.error('getMovies error:', error);
        return [];
      }
      return (data as MovieRow[]).map(rowToCard);
    },
    ['movies', type, status],
    { revalidate: 60 }
  )();
}

export async function getMoviesPage(options: {
  type?: 'single' | 'series';
  status?: string;
  page: number;
  pageSize: number;
}): Promise<{ items: MovieCard[]; total: number }> {
  const status = options.status ?? 'published';
  const type = options.type ?? 'all';
  const pageSize = Math.max(1, Math.min(100, Math.floor(options.pageSize)));
  const page = Math.max(1, Math.floor(options.page));

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  return unstable_cache(
    async () => {
      const supabase = createAnonClient();
      let query = supabase
        .from('movies')
        // `planned` count is much cheaper than exact on large datasets.
        .select(CARD_COLUMNS, { count: 'planned' })
        .order('created_at', { ascending: false })
        .eq('status', status);
      if (type !== 'all') {
        query = query.eq('type', type);
      }

      const { data, error, count } = await query.range(from, to);

      if (error) {
        console.error('getMoviesPage error:', error);
        return { items: [], total: 0 };
      }

      return {
        items: (data as MovieRow[]).map(rowToCard),
        total: count ?? 0,
      };
    },
    ['movies-page', type, status, String(page), String(pageSize)],
    { revalidate: 60 }
  )();
}

/**
 * Fetch a single movie by id for the detail/watch page.
 * Uses the cookie-aware client so RLS policies work correctly for all users.
 * The subscription_plans and series_episodes fetches run in parallel.
 * Use React's cache() at the callsite for per-request deduplication.
 */
export async function getMovieById(id: string): Promise<Drama | null> {
    const supabase = await createClient();
    const { data: row, error } = await supabase
      .from('movies')
      .select(DETAIL_COLUMNS)
      .eq('id', id)
      .eq('status', 'published')
      .single();

    if (error || !row) {
      const code = (error as unknown as Record<string, unknown> | null)?.code;
      const hasRealError = code && code !== 'PGRST116';
      if (hasRealError) console.error('getMovieById error:', error);
      return null;
    }

    const r = row as MovieRow;
    const contentType: ContentType = r.type === 'series' ? 'series' : 'movie';
    const totalEpisodes =
      contentType === 'series' ? Math.max(1, r.total_episodes ?? 1) : 1;
    const posterUrl = r.thumbnail_url?.trim() || PLACEHOLDER_IMAGE;

    // Fetch subscription plan price and series episodes in parallel
    const [planResult, seriesEpisodesResult] = await Promise.all([
      r.subscription_plan_id
        ? supabase
            .from('subscription_plans')
            .select('price')
            .eq('id', r.subscription_plan_id)
            .single()
        : Promise.resolve({ data: null, error: null }),
      contentType === 'series'
        ? supabase
            .from('series_episodes')
            .select('id, episode_number, title, duration, video_url, hls_manifest_url')
            .eq('movie_id', r.id)
            .order('episode_number', { ascending: true })
        : Promise.resolve({ data: null, error: null }),
    ]);

    const monthlyPrice =
      planResult.data && 'price' in planResult.data && planResult.data.price != null
        ? Number(planResult.data.price)
        : undefined;

    const seriesEpisodes = (seriesEpisodesResult.data as SeriesEpisodeRow[] | null) ?? [];
    const seriesEpisodeByNumber = new Map<number, SeriesEpisodeRow>(
      seriesEpisodes.map((episode) => [episode.episode_number, episode])
    );

    const baseEpisode = {
      dramaId: r.id,
      duration: r.duration ?? 0,
      releaseDate: r.release_date ?? '',
      thumbnailUrl: r.thumbnail_url ?? undefined,
    };

    let episodes: Drama['episodes'];

    if (contentType === 'movie') {
      episodes = r.video_url || r.hls_manifest_url
        ? [{
            id: `${r.id}-1`,
            ...baseEpisode,
            episodeNumber: 1,
            title: r.title,
            videoUrl: r.video_url ?? '',
            ...(r.hls_manifest_url ? { hlsManifestUrl: r.hls_manifest_url } : {}),
          }]
        : [];
    } else {
      episodes = Array.from({ length: totalEpisodes }, (_, i) => {
        const epNum = i + 1;
        const dbEp = seriesEpisodeByNumber.get(epNum);
        return {
          id: dbEp?.id ?? `${r.id}-${epNum}`,
          dramaId: r.id,
          episodeNumber: epNum,
          title: dbEp?.title ?? `Episode ${epNum}`,
          duration: dbEp?.duration ?? r.duration ?? 0,
          releaseDate: r.release_date ?? '',
          thumbnailUrl: r.thumbnail_url ?? undefined,
          videoUrl: dbEp?.video_url?.trim() ?? '',
          ...(dbEp?.hls_manifest_url ? { hlsManifestUrl: dbEp.hls_manifest_url } : {}),
        };
      });
    }

    const rating = parseNumericRating(r.content_rating);
    const drama: Drama = {
      id: r.id,
      title: r.title,
      titleKh: r.title_kh?.trim() || undefined,
      description: r.description ?? '',
      posterUrl,
      bannerUrl: r.thumbnail_url?.trim() || posterUrl,
      releaseYear: r.release_date
        ? new Date(r.release_date).getFullYear()
        : new Date().getFullYear(),
      ...(rating != null && { rating }),
      genres: r.genre ? r.genre.split(',').map((g) => g.trim()).filter(Boolean) : [],
      episodes,
      cast: parseCast(r.cast),
      status: (r.status === 'published' ? 'completed' : 'ongoing') as 'ongoing' | 'completed',
      totalEpisodes,
      contentType,
      price: r.price != null ? Number(r.price) : undefined,
      rentPrice: undefined,
      monthlyPrice,
      freeEpisodesCount: r.free_episodes_count != null ? Number(r.free_episodes_count) : 0,
      trailerUrl: r.trailer_url?.trim() || undefined,
    };
    return drama;
}

/** Fetch featured items for home hero (published, any type, limit 10). Cached 60s. */
export async function getFeaturedMovies(limit = 10): Promise<FeaturedMovie[]> {
  return unstable_cache(
    async () => {
      const supabase = createAnonClient();
      const { data, error } = await supabase
        .from('movies')
        .select(CARD_COLUMNS)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('getFeaturedMovies error:', error);
        return [];
      }
      return (data as MovieRow[]).map(rowToFeatured);
    },
    ['featured-movies', String(limit)],
    { revalidate: 60 }
  )();
}

/**
 * Fetch recommendations for the watch page.
 * Filters by content type and genre overlap directly in the DB query —
 * avoids loading the full catalogue just to filter client-side.
 * Cached per (excludeId + contentType + genres) for 5 minutes.
 */
export async function getRecommendedMovies(
  excludeId: string,
  contentType: ContentType,
  genres: string[],
  limit = 5
): Promise<MovieCard[]> {
  const dbType = contentType === 'series' ? 'series' : 'single';
  const genreKey = [...genres].sort().join(',');

  return unstable_cache(
    async () => {
      const supabase = createAnonClient();

      let query = supabase
        .from('movies')
        .select(CARD_COLUMNS)
        .eq('status', 'published')
        .eq('type', dbType)
        .neq('id', excludeId)
        .order('created_at', { ascending: false })
        .limit(limit);

      // Filter by genre overlap in the DB so we only fetch relevant rows
      if (genres.length > 0) {
        const genreFilters = genres.map((g) => `genre.ilike.%${g}%`).join(',');
        query = query.or(genreFilters);
      }

      const { data, error } = await query;

      // Fallback: if no genre matches, return any recent titles of the same type
      if (error || !data?.length) {
        const { data: fallback } = await supabase
          .from('movies')
          .select(CARD_COLUMNS)
          .eq('status', 'published')
          .eq('type', dbType)
          .neq('id', excludeId)
          .order('created_at', { ascending: false })
          .limit(limit);
        return ((fallback ?? []) as MovieRow[]).map(rowToCard);
      }

      return (data as MovieRow[]).map(rowToCard);
    },
    ['recommendations', excludeId, contentType, genreKey, String(limit)],
    { revalidate: 300 }
  )();
}

/**
 * Server-only: check whether the current user has purchased a specific piece of content.
 * Use this on individual detail/watch pages instead of loading the full purchase list.
 */
export async function hasPurchasedContent(
  contentId: string,
  contentType: 'movie' | 'subscription' = 'movie'
): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from('purchases')
    .select('id')
    .eq('user_id', user.id)
    .eq('content_id', contentId)
    .eq('content_type', contentType)
    .maybeSingle();
  return !!data;
}

/** Server-only: get current user's purchased movie IDs (for Watch vs Buy). Not cached. */
export async function getPurchasedMovieIdsForCurrentUser(): Promise<Set<string>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Set();
  const { data: rows } = await supabase
    .from('purchases')
    .select('content_id')
    .eq('user_id', user.id)
    .eq('content_type', 'movie');
  return new Set((rows || []).map((r: { content_id: string }) => r.content_id));
}
