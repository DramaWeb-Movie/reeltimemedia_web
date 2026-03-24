import { createClient } from '@/lib/supabase/server';
import { getMovieById } from '@/lib/movies';
import type { Drama } from '@/types';

export type PlaybackGrant =
  | { ok: true; sub: string }
  | { ok: false; status: number; message: string };

function videoUrlForEpisode(drama: Drama, ep: number): string {
  const contentType = drama.contentType === 'series' ? 'series' : 'movie';
  const isSinglePart = contentType === 'movie' || drama.totalEpisodes <= 1;
  if (isSinglePart && drama.episodes[0]?.videoUrl) {
    return drama.episodes[0].videoUrl;
  }
  return drama.episodes[ep - 1]?.videoUrl ?? drama.episodes[0]?.videoUrl ?? '';
}

/**
 * Same rules as stream: free movie / free episode → sub "anon"; else purchase or subscription.
 * Returns sub for JWT; stream route resolves video URL again from DB using token claims.
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if ((contentType === 'movie' && isFreeMovie) || (contentType === 'series' && isFreeEpisode)) {
    return { ok: true, sub: 'anon' };
  }

  if (!user) {
    return { ok: false, status: 401, message: 'Unauthorized' };
  }

  if (contentType === 'series') {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();
    if (!sub) {
      return { ok: false, status: 403, message: 'Subscription required' };
    }
    return { ok: true, sub: user.id };
  }

  const { data: purchase } = await supabase
    .from('purchases')
    .select('id')
    .eq('user_id', user.id)
    .eq('content_id', contentId)
    .eq('content_type', 'movie')
    .maybeSingle();
  if (!purchase) {
    return { ok: false, status: 403, message: 'Purchase required' };
  }
  return { ok: true, sub: user.id };
}

export async function getVideoUrlForPlayback(contentId: string, ep: number): Promise<string | null> {
  const drama = await getMovieById(contentId);
  if (!drama) return null;
  const url = videoUrlForEpisode(drama, ep);
  return url.trim() ? url : null;
}
