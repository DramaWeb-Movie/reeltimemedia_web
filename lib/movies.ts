/**
 * Server-side movie data from Supabase. Use from API routes or Server Components.
 */
import { unstable_cache } from 'next/cache';
import {
  escapeForILike,
  getCatalogReleaseYear,
  normalizeCatalogQuery,
  resolveCatalogContentType,
  resolveCatalogEpisodes,
  resolveCatalogImage,
  splitCatalogGenres,
} from '@/lib/catalog/shared';
import { getAuthenticatedUserId } from '@/lib/supabase/authUser';
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
  thumnail_url?: string | null;
  cover_url?: string | null;
  is_promotion_hero?: boolean | null;
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
  /** Preferred background image for hero-style sections */
  bannerImage?: string;
}

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

// Preferred schema includes both legacy and newer image columns.
const CARD_COLUMNS_PREFERRED =
  'id, title, title_kh, description, genre, release_date, thumbnail_url, thumnail_url, cover_url, type, price, free_episodes_count, total_episodes';
const CARD_COLUMNS_LEGACY =
  'id, title, title_kh, description, genre, release_date, thumbnail_url, type, price, free_episodes_count, total_episodes';
const CARD_COLUMNS_TYPO =
  'id, title, title_kh, description, genre, release_date, thumnail_url, cover_url, type, price, free_episodes_count, total_episodes';

// Columns needed for the full detail / watch page.
const DETAIL_COLUMNS_PREFERRED =
  'id, title, title_kh, description, genre, release_date, duration, thumbnail_url, thumnail_url, cover_url, video_url, hls_manifest_url, status, type, price, free_episodes_count, subscription_plan_id, total_episodes, cast, trailer_url';
const DETAIL_COLUMNS_LEGACY =
  'id, title, title_kh, description, genre, release_date, duration, thumbnail_url, video_url, hls_manifest_url, status, type, price, free_episodes_count, subscription_plan_id, total_episodes, cast, trailer_url';
const DETAIL_COLUMNS_TYPO =
  'id, title, title_kh, description, genre, release_date, duration, thumnail_url, cover_url, video_url, hls_manifest_url, status, type, price, free_episodes_count, subscription_plan_id, total_episodes, cast, trailer_url';

export type BrowseAccessFilter = 'all' | 'free' | 'paid';
export type BrowseTypeFilter = 'all' | 'movie' | 'series';

export type BrowseFilters = {
  q?: string;
  access?: BrowseAccessFilter;
  type?: BrowseTypeFilter;
  genre?: string;
};

function wrapLogicalGroup(content: string): string {
  return content.includes(',') ? `or(${content})` : content;
}

function buildBrowseAccessExpression(
  type: BrowseTypeFilter,
  access: BrowseAccessFilter
): { root: string; nested: string } | null {
  if (access === 'all') return null;

  if (type === 'movie') {
    if (access === 'free') {
      const root = 'price.is.null,price.lte.0';
      return { root, nested: `or(${root})` };
    }
    return { root: 'price.gt.0', nested: 'price.gt.0' };
  }

  if (type === 'series') {
    if (access === 'free') {
      return { root: 'free_episodes_count.gt.0', nested: 'free_episodes_count.gt.0' };
    }
    const root = 'free_episodes_count.is.null,free_episodes_count.lte.0';
    return { root, nested: `or(${root})` };
  }

  if (access === 'free') {
    const root =
      'and(type.eq.single,or(price.is.null,price.lte.0)),and(type.eq.series,free_episodes_count.gt.0)';
    return { root, nested: `or(${root})` };
  }

  const root =
    'and(type.eq.single,price.gt.0),and(type.eq.series,or(free_episodes_count.is.null,free_episodes_count.lte.0))';
  return { root, nested: `or(${root})` };
}

function rowToCard(row: MovieRow): MovieCard {
  const contentType: ContentType = resolveCatalogContentType(row);
  const episodes = resolveCatalogEpisodes(row);
  const image = resolveCatalogImage(row);
  const year = getCatalogReleaseYear(row);
  const genres = splitCatalogGenres(row);
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

function getPosterUrl(row: MovieRow): string {
  return resolveCatalogImage(row);
}

function getCoverUrl(row: MovieRow): string | undefined {
  return row.thumbnail_url?.trim() || row.thumnail_url?.trim() || row.cover_url?.trim() || undefined;
}

async function selectMoviesWithFallback<T>(
  builder: (columns: string) => unknown,
  columns: { preferred: string; legacy: string; typo: string }
): Promise<{ data: T[] | null; error: unknown; count?: number | null }> {
  const preferred = await builder(columns.preferred) as { data: T[] | null; error: unknown; count?: number | null };
  if (!preferred.error) return preferred;

  const legacy = await builder(columns.legacy) as { data: T[] | null; error: unknown; count?: number | null };
  if (!legacy.error) return legacy;

  return await builder(columns.typo) as { data: T[] | null; error: unknown; count?: number | null };
}

function rowToFeatured(row: MovieRow): FeaturedMovie {
  const card = rowToCard(row);
  const bannerImage = getCoverUrl(row) || card.image;
  return {
    ...card,
    description: row.description ?? '',
    genres: row.genre
      ? row.genre.split(',').map((g) => g.trim()).filter(Boolean)
      : [],
    year: row.release_date
      ? new Date(row.release_date).getFullYear().toString()
      : new Date().getFullYear().toString(),
    bannerImage,
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
      const { data, error } = await selectMoviesWithFallback<MovieRow>(
        (columns) => {
          let query = supabase
            .from('movies')
            .select(columns)
            .order('created_at', { ascending: false })
            .eq('status', status);
          if (type !== 'all') {
            query = query.eq('type', type);
          }
          return query;
        },
        { preferred: CARD_COLUMNS_PREFERRED, legacy: CARD_COLUMNS_LEGACY, typo: CARD_COLUMNS_TYPO }
      );
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
      const { data, error, count } = await selectMoviesWithFallback<MovieRow>(
        (columns) => {
          let query = supabase
            .from('movies')
            // `planned` count is much cheaper than exact on large datasets.
            .select(columns, { count: 'planned' })
            .order('created_at', { ascending: false })
            .eq('status', status);
          if (type !== 'all') {
            query = query.eq('type', type);
          }
          return query.range(from, to);
        },
        { preferred: CARD_COLUMNS_PREFERRED, legacy: CARD_COLUMNS_LEGACY, typo: CARD_COLUMNS_TYPO }
      );

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

export async function getBrowseGenres(): Promise<string[]> {
  return unstable_cache(
    async () => {
      const supabase = createAnonClient();
      const { data, error } = await supabase
        .from('movies')
        .select('genre')
        .eq('status', 'published');

      if (error) {
        console.error('getBrowseGenres error:', error);
        return [];
      }

      const genres = new Set<string>();
      for (const row of data ?? []) {
        const genreValue = typeof row.genre === 'string' ? row.genre : '';
        genreValue
          .split(',')
          .map((genre) => genre.trim())
          .filter(Boolean)
          .forEach((genre) => genres.add(genre));
      }

      return Array.from(genres).sort((a, b) => a.localeCompare(b));
    },
    ['browse-genres'],
    { revalidate: 300 }
  )();
}

export async function getBrowseMoviesPage(options: BrowseFilters & {
  page: number;
  pageSize: number;
}): Promise<{ items: MovieCard[]; total: number }> {
  const pageSize = Math.max(1, Math.min(100, Math.floor(options.pageSize)));
  const page = Math.max(1, Math.floor(options.page));
  const q = normalizeCatalogQuery(options.q ?? '');
  const access = options.access ?? 'all';
  const type = options.type ?? 'all';
  const genre = (options.genre ?? '').trim();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  return unstable_cache(
    async () => {
      const supabase = createAnonClient();
      const { data, error, count } = await selectMoviesWithFallback<MovieRow>(
        (columns) => {
          let query = supabase
            .from('movies')
            .select(columns, { count: 'planned' })
            .eq('status', 'published')
            .order('created_at', { ascending: false });

          if (type === 'movie') {
            query = query.eq('type', 'single');
          } else if (type === 'series') {
            query = query.eq('type', 'series');
          }

          if (genre) {
            query = query.ilike('genre', `%${escapeForILike(genre)}%`);
          }

          const accessExpr = buildBrowseAccessExpression(type, access);
          if (q) {
            const likeQ = escapeForILike(q);
            if (accessExpr) {
              query = query.or(
                [
                  `and(title.ilike.%${likeQ}%,${wrapLogicalGroup(accessExpr.root)})`,
                  `and(title_kh.ilike.%${likeQ}%,${wrapLogicalGroup(accessExpr.root)})`,
                ].join(',')
              );
            } else {
              query = query.or(`title.ilike.%${likeQ}%,title_kh.ilike.%${likeQ}%`);
            }
          } else if (accessExpr) {
            query = query.or(accessExpr.root);
          }
          return query.range(from, to);
        },
        { preferred: CARD_COLUMNS_PREFERRED, legacy: CARD_COLUMNS_LEGACY, typo: CARD_COLUMNS_TYPO }
      );

      if (error) {
        console.error('getBrowseMoviesPage error:', error);
        return { items: [], total: 0 };
      }

      return {
        items: (data as MovieRow[]).map(rowToCard),
        total: count ?? 0,
      };
    },
    [
      'browse-movies-page',
      String(page),
      String(pageSize),
      q || '_',
      access,
      type,
      genre || '_',
    ],
    { revalidate: 60 }
  )();
}

/**
 * Fetch a single movie by id for the detail/watch page.
 * Published content is public, so this uses the anon client and shared cache.
 * The subscription_plans and series_episodes fetches run in parallel.
 * Use React's cache() at the callsite for per-request deduplication.
 */
export async function getMovieById(id: string): Promise<Drama | null> {
  return unstable_cache(
    async () => {
      const supabase = createAnonClient();
      const { data: row, error } = await (async () => {
        const preferred = await supabase
          .from('movies')
          .select(DETAIL_COLUMNS_PREFERRED)
          .eq('id', id)
          .eq('status', 'published')
          .single();
        if (!preferred.error) return preferred;

        const legacy = await supabase
          .from('movies')
          .select(DETAIL_COLUMNS_LEGACY)
          .eq('id', id)
          .eq('status', 'published')
          .single();
        if (!legacy.error) return legacy;

        return supabase
          .from('movies')
          .select(DETAIL_COLUMNS_TYPO)
          .eq('id', id)
          .eq('status', 'published')
          .single();
      })();

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
      const posterUrl = getPosterUrl(r);
      const coverUrl = getCoverUrl(r);

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
        bannerUrl: coverUrl || posterUrl,
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
    },
    ['movie-detail', id],
    { revalidate: 60 }
  )();
}

/** Fetch featured items for home hero (published, any type, limit 10). Cached 60s. */
export async function getFeaturedMovies(limit = 10): Promise<FeaturedMovie[]> {
  return unstable_cache(
    async () => {
      const supabase = createAnonClient();
      const { data, error } = await selectMoviesWithFallback<MovieRow>(
        (columns) => supabase
          .from('movies')
          .select(columns)
          .eq('status', 'published')
          .order('created_at', { ascending: false })
          .limit(limit),
        { preferred: CARD_COLUMNS_PREFERRED, legacy: CARD_COLUMNS_LEGACY, typo: CARD_COLUMNS_TYPO }
      );

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

/** Fetch movies marked for promotion hero carousel. */
export async function getPromotionHeroMovies(limit = 10): Promise<FeaturedMovie[]> {
  return unstable_cache(
    async () => {
      const supabase = createAnonClient();
      const { data, error } = await selectMoviesWithFallback<MovieRow>(
        (columns) => supabase
          .from('movies')
          .select(columns)
          .eq('status', 'published')
          .eq('is_promotion_hero', true)
          .order('created_at', { ascending: false })
          .limit(limit),
        { preferred: CARD_COLUMNS_PREFERRED, legacy: CARD_COLUMNS_LEGACY, typo: CARD_COLUMNS_TYPO }
      );

      if (error) {
        console.error('getPromotionHeroMovies error:', error);
        return [];
      }
      return (data as MovieRow[]).map(rowToFeatured);
    },
    ['promotion-hero-movies', String(limit)],
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

      const { data, error } = await selectMoviesWithFallback<MovieRow>(
        (columns) => {
          let query = supabase
            .from('movies')
            .select(columns)
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
          return query;
        },
        { preferred: CARD_COLUMNS_PREFERRED, legacy: CARD_COLUMNS_LEGACY, typo: CARD_COLUMNS_TYPO }
      );

      // Fallback: if no genre matches, return any recent titles of the same type
      if (error || !data?.length) {
        const { data: fallback } = await selectMoviesWithFallback<MovieRow>(
          (columns) => supabase
            .from('movies')
            .select(columns)
            .eq('status', 'published')
            .eq('type', dbType)
            .neq('id', excludeId)
            .order('created_at', { ascending: false })
            .limit(limit),
          { preferred: CARD_COLUMNS_PREFERRED, legacy: CARD_COLUMNS_LEGACY, typo: CARD_COLUMNS_TYPO }
        );
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
  const userId = await getAuthenticatedUserId(supabase);
  if (!userId) return false;
  const { data } = await supabase
    .from('purchases')
    .select('id')
    .eq('user_id', userId)
    .eq('content_id', contentId)
    .eq('content_type', contentType)
    .maybeSingle();
  return !!data;
}

/** Server-only: get current user's purchased movie IDs (for Watch vs Buy). Not cached. */
export async function getPurchasedMovieIdsForCurrentUser(): Promise<Set<string>> {
  const supabase = await createClient();
  const userId = await getAuthenticatedUserId(supabase);
  if (!userId) return new Set();
  const { data: rows } = await supabase
    .from('purchases')
    .select('content_id')
    .eq('user_id', userId)
    .eq('content_type', 'movie');
  return new Set((rows || []).map((r: { content_id: string }) => r.content_id));
}
