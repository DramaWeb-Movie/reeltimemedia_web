import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { formatRequestLogLine } from '@/lib/logging/requestLog';

export async function middleware(request: NextRequest) {
  const start = Date.now();

  const response = await updateSession(request);

  // Keep logs focused: API traffic is typically what you want for auditing/abuse detection.
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const line = formatRequestLogLine({
      request,
      status: response.status,
      durationMs: Date.now() - start,
    });
    console.log(line);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
