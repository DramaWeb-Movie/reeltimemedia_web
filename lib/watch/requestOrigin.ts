import type { NextRequest } from 'next/server';

export function getAllowedOrigin(request: NextRequest): string {
  const env = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (env) {
    return env.replace(/\/$/, '');
  }
  return request.nextUrl.origin;
}

function safeOrigin(urlLike: string): string | null {
  try {
    return new URL(urlLike).origin;
  } catch {
    return null;
  }
}

/**
 * Blocks obvious off-site / direct-tool use; not a substitute for auth (playback still needs a token).
 *
 * `<video src="/api/watch/stream">` often sends no Referer (policy/privacy) or a host that does not
 * match `NEXT_PUBLIC_APP_URL` (www vs apex, localhost vs 127.0.0.1). Those cases must still count
 * as same-site or the player receives a redirect/HTML and shows a blank frame.
 */
export function isWatchRequestFromOurSite(request: NextRequest): boolean {
  const allowed = getAllowedOrigin(request);
  const allowedOrigin = safeOrigin(`${allowed}/`);
  const requestOrigin = request.nextUrl.origin;
  const referer = request.headers.get('referer');
  const origin = request.headers.get('origin');
  const secFetchSite = request.headers.get('sec-fetch-site');

  if (secFetchSite === 'same-origin') {
    return true;
  }

  if (origin) {
    if (origin === allowed) return true;
    if (origin === requestOrigin) return true;
    if (allowedOrigin && origin === allowedOrigin) return true;
  }

  if (referer) {
    if (referer.startsWith(allowed)) return true;
    const refOrigin = safeOrigin(referer);
    if (refOrigin && refOrigin === requestOrigin) return true;
    if (allowedOrigin && refOrigin === allowedOrigin) return true;
  }

  // No cross-site indicators at all — <video src="..."> often sends neither Origin nor
  // Referer (privacy/referrer-policy) and sec-fetch-site is absent in Firefox/Safari.
  // Block only when sec-fetch-site explicitly says cross-site; otherwise allow because
  // the JWT token is the real auth gate.
  if (!origin && !referer && secFetchSite !== 'cross-site') return true;

  return false;
}
