'use client';

import { memo, useMemo } from 'react';
import Link from 'next/link';
import { FiTrendingUp, FiCheckCircle, FiDollarSign } from 'react-icons/fi';
import { useTranslations } from 'next-intl';
import DramaCardCompact from '@/components/drama/DramaCardCompact';
import SectionHeader from '@/components/shared/SectionHeader';
import { usePurchasedMovieIds } from '@/hooks/usePurchasedMovieIds';
import { resolveContentKind } from '@/lib/utils';
import type { FeaturedMovie } from '@/lib/movies';

type HomeContentProps = {
  featuredItems: FeaturedMovie[];
};

type CardSlotProps = {
  drama: FeaturedMovie;
  purchasedSet: Set<string>;
  imagePriority?: boolean;
};

/** Same card as Movies/Series/Browse, with Watch or price button */
const CardSlot = memo(function CardSlot({ drama, purchasedSet, imagePriority }: CardSlotProps) {
  const kind = resolveContentKind(drama);
  const isSeries = kind === 'series';
  const isMovie = kind === 'movie';
  return (
    <div className="shrink-0 w-1/2 sm:w-1/3 md:w-1/4 lg:w-1/5 max-w-xs">
      <DramaCardCompact
        id={drama.id}
        title={drama.title}
        titleKh={drama.titleKh}
        episodes={drama.episodes}
        image={drama.image}
        priority={imagePriority}
        showWatchButton={isSeries}
        showMovieButton={isMovie}
        hasPurchased={isMovie ? purchasedSet.has(drama.id) : undefined}
        price={isMovie ? drama.price : undefined}
      />
    </div>
  );
});

export default function HomeContent({ featuredItems }: HomeContentProps) {
  const t = useTranslations('home');
  const { purchasedSet } = usePurchasedMovieIds();

  const { mostWatchedDramas, mustSeeDramas, trendingDramas } = useMemo(() => {
    const SECTION_SIZE = 6;
    const total = featuredItems.length;
    // Use non-overlapping windows when the catalogue is large enough.
    // Fall back to the first items when there aren't enough unique titles
    // so sections are never empty.
    const mostWatched = featuredItems.slice(0, SECTION_SIZE);
    const mustSee =
      total > SECTION_SIZE
        ? featuredItems.slice(SECTION_SIZE, SECTION_SIZE * 2)
        : mostWatched;
    const trending =
      total > SECTION_SIZE * 2
        ? featuredItems.slice(SECTION_SIZE * 2, SECTION_SIZE * 3)
        : mostWatched;
    return { mostWatchedDramas: mostWatched, mustSeeDramas: mustSee, trendingDramas: trending };
  }, [featuredItems]);

  const trendingNowLabel = t('trendingNow');
  const trendingSectionTitle = useMemo(
    () => (
      <span className="flex items-center gap-2">
        {trendingNowLabel} <FiTrendingUp className="text-brand-red" />
      </span>
    ),
    [trendingNowLabel],
  );

  if (featuredItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-6 px-4 pt-24">
        <h1 className="text-2xl font-bold text-gray-900">{t('noContent')}</h1>
        <p className="text-gray-400 text-center max-w-md">{t('noContentDesc')}</p>
        <Link href="/browse" className="text-brand-red hover:underline font-medium">{t('browseContent')}</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-24">
      {/* Promo Hero Section */}
      <section className="relative overflow-hidden pb-10 md:pb-14 mt-7">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-20 left-1/4 w-72 h-72 bg-brand-red/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 right-1/4 w-80 h-80 bg-accent-gold/10 rounded-full blur-3xl" />
        </div>
        <div className="container mx-auto px-4 md:px-8 relative z-10">
          <div className="bg-linear-to-br from-brand-red via-[#C4132E] to-[#921125] text-white p-6 md:p-10 shadow-2xl border border-white/10">
            <p className="inline-flex items-center gap-2 bg-white/15 border border-white/25 rounded-full px-3 py-1 text-xs md:text-sm font-semibold mb-4">
              <FiDollarSign className="text-sm" />
              {t('promoBadge')}
            </p>
            <h1 className="text-2xl md:text-4xl lg:text-5xl font-black leading-tight max-w-3xl">
              {t('promoTitle')} <span className="text-[#FFD166]">{t('promoHighlight')}</span>
            </h1>
            <p className="mt-4 text-sm md:text-base text-white/90 max-w-2xl leading-relaxed">
              {t('promoDesc')}
            </p>

            <div className="mt-6 grid sm:grid-cols-3 gap-3 max-w-3xl">
              <div className="bg-white/10 border border-white/20 rounded-xl p-3">
                <p className="text-xs text-white/80">{t('promoMovieDeal')}</p>
              </div>
              <div className="bg-white/10 border border-white/20 rounded-xl p-3">
                <p className="text-xs text-white/80">{t('promoSeriesMonthly')}</p>
              </div>
              <div className="bg-white/10 border border-white/20 rounded-xl p-3">
                <p className="text-xs text-white/80">{t('promoSeriesYearly')}</p>
              </div>
            </div>

            <div className="mt-7 flex flex-col sm:flex-row gap-3">
              <Link
                href="/browse"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold bg-white text-[#C4132E] hover:bg-white/90 transition-colors"
              >
                <FiCheckCircle />
                {t('promoPrimaryCta')}
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold bg-transparent border border-white/40 text-white hover:bg-white/10 transition-colors"
              >
                {t('promoSecondaryCta')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Most Watched Section */}
      <section className="py-12 md:py-16 bg-gray-50">
        <div className="container mx-auto px-4 md:px-8">
          <SectionHeader
            title={t('mostWatched')}
            viewAllHref="/browse?filter=most-watched"
            viewAllLabel={t('viewAll')}
          />
          <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
            <div className="flex gap-4 md:gap-6 pb-4">
              {mostWatchedDramas.map((drama, index) => (
                <CardSlot
                  key={drama.id}
                  drama={drama}
                  purchasedSet={purchasedSet}
                  imagePriority={index === 0}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Must-See Section */}
      <section className="py-12 md:py-16 bg-gray-100">
        <div className="container mx-auto px-4 md:px-8">
          <SectionHeader
            title={t('mustSee')}
            viewAllHref="/browse?filter=must-see"
            viewAllLabel={t('viewAll')}
            accentClass="bg-linear-to-b from-accent-gold to-brand-red"
          />
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
          <SectionHeader
            title={trendingSectionTitle}
            viewAllHref="/browse?filter=trending"
            viewAllLabel={t('viewAll')}
          />
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
      <section className="py-16 md:py-24 bg-linear-to-br from-gray-100 to-gray-50 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-red rounded-full blur-[150px]" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-brand-red rounded-full blur-[150px]" />
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
