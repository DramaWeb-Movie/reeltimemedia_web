import { isFreeMovie } from '@/lib/catalog/pricing';
import { unstable_cache } from 'next/cache';
import { getAuthenticatedUserId } from '@/lib/supabase/authUser';
import { createAnonClient, createClient } from '@/lib/supabase/server';

export type PlaybackGrant =
  | { ok: true; sub: string; videoUrl: string | null; hlsManifestUrl: string | null }
  | { ok: false; status: number; message: string };

type PlaybackMovieRow = {
  id: string;
  type: string | null;
  price: number | null;
  free_episodes_count: number | null;
  total_episodes: number | null;
  video_url: string | null;
  hls_manifest_url: string | null;
  encoding_status: string | null;
};

type PlaybackEpisodeRow = {
  episode_number: number;
  video_url: string | null;
  hls_manifest_url: string | null;
  encoding_status: string | null;
};

type PlaybackSource = {
  contentType: 'movie' | 'series';
  price: number | null;
  freeEpisodesCount: number;
  videoUrl: string | null;
  hlsManifestUrl: string | null;
  encodingStatus: string | null;
};

const MOVIE_PLAYBACK_COLUMNS =
  'id, type, price, free_episodes_count, total_episodes, video_url, hls_manifest_url, encoding_status';
const EPISODE_PLAYBACK_COLUMNS =
  'episode_number, video_url, hls_manifest_url, encoding_status';

function normalizeUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function isEncodingPending(status: string | null | undefined): boolean {
  return status === 'pending' || status === 'processing';
}

async function getPlaybackSourceUncached(
  contentId: string,
  ep: number
): Promise<PlaybackSource | null> {
  const supabase = createAnonClient();
  const { data: movieRow, error: movieError } = await supabase
    .from('movies')
    .select(MOVIE_PLAYBACK_COLUMNS)
    .eq('id', contentId)
    .eq('status', 'published')
    .single();

  if (movieError || !movieRow) {
    return null;
  }

  const movie = movieRow as PlaybackMovieRow;
  const contentType = movie.type === 'series' ? 'series' : 'movie';

  if (contentType === 'movie') {
    return {
      contentType,
      price: movie.price != null ? Number(movie.price) : null,
      freeEpisodesCount: 0,
      videoUrl: normalizeUrl(movie.video_url),
      hlsManifestUrl: normalizeUrl(movie.hls_manifest_url),
      encodingStatus: movie.encoding_status,
    };
  }

  const requestedEpisode = Math.max(1, Math.floor(ep) || 1);
  const { data: episodeRows, error: episodeError } = await supabase
    .from('series_episodes')
    .select(EPISODE_PLAYBACK_COLUMNS)
    .eq('movie_id', contentId)
    .in('episode_number', requestedEpisode === 1 ? [1] : [requestedEpisode, 1]);

  if (episodeError || !episodeRows?.length) {
    return {
      contentType,
      price: null,
      freeEpisodesCount: Math.max(0, Number(movie.free_episodes_count ?? 0)),
      videoUrl: null,
      hlsManifestUrl: null,
      encodingStatus: null,
    };
  }

  const episodes = episodeRows as PlaybackEpisodeRow[];
  const episode =
    episodes.find((item) => item.episode_number === requestedEpisode)
    ?? episodes.find((item) => item.episode_number === 1)
    ?? episodes[0];

  return {
    contentType,
    price: null,
    freeEpisodesCount: Math.max(0, Number(movie.free_episodes_count ?? 0)),
    videoUrl: normalizeUrl(episode.video_url),
    hlsManifestUrl: normalizeUrl(episode.hls_manifest_url),
    encodingStatus: episode.encoding_status,
  };
}

const getPlaybackSourceCached = unstable_cache(
  async (contentId: string, ep: number) => getPlaybackSourceUncached(contentId, ep),
  ['playback-source'],
  { revalidate: 15 }
);

async function getPlaybackSource(contentId: string, ep: number): Promise<PlaybackSource | null> {
  return getPlaybackSourceCached(contentId, ep);
}

/**
 * Same rules as stream: free movie / free episode → sub "anon"; else purchase or subscription.
 * Returns the resolved media URLs so the watch session route can cache them once per token.
 */
export async function grantPlaybackAccess(contentId: string, ep: number): Promise<PlaybackGrant> {
  const source = await getPlaybackSource(contentId, ep);
  if (!source) {
    return { ok: false, status: 404, message: 'Not found' };
  }

  const contentType = source.contentType;
  const movieIsFree = isFreeMovie(contentType, source.price);
  const freeEpisodesCount = source.freeEpisodesCount;
  const isFreeEpisode = contentType === 'series' && freeEpisodesCount > 0 && ep <= freeEpisodesCount;
  const hlsManifestUrl = source.hlsManifestUrl;
  const videoUrl = source.videoUrl;

  if (!videoUrl && !hlsManifestUrl) {
    if (isEncodingPending(source.encodingStatus)) {
      return { ok: false, status: 409, message: 'Video is still processing' };
    }
    return { ok: false, status: 404, message: 'Video not available' };
  }

  if ((contentType === 'movie' && movieIsFree) || (contentType === 'series' && isFreeEpisode)) {
    return { ok: true, sub: 'anon', videoUrl, hlsManifestUrl };
  }

  const supabase = await createClient();
  const userId = await getAuthenticatedUserId(supabase);

  if (!userId) {
    return { ok: false, status: 401, message: 'Unauthorized' };
  }

  if (contentType === 'series') {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();
    if (!sub) {
      return { ok: false, status: 403, message: 'Subscription required' };
    }
    return { ok: true, sub: userId, videoUrl, hlsManifestUrl };
  }

  const { data: purchase } = await supabase
    .from('purchases')
    .select('id')
    .eq('user_id', userId)
    .eq('content_id', contentId)
    .eq('content_type', 'movie')
    .maybeSingle();
  if (!purchase) {
    return { ok: false, status: 403, message: 'Purchase required' };
  }
  return { ok: true, sub: userId, videoUrl, hlsManifestUrl };
}

export async function getVideoUrlForPlayback(contentId: string, ep: number): Promise<string | null> {
  const source = await getPlaybackSource(contentId, ep);
  return source?.videoUrl ?? null;
}

export async function getHlsManifestUrlForPlayback(
  contentId: string,
  ep: number
): Promise<string | null> {
  const source = await getPlaybackSource(contentId, ep);
  return source?.hlsManifestUrl ?? null;
}
