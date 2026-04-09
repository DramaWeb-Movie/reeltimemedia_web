import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { enforceRateLimit } from '@/lib/api/rateLimit';
import { getAuthenticatedUserId } from '@/lib/supabase/authUser';
import { fetchWithBudget } from '@/lib/utils/fetchWithBudget';
import { isWatchRequestFromOurSite } from '@/lib/watch/requestOrigin';
import { getVideoUrlForPlayback } from '@/lib/watch/playbackAccess';
import { getPlaybackMetadata, setPlaybackMetadata } from '@/lib/watch/playbackMetadata';
import { getPlaybackTokenTtlSeconds, verifyPlaybackToken } from '@/lib/watch/playbackToken';

/**
 * Stream video through the server so the real storage URL is never exposed.
 * Requires a short-lived JWT from POST /api/watch/session (Phase A).
 * Supports Range requests for video seeking.
 */
export async function GET(request: NextRequest) {
  const blocked = await enforceRateLimit(
    request,
    {
    namespace: 'api:watch:stream',
    max: 120,
    windowMs: 60 * 1000,
    blockMs: 10 * 60 * 1000,
    },
    { type: 'text', body: 'Too many requests' }
  );
  if (blocked) return blocked;

  if (!isWatchRequestFromOurSite(request)) {
    const home = process.env.NEXT_PUBLIC_APP_URL?.trim()?.replace(/\/$/, '') || request.nextUrl.origin;
    return new Response(null, { status: 302, headers: { Location: `${home}/` } });
  }

  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  if (!token?.trim()) {
    return new Response('Missing playback token', { status: 401 });
  }

  const claims = await verifyPlaybackToken(token.trim());
  if (!claims) {
    return new Response('Invalid or expired playback token', { status: 401 });
  }

  if (claims.sub !== 'anon') {
    const supabase = await createClient();
    const userId = await getAuthenticatedUserId(supabase);
    if (!userId || userId !== claims.sub) {
      return new Response('Forbidden', { status: 403 });
    }
  }

  const cachedMetadata = await getPlaybackMetadata(claims.playbackKey);
  let videoUrl =
    cachedMetadata &&
    cachedMetadata.contentId === claims.contentId &&
    cachedMetadata.ep === claims.ep
      ? cachedMetadata.videoUrl
      : null;

  if (!videoUrl) {
    videoUrl = await getVideoUrlForPlayback(claims.contentId, claims.ep);
    if (videoUrl) {
      await setPlaybackMetadata(
        claims.playbackKey,
        {
          contentId: claims.contentId,
          ep: claims.ep,
          videoUrl,
          hlsManifestUrl: cachedMetadata?.hlsManifestUrl ?? null,
        },
        getPlaybackTokenTtlSeconds() + 30
      );
    }
  }

  if (!videoUrl) {
    return new Response('Video not available', { status: 404 });
  }

  const rangeHeader = request.headers.get('range');

  const headers: Record<string, string> = {};
  if (rangeHeader) headers['Range'] = rangeHeader;

  let videoResponse: Response;
  try {
    videoResponse = await fetchWithBudget(
      videoUrl,
      {
        headers,
        redirect: 'follow',
      },
      {
        timeoutMs: 12000,
        retries: 1,
        retryDelayMs: 200,
      }
    );
  } catch {
    return new Response('Upstream video timeout', { status: 504 });
  }

  if (!videoResponse.ok) {
    return new Response('Upstream video unavailable', { status: 502 });
  }

  const responseHeaders = new Headers();
  const contentTypeHeader = videoResponse.headers.get('content-type');
  if (contentTypeHeader) responseHeaders.set('Content-Type', contentTypeHeader);
  const contentLength = videoResponse.headers.get('content-length');
  if (contentLength) responseHeaders.set('Content-Length', contentLength);
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
