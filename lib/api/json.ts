import { NextResponse } from 'next/server';

function jsonWithCacheControl(
  body: unknown,
  init: ResponseInit | undefined,
  cacheControl: string
) {
  const headers = new Headers(init?.headers);
  headers.set('Cache-Control', cacheControl);
  return NextResponse.json(body, { ...init, headers });
}

export function jsonNoStore(body: unknown, init?: ResponseInit) {
  return jsonWithCacheControl(body, init, 'no-store');
}

export function jsonPrivateNoStore(body: unknown, init?: ResponseInit) {
  return jsonWithCacheControl(body, init, 'private, no-store');
}
