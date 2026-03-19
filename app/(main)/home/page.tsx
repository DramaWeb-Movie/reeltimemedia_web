import { getFeaturedMovies, getPurchasedMovieIdsForCurrentUser } from '@/lib/movies';
import HomeContent from '@/components/home/HomeContent';

export default async function HomePage() {
  const [featuredItems, purchasedMovieIds] = await Promise.all([
    getFeaturedMovies(18),
    getPurchasedMovieIdsForCurrentUser(),
  ]);

  return (
    <HomeContent
      featuredItems={featuredItems}
      purchasedMovieIds={Array.from(purchasedMovieIds)}
    />
  );
}
