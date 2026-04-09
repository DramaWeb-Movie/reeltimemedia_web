import { NextResponse } from 'next/server';
import { getPurchasedMovieIdsForCurrentUser } from '@/lib/movies';

export async function GET() {
  try {
    const ids = Array.from(await getPurchasedMovieIdsForCurrentUser());
    const response = NextResponse.json({ ids });
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  } catch (error) {
    console.error('Purchased movies route error:', error);
    const response = NextResponse.json({ ids: [] });
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  }
}
