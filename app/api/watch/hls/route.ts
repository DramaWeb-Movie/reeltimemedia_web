import { NextRequest } from 'next/server';
import { enforceRateLimit } from '@/lib/api/rateLimit';
import { fetchWithBudget } from '@/lib/utils/fetchWithBudget';
import { isR2Url } from '@/lib/r2';
import { resolveAdaptiveManifestUrl } from '@/lib/watch/hlsManifest';
import { getHlsManifestUrlForPlayback } from '@/lib/watch/playbackAccess';
import { getPlaybackMetadata, setPlaybackMetadata } from '@/lib/watch/playbackMetadata';
import { getPlaybackTokenTtlSeconds, verifyPlaybackToken } from '@/lib/watch/playbackToken';
import { isWatchRequestFromOurSite } from '@/lib/watch/requestOrigin';

const HLS_ACCEPT_HEADER = 'application/vnd.apple.mpegurl,application/x-mpegURL,text/plain,*/*';

function manifestDirectory(pathname: string): string {
  const dir = pathname.replace(/\/[^/]*$/, '/');
  return dir || '/';
}

function isHttpUrl(url: URL): boolean {
  return url.protocol === 'http:' || url.protocol === 'https:';
}

function isAllowedTarget(rootManifestUrl: string, rawTargetUrl: string): boolean {
  try {
    const root = new URL(rootManifestUrl);
    const target = new URL(rawTargetUrl);
    if (!isHttpUrl(target)) return false;
    if (target.origin !== root.origin) return false;
    const rootDir = manifestDirectory(root.pathname);
    return target.pathname === root.pathname || target.pathname.startsWith(rootDir);
  } catch {
    return false;
  }
}

function buildProxyUrl(request: NextRequest, token: string, targetUrl: string): string {
  const proxyUrl = new URL('/api/watch/hls', request.nextUrl.origin);
  proxyUrl.searchParams.set('token', token);
  proxyUrl.searchParams.set('url', targetUrl);
  return proxyUrl.toString();
}

function toProxyUrl(
  rawValue: string,
  currentManifestUrl: string,
  request: NextRequest,
  token: string
): string | null {
  try {
    const resolved = new URL(rawValue, currentManifestUrl);
    if (!isHttpUrl(resolved)) return null;
    return buildProxyUrl(request, token, resolved.toString());
  } catch {
    return null;
  }
}

function rewriteManifestLine(
  line: string,
  currentManifestUrl: string,
  request: NextRequest,
  token: string
): string {
  const trimmed = line.trim();
  if (!trimmed) return line;

  if (trimmed.startsWith('#')) {
    return line.replace(/URI=(["'])(.+?)\1/g, (match, quote, value: string) => {
      const proxied = toProxyUrl(value, currentManifestUrl, request, token);
      return proxied ? `URI=${quote}${proxied}${quote}` : match;
    });
  }

  return toProxyUrl(trimmed, currentManifestUrl, request, token) ?? line;
}

function rewriteManifest(
  content: string,
  currentManifestUrl: string,
  request: NextRequest,
  token: string
): string {
  return content
    .split(/\r?\n/)
    .map((line) => rewriteManifestLine(line, currentManifestUrl, request, token))
    .join('\n');
}

function copyUpstreamHeaders(upstream: Response, contentLength?: string): Headers {
  const headers = new Headers();
  const contentType = upstream.headers.get('content-type');
  if (contentType) headers.set('Content-Type', contentType);
  if (contentLength) headers.set('Content-Length', contentLength);
  const acceptRanges = upstream.headers.get('accept-ranges');
  if (acceptRanges) headers.set('Accept-Ranges', acceptRanges);
  const contentRange = upstream.headers.get('content-range');
  if (contentRange) headers.set('Content-Range', contentRange);
  headers.set('Cache-Control', 'private, no-cache');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'SAMEORIGIN');
  return headers;
}

async function authorizePlaybackRequest(token: string) {
  const claims = await verifyPlaybackToken(token);
  if (!claims) {
    return {
      ok: false as const,
      response: new Response('Invalid or expired playback token', { status: 401 }),
    };
  }
  // The JWT is HMAC-signed — verifyPlaybackToken already proves identity.
  // Re-checking Supabase session on every segment adds a DB round-trip per .ts chunk.
  return { ok: true as const, claims };
}

export async function GET(request: NextRequest) {
  const blocked = await enforceRateLimit(
    request,
    {
      namespace: 'api:watch:hls',
      max: 240,
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

  const token = request.nextUrl.searchParams.get('token')?.trim();
  if (!token) {
    return new Response('Missing playback token', { status: 401 });
  }

  const auth = await authorizePlaybackRequest(token);
  if (!auth.ok) return auth.response;

  const cachedMetadata = await getPlaybackMetadata(auth.claims.playbackKey);
  let storedManifestUrl =
    cachedMetadata &&
    cachedMetadata.contentId === auth.claims.contentId &&
    cachedMetadata.ep === auth.claims.ep
      ? cachedMetadata.hlsManifestUrl
      : null;

  if (!storedManifestUrl) {
    storedManifestUrl = await getHlsManifestUrlForPlayback(auth.claims.contentId, auth.claims.ep);
    if (storedManifestUrl) {
      await setPlaybackMetadata(
        auth.claims.playbackKey,
        {
          contentId: auth.claims.contentId,
          ep: auth.claims.ep,
          videoUrl: cachedMetadata?.videoUrl ?? null,
          hlsManifestUrl: storedManifestUrl,
        },
        getPlaybackTokenTtlSeconds() + 30
      );
    }
  }

  if (!storedManifestUrl) {
    return new Response('HLS manifest not available', { status: 404 });
  }

  const rootManifestUrl = await resolveAdaptiveManifestUrl(storedManifestUrl);
  if (!rootManifestUrl) {
    return new Response('HLS manifest not available', { status: 404 });
  }

  const rawTargetUrl = request.nextUrl.searchParams.get('url')?.trim() || rootManifestUrl;
  if (!isAllowedTarget(rootManifestUrl, rawTargetUrl)) {
    return new Response('Forbidden', { status: 403 });
  }

  const targetUrl = new URL(rawTargetUrl);
  const isManifestRequest = targetUrl.pathname.toLowerCase().endsWith('.m3u8');

  // For segments: redirect directly to R2 instead of proxying every byte through Vercel.
  // R2 public URLs serve with permissive CORS so HLS.js can follow the redirect cross-origin.
  if (!isManifestRequest && isR2Url(rawTargetUrl)) {
    return new Response(null, {
      status: 302,
      headers: { Location: rawTargetUrl, 'Cache-Control': 'no-store' },
    });
  }

  const rangeHeader = request.headers.get('range');
  const upstreamHeaders: Record<string, string> = {};
  if (rangeHeader) upstreamHeaders.Range = rangeHeader;
  if (isManifestRequest) upstreamHeaders.Accept = HLS_ACCEPT_HEADER;

  let upstream: Response;
  try {
    upstream = await fetchWithBudget(
      rawTargetUrl,
      { headers: upstreamHeaders, redirect: 'follow' },
      { timeoutMs: isManifestRequest ? 7000 : 12000, retries: 1, retryDelayMs: 200 }
    );
  } catch {
    return new Response('Upstream HLS unavailable', { status: 504 });
  }

  if (!upstream.ok) {
    return new Response('Upstream HLS unavailable', { status: 502 });
  }

  if (isManifestRequest) {
    const originalText = await upstream.text();
    const rewritten = rewriteManifest(originalText, rawTargetUrl, request, token);
    const headers = copyUpstreamHeaders(upstream);
    headers.set('Content-Type', 'application/vnd.apple.mpegurl');
    return new Response(rewritten, { status: upstream.status, headers });
  }

  const headers = copyUpstreamHeaders(upstream, upstream.headers.get('content-length') ?? undefined);
  return new Response(upstream.body, { status: upstream.status, headers });
}
