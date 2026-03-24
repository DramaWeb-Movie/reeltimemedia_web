import type { NextRequest } from 'next/server';

export function getAllowedOrigin(request: NextRequest): string {
  const env = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (env) {
    return env.replace(/\/$/, '');
  }
  return request.nextUrl.origin;
}

/** Blocks obvious off-site / direct-tool use; not a substitute for auth. */
export function isWatchRequestFromOurSite(request: NextRequest): boolean {
  const allowed = getAllowedOrigin(request);
  const referer = request.headers.get('referer');
  const origin = request.headers.get('origin');
  if (referer && referer.startsWith(allowed)) return true;
  if (origin && origin === allowed) return true;
  return false;
}
