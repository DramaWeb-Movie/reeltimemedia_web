import DramaCardCompact from '@/components/drama/DramaCardCompact';
import { CATALOG_CARD_GRID } from '@/lib/catalog/grid';
import { getRecommendedMovies } from '@/lib/movies';
import { getTranslations } from 'next-intl/server';
import type { ContentType } from '@/types';

export function WatchRecommendationsSkeleton() {
  return (
    <section className="mt-10 sm:mt-12 animate-pulse" aria-busy="true" aria-label="Loading recommendations">
      <div className="flex items-center justify-between gap-3 mb-4 sm:mb-5">
        <div className="h-7 w-40 sm:w-48 bg-gray-200 rounded-lg" />
        <div className="h-4 w-28 sm:w-40 bg-gray-100 rounded hidden sm:block" />
      </div>
      <div className={CATALOG_CARD_GRID}>
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="aspect-2/3 bg-gray-200 rounded-xl" />
        ))}
      </div>
    </section>
  );
}

export default async function WatchRecommendations({
  id,
  contentType,
  genres,
}: {
  id: string;
  contentType: ContentType;
  genres: string[];
}) {
  const t = await getTranslations('watch');
  const recommended = await getRecommendedMovies(id, contentType, genres, 5);
  if (recommended.length === 0) return null;

  return (
    <section className="mt-10 sm:mt-12">
      <div className="flex items-center justify-between gap-3 mb-4 sm:mb-5">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-1.5 rounded-full bg-(--primary-red)" />
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">{t('youMayAlsoLike')}</h2>
        </div>
        <span className="text-xs sm:text-sm text-gray-500">{t('handpickedForYou')}</span>
      </div>
      <div className={CATALOG_CARD_GRID}>
        {recommended.map((item) => {
          const isSeries = item.contentType === 'series' || item.episodes > 1;
          const isMovie = item.contentType === 'movie' || (!isSeries && item.episodes <= 1);
          return (
            <DramaCardCompact
              key={item.id}
              id={item.id}
              title={item.title}
              titleKh={item.titleKh}
              episodes={item.episodes}
              image={item.image}
              showWatchButton={isSeries}
              showMovieButton={isMovie}
              price={isMovie ? item.price : undefined}
            />
          );
        })}
      </div>
    </section>
  );
}
