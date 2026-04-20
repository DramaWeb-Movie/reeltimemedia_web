import type { NextRequest } from 'next/server';
import { getPlaybackMetadata, type PlaybackMetadata } from '@/lib/watch/playbackMetadata';
import { type PlaybackTokenPayload, verifyPlaybackToken } from '@/lib/watch/playbackToken';
import { getAllowedOrigin, isWatchRequestFromOurSite } from '@/lib/watch/requestOrigin';

type PlaybackRequestFailure = {
  ok: false;
  response: Response;
};

type PlaybackRequestSuccess = {
  ok: true;
  token: string;
  claims: PlaybackTokenPayload;
  cachedMetadata: PlaybackMetadata | null;
};

type AuthorizedPlaybackRequest = PlaybackRequestFailure | PlaybackRequestSuccess;

function noStoreHeaders(headers?: HeadersInit): Headers {
  const merged = new Headers(headers);
  merged.set('Cache-Control', 'no-store');
  return merged;
}

function matchesPlaybackMetadata(
  metadata: PlaybackMetadata | null,
  claims: PlaybackTokenPayload
): metadata is PlaybackMetadata {
  return Boolean(
    metadata &&
    metadata.contentId === claims.contentId &&
    metadata.ep === claims.ep
  );
}

function createWatchHomeRedirect(request: NextRequest): Response {
  return new Response(null, {
    status: 302,
    headers: noStoreHeaders({
      Location: `${getAllowedOrigin(request)}/`,
    }),
  });
}

export async function authorizePlaybackRequest(
  request: NextRequest
): Promise<AuthorizedPlaybackRequest> {
  if (!isWatchRequestFromOurSite(request)) {
    return {
      ok: false,
      response: createWatchHomeRedirect(request),
    };
  }

  const token = request.nextUrl.searchParams.get('token')?.trim();
  if (!token) {
    return {
      ok: false,
      response: new Response('Missing playback token', {
        status: 401,
        headers: noStoreHeaders(),
      }),
    };
  }

  const claims = await verifyPlaybackToken(token);
  if (!claims) {
    return {
      ok: false,
      response: new Response('Invalid or expired playback token', {
        status: 401,
        headers: noStoreHeaders(),
      }),
    };
  }

  const cachedMetadata = await getPlaybackMetadata(claims.playbackKey);

  return {
    ok: true,
    token,
    claims,
    cachedMetadata: matchesPlaybackMetadata(cachedMetadata, claims) ? cachedMetadata : null,
  };
}
