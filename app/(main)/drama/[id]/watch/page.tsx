import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Suspense, cache } from 'react';
import {
  FiArrowLeft,
  FiFilm,
  FiClock,
  FiChevronRight,
  FiInfo,
  FiCalendar,
} from 'react-icons/fi';
import WatchRecommendations, {
  WatchRecommendationsSkeleton,
} from '@/components/watch/WatchRecommendations';
import WatchAccessGate from '@/components/watch/WatchAccessGate';
import { getMovieById } from '@/lib/movies';
import {
  isValidDramaId,
  parseWatchEpisodeParam,
  shouldNormalizeWatchSearchParams,
  watchPagePath,
} from '@/lib/watch-route';
import { getTranslations } from 'next-intl/server';

const getMovie = cache(getMovieById);

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? '';

type WatchPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ep?: string }>;
};

function absoluteUrl(pathOrUrl: string | undefined | null): string | undefined {
  if (!pathOrUrl) return undefined;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  try {
    return new URL(pathOrUrl, SITE_URL).toString();
  } catch {
    return undefined;
  }
}

export async function generateMetadata({
  params,
  searchParams,
}: WatchPageProps): Promise<Metadata> {
  const { id } = await params;
  const { ep: epRaw } = await searchParams;
  const t = await getTranslations('watch');

  if (!isValidDramaId(id)) {
    return {
      title: t('metadataNotFoundTitle'),
      description: t('metadataNotFoundDesc'),
    };
  }

  const drama = await getMovie(id);
  if (!drama) {
    return {
      title: t('metadataNotFoundTitle'),
      description: t('metadataNotFoundDesc'),
    };
  }

  const isSinglePart = drama.contentType === 'movie' || drama.totalEpisodes === 1;
  const episodeNum = parseWatchEpisodeParam(epRaw, {
    isSinglePart,
    totalEpisodes: drama.totalEpisodes,
  });

  const pageTitle = isSinglePart
    ? t('metadataMovieTitle', { title: drama.title })
    : t('metadataEpisodeTitle', { title: drama.title, num: episodeNum });

  const description =
    drama.description?.trim() || t('metadataDefaultDesc', { title: drama.title });

  const path = watchPagePath(id, episodeNum, isSinglePart);
  const url = absoluteUrl(path) ?? path;
  const image = absoluteUrl(drama.posterUrl || drama.bannerUrl);

  return {
    title: pageTitle,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'video.other',
      url,
      title: pageTitle,
      description,
      siteName: 'ReelTime Media',
      images: image
        ? [
            {
              url: image,
              alt: drama.title,
            },
          ]
        : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function WatchPage({ params, searchParams }: WatchPageProps) {
  const t = await getTranslations('watch');
  const { id } = await params;
  const { ep: epRaw } = await searchParams;

  if (!isValidDramaId(id)) notFound();

  const drama = await getMovie(id);
  if (!drama) notFound();

  const {
    title,
    totalEpisodes,
    contentType,
    freeEpisodesCount = 0,
    price,
    description,
    genres,
    releaseYear,
    rating,
    episodes,
  } = drama;

  const isSinglePart = contentType === 'movie' || totalEpisodes === 1;
  const episodeNum = parseWatchEpisodeParam(epRaw, {
    isSinglePart,
    totalEpisodes,
  });

  if (shouldNormalizeWatchSearchParams(epRaw, episodeNum, isSinglePart)) {
    redirect(watchPagePath(id, episodeNum, isSinglePart));
  }

  const isFreeMovie = contentType === 'movie' && (price == null || price === 0);
  const episodeList = isSinglePart ? [] : Array.from({ length: totalEpisodes }, (_, i) => i + 1);

  const currentEpisode =
    !isSinglePart && episodes.length
      ? episodes.find((e) => e.episodeNumber === episodeNum) ?? episodes[0]
      : episodes[0];

  const hasPrevEpisode = !isSinglePart && episodeNum > 1;
  const hasNextEpisode = !isSinglePart && episodeNum < totalEpisodes;

  const runtimeMinutes = currentEpisode?.duration
    ? Math.max(1, Math.round(currentEpisode.duration / 60))
    : undefined;

  const watchHref = (ep: number) => watchPagePath(id, ep, isSinglePart);

  return (
    <div className="min-h-screen bg-gray-50 pt-14 sm:pt-20">
      <div className="sticky top-14 sm:top-16 z-20 border-b border-gray-200 bg-white/95 backdrop-blur-md">
        <div className="container mx-auto px-3 sm:px-4 md:px-8 py-3 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-3 md:gap-4 min-w-0">
            <Link
              href={`/drama/${id}`}
              className="flex items-center justify-center w-10 h-10 sm:w-auto sm:h-auto shrink-0 rounded-full sm:rounded-full text-(--text-secondary) hover:text-(--primary-red) hover:bg-(--primary-red)/5 transition-colors sm:px-3 sm:py-2 sm:-ml-2"
              aria-label={t('ariaBackToDrama')}
            >
              <FiArrowLeft className="text-xl sm:text-lg" />
              <span className="hidden sm:inline ml-2 text-sm font-medium">{t('backToDrama')}</span>
            </Link>
            <span className="hidden md:inline w-px h-4 bg-(--dark-border) shrink-0" aria-hidden />
            <h1
              className="flex-1 min-w-0 text-sm sm:text-base md:text-lg font-bold text-gray-900 truncate"
              title={title}
            >
              {title}
            </h1>
            <span className="shrink-0 inline-flex items-center gap-1.5 sm:gap-2 rounded-full bg-(--primary-red)/10 text-(--primary-red) border border-(--primary-red)/30 px-2.5 py-1.5 sm:px-3 text-xs font-semibold uppercase tracking-wide">
              <FiFilm className="shrink-0 text-xs sm:text-sm" />{' '}
              {isSinglePart ? t('movieLabel') : t('episodeBadge', { num: episodeNum })}
            </span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-0 sm:px-4 md:px-8 py-4 sm:py-10 md:py-12">
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 lg:gap-10">
          <div className="flex-1 min-w-0 px-0 sm:px-0">
            <div className="rounded-none sm:rounded-2xl overflow-hidden shadow-xl glow-red ring-1 ring-black/5 bg-black">
              <WatchAccessGate
                contentId={id}
                contentType={contentType === 'series' ? 'series' : 'movie'}
                title={title}
                episodeNum={episodeNum}
                isSinglePart={isSinglePart}
                totalEpisodes={totalEpisodes}
                freeEpisodesCount={freeEpisodesCount}
                isFreeMovie={isFreeMovie}
              />
            </div>

            <div className="mt-3 sm:mt-4 space-y-3 sm:space-y-4">
              <div className="glass rounded-xl border border-gray-200 bg-white px-4 sm:px-5 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 shadow-sm">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] sm:text-xs uppercase tracking-[0.18em] text-(--text-muted) mb-1">
                    {t('nowPlaying')}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    {!isSinglePart && (
                      <span className="inline-flex items-center justify-center rounded-lg bg-(--primary-red) text-white text-[11px] font-semibold px-2.5 py-1">
                        {t('episodeBadge', { num: episodeNum })}
                      </span>
                    )}
                    <p className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 truncate">
                      {currentEpisode?.title || title}
                    </p>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] sm:text-xs text-gray-600">
                    {runtimeMinutes && (
                      <span className="inline-flex items-center gap-1">
                        <FiClock className="text-gray-400" /> {t('minutesShort', { n: runtimeMinutes })}
                      </span>
                    )}
                    {releaseYear && (
                      <span className="inline-flex items-center gap-1">
                        <FiCalendar className="text-gray-400" /> {releaseYear}
                      </span>
                    )}
                    {rating != null && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2 py-0.5 text-[11px]">
                        ⭐ {rating.toFixed(1)}/10
                      </span>
                    )}
                    {!!genres?.length && (
                      <span className="inline-flex flex-wrap gap-1 max-w-full">
                        {genres.slice(0, 2).map((g) => (
                          <span
                            key={g}
                            className="inline-flex items-center rounded-full bg-gray-100 border border-gray-200 px-2 py-0.5 text-[11px] text-gray-700"
                          >
                            {g}
                          </span>
                        ))}
                      </span>
                    )}
                  </div>
                </div>

                {!isSinglePart && (hasPrevEpisode || hasNextEpisode) && (
                  <div className="flex flex-row sm:flex-col gap-2 sm:gap-2 shrink-0">
                    {hasPrevEpisode && (
                      <Link
                        href={watchHref(episodeNum - 1)}
                        className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-xs sm:text-[11px] text-gray-700 hover:bg-gray-50 hover:border-gray-300 px-3 py-1.5 transition-colors"
                      >
                        {t('previousEpisode')}
                      </Link>
                    )}
                    {hasNextEpisode && (
                      <Link
                        href={watchHref(episodeNum + 1)}
                        className="inline-flex items-center justify-center rounded-lg bg-(--primary-red) text-xs sm:text-[11px] text-white hover:bg-(--primary-red)/90 px-3 py-1.5 transition-colors"
                      >
                        {t('nextEpisode')}
                        <FiChevronRight className="ml-1 text-xs" />
                      </Link>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-3 sm:space-y-4">
                <div className="rounded-xl border border-gray-200 bg-white px-4 sm:px-5 py-3 sm:py-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex h-6 w-1 rounded-full bg-(--primary-red)" />
                    <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                      <FiInfo className="text-(--primary-red)" />{' '}
                      {isSinglePart ? t('aboutMovie') : t('aboutSeries')}
                    </p>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-600 leading-relaxed line-clamp-3 sm:line-clamp-4">
                    {description || t('noDescription')}
                  </p>
                  <div className="mt-3 flex items-center justify-between text-[11px] sm:text-xs text-gray-400">
                    <span>{t('watchingOn')}</span>
                    <Link
                      href={`/drama/${id}`}
                      className="inline-flex items-center gap-1 text-(--primary-red) hover:text-(--primary-red)/80 font-medium"
                    >
                      {t('viewFullDetails')}
                      <FiChevronRight className="text-xs" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {!isSinglePart && totalEpisodes > 1 && (
            <aside className="lg:w-80 xl:w-72 shrink-0 px-3 sm:px-0">
              <div className="glass rounded-xl sm:rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden lg:sticky lg:top-32">
                <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-200 bg-(--primary-red)/5">
                  <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                    <span className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-(--primary-red) text-white shadow-md">
                      <FiFilm className="text-xs sm:text-sm" />
                    </span>
                    {t('episodesListTitle')}
                  </h2>
                  <p className="text-(--text-muted) text-xs sm:text-sm mt-0.5 sm:mt-1">
                    {totalEpisodes === 1
                      ? t('episodeTotalOne', { count: totalEpisodes })
                      : t('episodeTotalOther', { count: totalEpisodes })}
                  </p>
                </div>
                <div className="max-h-[45vh] sm:max-h-[50vh] lg:max-h-[calc(100vh-14rem)] overflow-y-auto scrollbar-hide">
                  <div className="flex flex-col gap-1 p-2 sm:p-3">
                    {episodeList.map((num) => {
                      const isActive = num === episodeNum;
                      return (
                        <Link
                          key={num}
                          href={watchHref(num)}
                          className={`
                            flex items-center gap-3 w-full px-4 py-3 rounded-lg sm:rounded-xl text-sm font-semibold transition-all duration-200 touch-manipulation border-l-4 sm:border-l-[6px]
                            ${isActive
                              ? 'bg-(--primary-red) text-white border-(--primary-red)'
                              : 'bg-gray-50 text-gray-700 border-transparent active:bg-(--primary-red)/10 active:text-(--primary-red) hover:bg-gray-100 hover:text-gray-900 hover:border-(--primary-red)/40'
                            }
                          `}
                        >
                          <span
                            className={`
                            flex items-center justify-center w-8 h-8 shrink-0 rounded-lg text-xs font-bold
                            ${isActive ? 'bg-white text-(--primary-red)' : 'bg-white text-(--text-secondary) border border-(--dark-border)'}
                          `}
                          >
                            {num}
                          </span>
                          <span className="flex-1 text-sm">{t('episodeNumbered', { num })}</span>
                          {currentEpisode?.episodeNumber === num && runtimeMinutes && (
                            <span className="text-[11px] text-gray-500">{runtimeMinutes}m</span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            </aside>
          )}
        </div>

        <Suspense fallback={<WatchRecommendationsSkeleton />}>
          <WatchRecommendations
            id={id}
            contentType={contentType ?? 'movie'}
            genres={genres ?? []}
          />
        </Suspense>
      </div>
    </div>
  );
}
