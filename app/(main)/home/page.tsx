import { getFeaturedMovies } from '@/lib/movies';
import HomeContent from '@/components/home/HomeContent';

export const revalidate = 60;

export default async function HomePage() {
  const featuredItems = await getFeaturedMovies(18);

  return <HomeContent featuredItems={featuredItems} />;
}
