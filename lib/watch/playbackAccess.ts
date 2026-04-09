import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUserId } from '@/lib/supabase/authUser';
import { getMovieById } from '@/lib/movies';
import type { Drama } from '@/types';

export type PlaybackGrant =
  | { ok: true; sub: string; videoUrl: string | null; hlsManifestUrl: string | null }
  | { ok: false; status: number; message: string };

function videoUrlForEpisode(drama: Drama, ep: number): string {
  const contentType = drama.contentType === 'series' ? 'series' : 'movie';
  const isSinglePart = contentType === 'movie' || drama.totalEpisodes <= 1;
  if (isSinglePart && drama.episodes[0]?.videoUrl) {
    return drama.episodes[0].videoUrl;
  }
  return drama.episodes[ep - 1]?.videoUrl ?? drama.episodes[0]?.videoUrl ?? '';
}

function hlsManifestUrlForEpisode(drama: Drama, ep: number): string | null {
  const contentType = drama.contentType === 'series' ? 'series' : 'movie';
  const isSinglePart = contentType === 'movie' || drama.totalEpisodes <= 1;
  const episode = isSinglePart
    ? drama.episodes[0]
    : (drama.episodes[ep - 1] ?? drama.episodes[0]);
  return episode?.hlsManifestUrl ?? null;
}

/**
 * Same rules as stream: free movie / free episode → sub "anon"; else purchase or subscription.
 * Returns the resolved media URLs so the watch session route can cache them once per token.
 */
export async function grantPlaybackAccess(contentId: string, ep: number): Promise<PlaybackGrant> {
  const drama = await getMovieById(contentId);
  if (!drama) {
    return { ok: false, status: 404, message: 'Not found' };
  }

  const contentType = drama.contentType === 'series' ? 'series' : 'movie';
  const isFreeMovie = contentType === 'movie' && (drama.price == null || drama.price === 0);
  const freeEpisodesCount = drama.freeEpisodesCount ?? 0;
  const isFreeEpisode = contentType === 'series' && freeEpisodesCount > 0 && ep <= freeEpisodesCount;

  const supabase = await createClient();
  const userId = await getAuthenticatedUserId(supabase);

  const hlsManifestUrl = hlsManifestUrlForEpisode(drama, ep);
  const videoUrl = (() => {
    const raw = videoUrlForEpisode(drama, ep);
    return raw.trim() ? raw.trim() : null;
  })();

  if (!videoUrl && !hlsManifestUrl) {
    return { ok: false, status: 404, message: 'Video not available' };
  }

  if ((contentType === 'movie' && isFreeMovie) || (contentType === 'series' && isFreeEpisode)) {
    return { ok: true, sub: 'anon', videoUrl, hlsManifestUrl };
  }

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
  const drama = await getMovieById(contentId);
  if (!drama) return null;
  const url = videoUrlForEpisode(drama, ep);
  return url.trim() ? url : null;
}

export async function getHlsManifestUrlForPlayback(
  contentId: string,
  ep: number
): Promise<string | null> {
  const drama = await getMovieById(contentId);
  if (!drama) return null;
  const url = hlsManifestUrlForEpisode(drama, ep);
  return url?.trim() ? url.trim() : null;
}
