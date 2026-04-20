'use client';

import { memo, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { FiTrendingUp, FiCheckCircle, FiDollarSign, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { useTranslations } from 'next-intl';
import DramaCardCompact from '@/components/drama/DramaCardCompact';
import SectionHeader from '@/components/shared/SectionHeader';
import { usePurchasedMovieIds } from '@/hooks/usePurchasedMovieIds';
import { resolveContentKind } from '@/lib/utils';
import type { FeaturedMovie } from '@/lib/movies';

type HomeContentProps = {
  featuredItems: FeaturedMovie[];
  promotionItems: FeaturedMovie[];
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

export default function HomeContent({ featuredItems, promotionItems }: HomeContentProps) {
  const t = useTranslations('home');
  const { purchasedSet } = usePurchasedMovieIds();
  const [activePromoIndex, setActivePromoIndex] = useState(0);

  const { mostWatchedDramas, mustSeeDramas, trendingDramas, singleMovies, dramaSeries, freeToWatch } = useMemo(() => {
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

    const singles = featuredItems
      .filter((item) => resolveContentKind(item) === 'movie')
      .slice(0, SECTION_SIZE);

    const series = featuredItems
      .filter((item) => resolveContentKind(item) === 'series')
      .slice(0, SECTION_SIZE);

    const free = featuredItems
      .filter((item) => {
        const kind = resolveContentKind(item);
        if (kind === 'movie') return item.price == null || item.price <= 0;
        return (item.freeEpisodesCount ?? 0) > 0;
      })
      .slice(0, SECTION_SIZE);

    return {
      mostWatchedDramas: mostWatched,
      mustSeeDramas: mustSee,
      trendingDramas: trending,
      singleMovies: singles.length ? singles : mostWatched,
      dramaSeries: series.length ? series : mustSee,
      freeToWatch: free.length ? free : trending,
    };
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

  const promoSlides = useMemo(() => {
    const staticSlide = {
      id: 'promo-static',
      title: `${t('promoTitle')} ${t('promoHighlight')}`,
      description: t('promoDesc'),
      ctaHref: '/browse',
      ctaLabel: t('promoPrimaryCta'),
      movieId: null as string | null,
      price: null as number | null,
      badge: t('promoBadge'),
      backgroundImage: null as string | null,
      backgroundImageSecondary: null as string | null,
      posterImage: null as string | null,
      year: '',
      genres: [] as string[],
      priceLabel: '',
      type: 'static' as const,
    };

    const movieSlides = promotionItems.map((movie) => ({
      id: `promo-movie-${movie.id}`,
      title: movie.titleKh ? `${movie.title} (${movie.titleKh})` : movie.title,
      description: movie.description || t('promoDesc'),
      ctaHref: `/drama/${movie.id}`,
      ctaLabel: t('watchNow'),
      movieId: movie.id,
      price: typeof movie.price === 'number' ? movie.price : null,
      badge: t('promoBadge'),
      backgroundImage: movie.bannerImage || null,
      backgroundImageSecondary: movie.image || null,
      posterImage: movie.image || null,
      year: movie.year || '',
      genres: movie.genres || [],
      priceLabel: typeof movie.price === 'number' && movie.price > 0 ? `$${movie.price.toFixed(2)}` : t('free'),
      type: 'movie' as const,
    }));

    return [staticSlide, ...movieSlides];
  }, [promotionItems, t]);

  useEffect(() => {
    if (promoSlides.length <= 1) return;
    const timer = window.setInterval(() => {
      setActivePromoIndex((prev) => (prev + 1) % promoSlides.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [promoSlides.length]);

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>('.reveal-on-scroll'));
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14, rootMargin: '0px 0px -8% 0px' }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  const promoSlideCount = promoSlides.length;
  const normalizedActivePromoIndex = promoSlideCount > 0
    ? activePromoIndex % promoSlideCount
    : 0;
  const activeSlide = promoSlides[normalizedActivePromoIndex];
  const isMovieSlide = activeSlide.type === 'movie';
  const isFreeMovieSlide = isMovieSlide && (activeSlide.price == null || activeSlide.price <= 0);
  const hasPurchasedMovieSlide = isMovieSlide && !!activeSlide.movieId && purchasedSet.has(activeSlide.movieId);
  const shouldWatchMovieSlide = isMovieSlide && (isFreeMovieSlide || hasPurchasedMovieSlide);
  const primaryCtaHref = isMovieSlide
    ? (shouldWatchMovieSlide ? `/drama/${activeSlide.movieId}/watch` : `/drama/${activeSlide.movieId}`)
    : activeSlide.ctaHref;
  const primaryCtaLabel = isMovieSlide
    ? (shouldWatchMovieSlide ? t('watchNow') : t('buyNow'))
    : activeSlide.ctaLabel;

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
          <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-brand-red via-[#C4132E] to-[#921125] text-white p-6 md:p-10 shadow-2xl border border-white/10 min-h-[560px] lg:h-[560px]">
            {activeSlide.backgroundImage && (
              <>
                <Image
                  src={activeSlide.backgroundImage}
                  alt={activeSlide.title}
                  fill
                  className="object-cover promo-bg-enter"
                  sizes="100vw"
                  priority
                />
                {activeSlide.backgroundImageSecondary && (
                  <Image
                    src={activeSlide.backgroundImageSecondary}
                    alt=""
                    fill
                    aria-hidden
                    className="object-cover scale-105 opacity-35 mix-blend-screen promo-bg-enter"
                    sizes="100vw"
                  />
                )}
                <div className="absolute inset-0 bg-linear-to-r from-black/85 via-black/70 to-black/60" />
              </>
            )}
            <div className="absolute inset-0 bg-linear-to-t from-black/45 via-black/15 to-transparent" />
            <div key={activeSlide.id} className="relative z-10 grid lg:grid-cols-[1fr_260px] gap-6 lg:gap-10 items-end h-full promo-content-enter">
              <div className="flex h-full flex-col">
                <div className="flex items-start justify-between gap-4">
                  <p className="inline-flex items-center gap-2 bg-white/15 border border-white/25 rounded-full px-3 py-1 text-xs md:text-sm font-semibold mb-4">
                    <FiDollarSign className="text-sm" />
                    {activeSlide.badge}
                  </p>
                  {promoSlideCount > 1 && (
                    <span className="rounded-full bg-black/25 border border-white/20 px-3 py-1 text-xs font-medium text-white/90">
                      {normalizedActivePromoIndex + 1} / {promoSlideCount}
                    </span>
                  )}
                </div>
                <h1 className="text-2xl md:text-4xl lg:text-5xl font-black leading-tight max-w-3xl line-clamp-2 min-h-15 md:min-h-22">
                  {activeSlide.type === 'static'
                    ? (<>{t('promoTitle')} <span className="text-[#FFD166]">{t('promoHighlight')}</span></>)
                    : activeSlide.title}
                </h1>
                <p className="mt-4 text-sm md:text-base text-white/90 max-w-2xl leading-relaxed line-clamp-3 min-h-15 md:min-h-18">
                  {activeSlide.description}
                </p>

                <div className="mt-4 flex min-h-8 flex-wrap items-center gap-2">
                  {isMovieSlide ? (
                    <>
                    {activeSlide.year && (
                      <span className="rounded-full bg-white/15 border border-white/25 px-2.5 py-1 text-xs font-medium">
                        {activeSlide.year}
                      </span>
                    )}
                    {activeSlide.priceLabel && (
                      <span className="rounded-full bg-accent-gold/90 text-gray-900 px-2.5 py-1 text-xs font-bold">
                        {activeSlide.priceLabel}
                      </span>
                    )}
                    {activeSlide.genres.slice(0, 3).map((genre) => (
                      <span key={genre} className="rounded-full bg-white/10 border border-white/20 px-2.5 py-1 text-xs">
                        {genre}
                      </span>
                    ))}
                    </>
                  ) : (
                    <span className="invisible rounded-full border px-2.5 py-1 text-xs">
                      placeholder
                    </span>
                  )}
                </div>

                <div className="mt-6 grid sm:grid-cols-3 gap-3 max-w-3xl">
                  <div className="bg-white/10 border border-white/20 rounded-xl p-3 backdrop-blur-sm">
                    <p className="text-xs text-white/80">{t('promoMovieDeal')}</p>
                  </div>
                  <div className="bg-white/10 border border-white/20 rounded-xl p-3 backdrop-blur-sm">
                    <p className="text-xs text-white/80">{t('promoSeriesMonthly')}</p>
                  </div>
                  <div className="bg-white/10 border border-white/20 rounded-xl p-3 backdrop-blur-sm">
                    <p className="text-xs text-white/80">{t('promoSeriesYearly')}</p>
                  </div>
                </div>

                <div className="mt-auto pt-7 flex flex-col sm:flex-row gap-3">
                  <Link
                    href={primaryCtaHref}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold bg-white text-[#C4132E] hover:bg-white/90 dark:!bg-white dark:!text-[#C4132E] dark:hover:!bg-white/90 transition-colors shadow-lg shadow-black/15"
                  >
                    <FiCheckCircle />
                    {primaryCtaLabel}
                  </Link>
                </div>
              </div>

              {activeSlide.posterImage && (
                <div className="hidden lg:block justify-self-end w-[240px] shrink-0 promo-poster-enter">
                  <div className="relative aspect-2/3 rounded-2xl overflow-hidden border border-white/20 shadow-2xl bg-black/20 backdrop-blur-sm">
                    <Image
                      src={activeSlide.posterImage}
                      alt={`${activeSlide.title} poster`}
                      fill
                      className="object-cover"
                      sizes="240px"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-black/45 via-transparent to-transparent" />
                  </div>
                </div>
              )}
            </div>

            {promoSlideCount > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setActivePromoIndex((prev) => (prev - 1 + promoSlideCount) % promoSlideCount)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-black/35 hover:bg-black/50 border border-white/20 flex items-center justify-center backdrop-blur-sm transition-colors"
                  aria-label="Previous promo slide"
                >
                  <FiChevronLeft />
                </button>
                <button
                  type="button"
                  onClick={() => setActivePromoIndex((prev) => (prev + 1) % promoSlideCount)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-black/35 hover:bg-black/50 border border-white/20 flex items-center justify-center backdrop-blur-sm transition-colors"
                  aria-label="Next promo slide"
                >
                  <FiChevronRight />
                </button>

                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded-full bg-black/25 border border-white/20 px-3 py-2 backdrop-blur-sm">
                  {promoSlides.map((slide, idx) => (
                    <button
                      key={slide.id}
                      type="button"
                      onClick={() => setActivePromoIndex(idx)}
                      className={`h-2.5 rounded-full transition-all ${idx === normalizedActivePromoIndex ? 'w-7 bg-white dark:!bg-white' : 'w-2.5 bg-white/45 hover:bg-white/80'}`}
                      aria-label={`Go to promo slide ${idx + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Most Watched Section */}
      <section className="py-12 md:py-16 bg-gray-50">
        <div className="container mx-auto px-4 md:px-8 reveal-on-scroll" style={{ ['--reveal-delay' as string]: '80ms' }}>
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
        <div className="container mx-auto px-4 md:px-8 reveal-on-scroll" style={{ ['--reveal-delay' as string]: '120ms' }}>
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
        <div className="container mx-auto px-4 md:px-8 reveal-on-scroll" style={{ ['--reveal-delay' as string]: '160ms' }}>
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

      {/* Single Movies Section */}
      <section className="py-12 md:py-16 bg-gray-100">
        <div className="container mx-auto px-4 md:px-8 reveal-on-scroll" style={{ ['--reveal-delay' as string]: '200ms' }}>
          <SectionHeader
            title={t('singleMovies')}
            viewAllHref="/browse?type=movie"
            viewAllLabel={t('viewAll')}
          />
          <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
            <div className="flex gap-4 md:gap-6 pb-4">
              {singleMovies.map((drama) => (
                <CardSlot key={drama.id} drama={drama} purchasedSet={purchasedSet} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Drama Series Section */}
      <section className="py-12 md:py-16 bg-gray-50">
        <div className="container mx-auto px-4 md:px-8 reveal-on-scroll" style={{ ['--reveal-delay' as string]: '240ms' }}>
          <SectionHeader
            title={t('dramaSeries')}
            viewAllHref="/browse?type=series"
            viewAllLabel={t('viewAll')}
          />
          <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
            <div className="flex gap-4 md:gap-6 pb-4">
              {dramaSeries.map((drama) => (
                <CardSlot key={drama.id} drama={drama} purchasedSet={purchasedSet} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Free To Watch Section */}
      <section className="py-12 md:py-16 bg-gray-100">
        <div className="container mx-auto px-4 md:px-8 reveal-on-scroll" style={{ ['--reveal-delay' as string]: '280ms' }}>
          <SectionHeader
            title={t('freeToWatch')}
            viewAllHref="/browse?access=free"
            viewAllLabel={t('viewAll')}
            accentClass="bg-linear-to-b from-accent-gold to-brand-red"
          />
          <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
            <div className="flex gap-4 md:gap-6 pb-4">
              {freeToWatch.map((drama) => (
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
      <style jsx>{`
        @keyframes promoBgEnter {
          from { opacity: 0.6; transform: scale(1.04); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes promoContentEnter {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes promoPosterEnter {
          from { opacity: 0; transform: translateX(10px) scale(0.98); }
          to { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes sectionEnter {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .promo-bg-enter {
          animation: promoBgEnter 700ms ease-out;
        }
        .promo-content-enter {
          animation: promoContentEnter 420ms ease-out;
        }
        .promo-poster-enter {
          animation: promoPosterEnter 480ms ease-out;
        }
        .reveal-on-scroll {
          opacity: 0;
          transform: translateY(14px);
        }
        .reveal-on-scroll.is-visible {
          animation: sectionEnter 550ms ease-out forwards;
          animation-delay: var(--reveal-delay, 0ms);
        }
        @media (prefers-reduced-motion: reduce) {
          .promo-bg-enter,
          .promo-content-enter,
          .promo-poster-enter,
          .reveal-on-scroll,
          .reveal-on-scroll.is-visible {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>
    </div>
  );
}
