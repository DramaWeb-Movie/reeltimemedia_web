import { jsonPrivateNoStore } from '@/lib/api/json';
import { getPurchasedMovieIdsForCurrentUser } from '@/lib/movies';

export async function GET() {
  try {
    const ids = Array.from(await getPurchasedMovieIdsForCurrentUser());
    return jsonPrivateNoStore({ ids });
  } catch (error) {
    console.error('Purchased movies route error:', error);
    return jsonPrivateNoStore({ ids: [] });
  }
}
