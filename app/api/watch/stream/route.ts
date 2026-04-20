import { NextRequest } from 'next/server';
import { enforceRateLimit } from '@/lib/api/rateLimit';
import { fetchWithBudget } from '@/lib/utils/fetchWithBudget';
import { getR2PresignedUrl, isR2Url } from '@/lib/r2';
import { getVideoUrlForPlayback } from '@/lib/watch/playbackAccess';
import { setPlaybackMetadata } from '@/lib/watch/playbackMetadata';
import { authorizePlaybackRequest } from '@/lib/watch/playbackRequest';
import { getPlaybackTokenTtlSeconds } from '@/lib/watch/playbackToken';

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

  // Redirect to the public R2 URL so the browser fetches the video directly from
  // Cloudflare CDN instead of proxying every byte through Vercel.
  // Prefer a short-lived presigned URL when credentials are available; fall back
  // to the stored public URL for legacy setups.
  if (isR2Url(videoUrl)) {
    const signedUrl = await getR2PresignedUrl(
      videoUrl,
      Math.max(60, getPlaybackTokenTtlSeconds())
    );
    return new Response(null, {
      status: 302,
      headers: {
        Location: signedUrl ?? videoUrl,
        'Cache-Control': 'no-store',
      },
    });
  }

  // Fallback: proxy for non-R2 URLs
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
