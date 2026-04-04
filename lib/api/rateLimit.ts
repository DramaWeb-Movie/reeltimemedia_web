import type { NextRequest } from 'next/server';
import { checkRateLimit } from '@/lib/logging/requestLog';

type JsonRateLimitResponse = {
  type: 'json';
  body?: unknown;
};

type TextRateLimitResponse = {
  type: 'text';
  body?: string;
};

export type RateLimitResponse = JsonRateLimitResponse | TextRateLimitResponse;

/**
 * Shared helper for API route handlers.
 * Returns `null` when allowed, otherwise a `Response` for the handler to return.
 */
export async function enforceRateLimit(
  request: NextRequest,
  options: Parameters<typeof checkRateLimit>[1],
  response: RateLimitResponse = { type: 'json', body: { error: 'Too many requests' } }
): Promise<Response | null> {
  const rate = await checkRateLimit(request, options);
  if (rate.allowed) return null;

  const headers = new Headers();
  if (rate.retryAfterSeconds) headers.set('Retry-After', String(rate.retryAfterSeconds));

  if (response.type === 'text') {
    if (!headers.has('Content-Type')) headers.set('Content-Type', 'text/plain; charset=utf-8');
    return new Response(response.body ?? 'Too many requests', {
      status: rate.status,
      headers,
    });
  }

  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify(response.body ?? { error: 'Too many requests' }), {
    status: rate.status,
    headers,
  });
}
