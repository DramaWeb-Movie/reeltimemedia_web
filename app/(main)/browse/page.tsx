import { getMovies, getPurchasedMovieIdsForCurrentUser } from '@/lib/movies';
import BrowseContent from '@/components/browse/BrowseContent';

export const dynamic = 'force-dynamic';

export default async function BrowsePage() {
  const [dramasResult, purchasedResult] = await Promise.allSettled([
    getMovies({ status: 'published' }),
    getPurchasedMovieIdsForCurrentUser(),
  ]);

  const dramas = dramasResult.status === 'fulfilled' ? dramasResult.value : [];
  const purchasedMovieIds =
    purchasedResult.status === 'fulfilled' ? purchasedResult.value : new Set<string>();

  if (dramasResult.status === 'rejected') {
    console.error('BrowsePage getMovies failed:', dramasResult.reason);
  }
  if (purchasedResult.status === 'rejected') {
    console.error('BrowsePage getPurchasedMovieIdsForCurrentUser failed:', purchasedResult.reason);
  }

  return (
    <BrowseContent
      initialDramas={dramas}
      purchasedMovieIds={Array.from(purchasedMovieIds)}
    />
  );
}
