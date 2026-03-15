import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getMovieById } from '@/lib/movies';

function getAllowedOrigin(request: NextRequest): string {
  const env = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (env) {
    return env.replace(/\/$/, '');
  }
  return request.nextUrl.origin;
}

/** Reject if request is not from our website (blocks direct links, other sites, curl). */
function isRequestFromOurSite(request: NextRequest): boolean {
  const allowed = getAllowedOrigin(request);
  const referer = request.headers.get('referer');
  const origin = request.headers.get('origin');
  if (referer && referer.startsWith(allowed)) return true;
  if (origin && origin === allowed) return true;
  return false;
}

/**
 * Stream video through the server so the real storage URL is never exposed.
 * Verifies the user has access (purchase / subscription / free) before streaming.
 * Only allows requests from our website (Referer/Origin check).
 * Supports Range requests for video seeking.
 */
export async function GET(request: NextRequest) {
  if (!isRequestFromOurSite(request)) {
    const home = process.env.NEXT_PUBLIC_APP_URL?.trim()?.replace(/\/$/, '') || request.nextUrl.origin;
    return new Response(null, { status: 302, headers: { Location: `${home}/` } });
  }

  const { searchParams } = new URL(request.url);
  const contentId = searchParams.get('contentId');
  const ep = Math.max(1, parseInt(searchParams.get('ep') ?? '1', 10) || 1);

  if (!contentId) {
    return new Response('Missing contentId', { status: 400 });
  }

  const drama = await getMovieById(contentId);
  if (!drama) {
    return new Response('Not found', { status: 404 });
  }

  const contentType = drama.contentType === 'series' ? 'series' as const : 'movie' as const;
  const isFreeMovie = contentType === 'movie' && (drama.price == null || drama.price === 0);
  const freeEpisodesCount = drama.freeEpisodesCount ?? 0;
  const isFreeEpisode = contentType === 'series' && freeEpisodesCount > 0 && ep <= freeEpisodesCount;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Free movie or free episode: no auth required — anyone can watch
  if ((contentType === 'movie' && isFreeMovie) || (contentType === 'series' && isFreeEpisode)) {
    // allow
  } else if (!user) {
    return new Response('Unauthorized', { status: 401 });
  } else if (contentType === 'series') {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();
    if (!sub) {
      return new Response('Subscription required', { status: 403 });
    }
  } else if (contentType === 'movie') {
    const { data: purchase } = await supabase
      .from('purchases')
      .select('id')
      .eq('user_id', user.id)
      .eq('content_id', contentId)
      .eq('content_type', 'movie')
      .maybeSingle();
    if (!purchase) {
      return new Response('Purchase required', { status: 403 });
    }
  }

  const isSinglePart = contentType === 'movie' || drama.totalEpisodes <= 1;
  const videoUrl = isSinglePart && drama.episodes[0]?.videoUrl
    ? drama.episodes[0].videoUrl
    : drama.episodes[ep - 1]?.videoUrl ?? drama.episodes[0]?.videoUrl ?? '';

  if (!videoUrl) {
    return new Response('Video not available', { status: 404 });
  }

  const rangeHeader = request.headers.get('range');

  // Proxy stream: fetch from storage (R2 public URL or any other origin). Browser only sees our domain.
  // We do not use R2 S3 API here to avoid TLS handshake failures (EPROTO) in some Node/OpenSSL setups.
  const headers: Record<string, string> = {};
  if (rangeHeader) headers['Range'] = rangeHeader;

  const videoResponse = await fetch(videoUrl, {
    headers,
    redirect: 'follow',
  });

  if (!videoResponse.ok) {
    return new Response('Upstream video unavailable', { status: 502 });
  }

  const responseHeaders = new Headers();
  const contentTypeHeader = videoResponse.headers.get('content-type');
  if (contentTypeHeader) responseHeaders.set('Content-Type', contentTypeHeader);
  const contentLength = videoResponse.headers.get('content-length');
  if (contentLength) responseHeaders.set('Content-Length', contentLength);
  // Explicit Accept-Ranges so the browser can seek (range requests) even if upstream omits it
  responseHeaders.set('Accept-Ranges', videoResponse.headers.get('accept-ranges') || 'bytes');
  const contentRange = videoResponse.headers.get('content-range');
  if (contentRange) responseHeaders.set('Content-Range', contentRange);
  responseHeaders.set('Cache-Control', 'private, no-cache');
  responseHeaders.set('X-Content-Type-Options', 'nosniff');
  responseHeaders.set('X-Frame-Options', 'SAMEORIGIN');

  return new Response(videoResponse.body, {
    status: videoResponse.status,
    headers: responseHeaders,
  });
}
