import { NextResponse, type NextRequest } from 'next/server';
import { logApiRequest } from '@/lib/logging/requestLog';
import { updateSession } from '@/lib/supabase/middleware';

function shouldRefreshSession(pathname: string): boolean {
  return pathname !== '/api/watch/hls' && pathname !== '/api/watch/stream';
}

export async function proxy(request: NextRequest) {
  const start = Date.now();
  const pathname = request.nextUrl.pathname;

  const response = shouldRefreshSession(pathname)
    ? await updateSession(request)
    : NextResponse.next({ request });

  // Keep logs focused: API traffic is typically what you want for auditing/abuse detection.
  if (pathname.startsWith('/api/')) {
    logApiRequest({
      request,
      status: response.status,
      durationMs: Date.now() - start,
      route: pathname,
    });
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
