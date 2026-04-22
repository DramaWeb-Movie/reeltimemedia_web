import { NextRequest } from 'next/server';
import { enforceRateLimit } from '@/lib/api/rateLimit';
import { fetchWithBudget } from '@/lib/utils/fetchWithBudget';
import { getVideoUrlForPlayback } from '@/lib/watch/playbackAccess';
import { setPlaybackMetadata } from '@/lib/watch/playbackMetadata';
import { authorizePlaybackRequest } from '@/lib/watch/playbackRequest';
import { getPlaybackTokenTtlSeconds } from '@/lib/watch/playbackToken';

function isPublicHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

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

  const auth = await authorizePlaybackRequest(request);
  if (!auth.ok) return auth.response;

  const { claims, cachedMetadata } = auth;
  let videoUrl = cachedMetadata?.videoUrl ?? null;

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

  // Redirect the browser directly to the public CDN URL so the video streams
  // from Cloudflare instead of proxying every byte through Vercel. Using the
  // public R2 host (pub-*.r2.dev) keeps CORS and Range requests working for
  // <video> — presigning to r2.cloudflarestorage.com strips browser CORS
  // headers and can trip SSL handshake issues, leaving the video unplayable.
  if (isPublicHttpUrl(videoUrl)) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: videoUrl,
        'Cache-Control': 'no-store',
      },
    });
  }

  // Fallback: proxy for non-HTTP(S) or otherwise non-redirectable URLs
  const rangeHeader = request.headers.get('range');
  const headers: Record<string, string> = {};
  if (rangeHeader) headers['Range'] = rangeHeader;

  let videoResponse: Response;
  try {
    videoResponse = await fetchWithBudget(
      videoUrl,
      { headers, redirect: 'follow' },
      { timeoutMs: 12000, retries: 1, retryDelayMs: 200 }
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
