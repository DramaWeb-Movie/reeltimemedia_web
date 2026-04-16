import { getFeaturedMovies, getPromotionHeroMovies } from '@/lib/movies';
import HomeContent from '@/components/home/HomeContent';

export const revalidate = 60;

export default async function HomePage() {
  const [featuredItems, promotionItems] = await Promise.all([
    getFeaturedMovies(18),
    getPromotionHeroMovies(10),
  ]);

  return <HomeContent featuredItems={featuredItems} promotionItems={promotionItems} />;
}
