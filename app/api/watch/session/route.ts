import { NextRequest } from 'next/server';
import { jsonNoStore } from '@/lib/api/json';
import { enforceRateLimit } from '@/lib/api/rateLimit';
import { isWatchRequestFromOurSite } from '@/lib/watch/requestOrigin';
import { grantPlaybackAccess } from '@/lib/watch/playbackAccess';
import { createPlaybackKey, setPlaybackMetadata } from '@/lib/watch/playbackMetadata';
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
    return jsonNoStore({ error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonNoStore({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    return jsonNoStore({ error: 'Invalid body' }, { status: 400 });
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
    return jsonNoStore({ error: 'Missing contentId' }, { status: 400 });
  }

  let grant;
  try {
    grant = await grantPlaybackAccess(contentId, ep);
  } catch (e) {
    console.error('grantPlaybackAccess error:', e);
    return jsonNoStore({ error: 'Playback unavailable' }, { status: 500 });
  }

  if (!grant.ok) {
    return jsonNoStore(
      { error: grant.message },
      { status: grant.status }
    );
  }

  let token: string;
  let expiresAt: Date;
  const playbackKey = createPlaybackKey();
  const expiresInSeconds = getPlaybackTokenTtlSeconds();
  try {
    ({ token, expiresAt } = await signPlaybackToken({
      sub: grant.sub,
      contentId,
      ep,
      playbackKey,
    }));
  } catch (e) {
    console.error('signPlaybackToken error:', e);
    return jsonNoStore(
      { error: 'Playback token misconfigured' },
      { status: 500 }
    );
  }

  await setPlaybackMetadata(
    playbackKey,
    {
      contentId,
      ep,
      videoUrl: grant.videoUrl,
      hlsManifestUrl: grant.hlsManifestUrl,
    },
    expiresInSeconds + 30
  );

  const playbackUrl = `/api/watch/stream?token=${encodeURIComponent(token)}`;
  const hlsManifestUrl = grant.hlsManifestUrl
    ? `/api/watch/hls?token=${encodeURIComponent(token)}`
    : null;

  return jsonNoStore({
    playbackUrl,
    ...(hlsManifestUrl ? { hlsManifestUrl } : {}),
    expiresAt: expiresAt.toISOString(),
    expiresInSeconds,
  });
}
