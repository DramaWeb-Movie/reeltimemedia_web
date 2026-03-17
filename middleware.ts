import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { checkRateLimit, formatRequestLogLine, getClientIp } from '@/lib/logging/requestLog';

export async function middleware(request: NextRequest) {
  const start = Date.now();

  // Rate-limit everything matched by middleware (pages + APIs).
  const { allowed, status, retryAfterSeconds } = checkRateLimit(request);
  if (!allowed) {
    const headers = new Headers();
    if (retryAfterSeconds != null) {
      headers.set('Retry-After', String(retryAfterSeconds));
    }

    const accept = request.headers.get('accept') || '';
    const isHtml = accept.includes('text/html');

    if (isHtml) {
      headers.set('Content-Type', 'text/plain; charset=utf-8');
      return new Response('Too many requests. Please try again later.', { status, headers });
    }

    headers.set('Content-Type', 'application/json');
    const body = JSON.stringify({
      message: 'Too many requests. Please try again later.',
      ip: getClientIp(request),
    });
    return new Response(body, { status, headers });
  }

  const response = await updateSession(request);

  // Keep logs focused: API traffic is typically what you want for auditing/abuse detection.
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const line = formatRequestLogLine({
      request,
      status: response.status,
      durationMs: Date.now() - start,
    });
    // Goes to your platform logs (Vercel/Node/etc).
    console.log(line);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
