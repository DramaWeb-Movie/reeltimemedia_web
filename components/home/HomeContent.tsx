'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { FiChevronRight, FiTrendingUp } from 'react-icons/fi';
import { useTranslations } from 'next-intl';
import DramaCardCompact from '@/components/drama/DramaCardCompact';
import type { FeaturedMovie } from '@/lib/movies';

type HomeContentProps = {
  featuredItems: FeaturedMovie[];
  purchasedMovieIds: string[];
};

/** Same card as Movies/Series/Browse, with Watch or price button */
function CardSlot({
  drama,
  purchasedSet,
}: {
  drama: FeaturedMovie;
  purchasedSet: Set<string>;
}) {
  const isSeries = drama.contentType === 'series' || drama.episodes > 1;
  const isMovie = drama.contentType === 'movie' || (!isSeries && drama.episodes <= 1);
  return (
    <div className="shrink-0 w-1/2 sm:w-1/3 md:w-1/4 lg:w-1/5 max-w-xs">
      <DramaCardCompact
        id={drama.id}
        title={drama.title}
        titleKh={drama.titleKh}
        episodes={drama.episodes}
        image={drama.image}
        showWatchButton={isSeries}
        showMovieButton={isMovie}
        hasPurchased={isMovie ? purchasedSet.has(drama.id) : undefined}
        price={isMovie ? drama.price : undefined}
      />
    </div>
  );
}

export default function HomeContent({ featuredItems, purchasedMovieIds }: HomeContentProps) {
  const t = useTranslations('home');
  const purchasedSet = useMemo(() => new Set(purchasedMovieIds), [purchasedMovieIds]);

  const mostWatchedDramas = featuredItems.slice(0, 6);
  const mustSeeDramas = featuredItems.slice(1, 7);
  const trendingDramas = featuredItems.slice(2, 8);

  if (featuredItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-6 px-4 pt-24">
        <h1 className="text-2xl font-bold text-gray-900">{t('noContent')}</h1>
        <p className="text-gray-400 text-center max-w-md">{t('noContentDesc')}</p>
        <Link href="/browse" className="text-[#E31837] hover:underline font-medium">{t('browseContent')}</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-24">

      {/* Most Watched Section */}
      <section className="py-12 md:py-16 bg-gray-50">
        <div className="container mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-1 h-8 bg-gradient-to-b from-[#E31837] to-[#E31837] rounded-full" />
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">{t('mostWatched')}</h2>
            </div>
            <Link href="/browse?filter=most-watched" className="text-[#E31837] hover:text-[#E31837]/80 font-medium transition-colors text-sm flex items-center gap-1">
              {t('viewAll')}
              <FiChevronRight className="text-lg" />
            </Link>
          </div>
          <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
            <div className="flex gap-4 md:gap-6 pb-4">
              {mostWatchedDramas.map((drama) => (
                <CardSlot key={drama.id} drama={drama} purchasedSet={purchasedSet} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Must-See Section */}
      <section className="py-12 md:py-16 bg-gray-100">
        <div className="container mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-1 h-8 bg-gradient-to-b from-[#FFB800] to-[#E31837] rounded-full" />
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">{t('mustSee')}</h2>
            </div>
            <Link href="/browse?filter=must-see" className="text-[#E31837] hover:text-[#E31837]/80 font-medium transition-colors text-sm flex items-center gap-1">
              {t('viewAll')}
              <FiChevronRight className="text-lg" />
            </Link>
          </div>
          <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
            <div className="flex gap-4 md:gap-6 pb-4">
              {mustSeeDramas.map((drama) => (
                <CardSlot key={drama.id} drama={drama} purchasedSet={purchasedSet} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Trending Section */}
      <section className="py-12 md:py-16 bg-gray-50">
        <div className="container mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-1 h-8 bg-gradient-to-b from-[#E31837] to-[#E31837] rounded-full" />
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
                {t('trendingNow')}
                <FiTrendingUp className="text-[#E31837]" />
              </h2>
            </div>
            <Link href="/browse?filter=trending" className="text-[#E31837] hover:text-[#E31837]/80 font-medium transition-colors text-sm flex items-center gap-1">
              {t('viewAll')}
              <FiChevronRight className="text-lg" />
            </Link>
          </div>
          <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
            <div className="flex gap-4 md:gap-6 pb-4">
              {trendingDramas.map((drama) => (
                <CardSlot key={drama.id} drama={drama} purchasedSet={purchasedSet} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-gray-100 to-gray-50 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#E31837] rounded-full blur-[150px]" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#E31837] rounded-full blur-[150px]" />
        </div>
        <div className="container mx-auto px-4 md:px-8 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              {t('startStreaming')} <span className="gradient-text">{t('today')}</span>
            </h2>
            <p className="text-gray-500 text-lg mb-8 max-w-xl mx-auto">
              {t('joinMillions')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="gradient-btn inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold text-white shadow-xl text-lg"
              >
                {t('getStartedFree')}
              </Link>
              <Link
                href="/browse"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold text-gray-900 bg-white border border-gray-200 hover:bg-gray-50 transition-all text-lg shadow-sm"
              >
                {t('browseContent')}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
