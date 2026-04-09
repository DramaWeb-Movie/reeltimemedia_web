import { NextRequest, NextResponse } from 'next/server';
import { enforceRateLimit } from '@/lib/api/rateLimit';
import { isWatchRequestFromOurSite } from '@/lib/watch/requestOrigin';
import { grantPlaybackAccess } from '@/lib/watch/playbackAccess';
import { getPlaybackTokenTtlSeconds, signPlaybackToken } from '@/lib/watch/playbackToken';

export async function POST(request: NextRequest) {
  const blocked = await enforceRateLimit(
    request,
    {
    namespace: 'api:watch:session',
    max: 60,
    windowMs: 60 * 1000,
    blockMs: 10 * 60 * 1000,
    },
    { type: 'text', body: 'Too many requests' }
  );
  if (blocked) return blocked;

  if (!isWatchRequestFromOurSite(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const contentId = typeof (body as { contentId?: unknown }).contentId === 'string'
    ? (body as { contentId: string }).contentId.trim()
    : '';
  const rawEp = (body as { ep?: unknown }).ep;
  const ep = typeof rawEp === 'number' && Number.isFinite(rawEp)
    ? Math.max(1, Math.floor(rawEp))
    : typeof rawEp === 'string'
      ? Math.max(1, parseInt(rawEp, 10) || 1)
      : 1;

  if (!contentId) {
    return NextResponse.json({ error: 'Missing contentId' }, { status: 400 });
  }

  let grant;
  try {
    grant = await grantPlaybackAccess(contentId, ep);
  } catch (e) {
    console.error('grantPlaybackAccess error:', e);
    return NextResponse.json({ error: 'Playback unavailable' }, { status: 500 });
  }

  if (!grant.ok) {
    return NextResponse.json(
      { error: grant.message },
      { status: grant.status }
    );
  }

  let token: string;
  let expiresAt: Date;
  try {
    ({ token, expiresAt } = await signPlaybackToken({
      sub: grant.sub,
      contentId,
      ep,
    }));
  } catch (e) {
    console.error('signPlaybackToken error:', e);
    return NextResponse.json(
      { error: 'Playback token misconfigured' },
      { status: 500 }
    );
  }

  const playbackUrl = `/api/watch/stream?token=${encodeURIComponent(token)}`;
  const expiresInSeconds = getPlaybackTokenTtlSeconds();
  const hlsManifestUrl = grant.hlsManifestUrl
    ? `/api/watch/hls?token=${encodeURIComponent(token)}`
    : null;

  return NextResponse.json({
    playbackUrl,
    ...(hlsManifestUrl ? { hlsManifestUrl } : {}),
    expiresAt: expiresAt.toISOString(),
    expiresInSeconds,
  });
}
