import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { FaStar } from 'react-icons/fa';
import { FiPlay, FiCalendar, FiFilm, FiUsers } from 'react-icons/fi';
import { cache } from 'react';
import { getMovieById, hasPurchasedContent } from '@/lib/movies';

// Deduplicate within a single render pass (generateMetadata + page component)
const getMovie = cache(getMovieById);
import { getYoutubeEmbedUrl } from '@/lib/youtube';
import DramaActionButtons from '@/components/drama/DramaActionButtons';
import { getTranslations } from 'next-intl/server';

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? '';

function absoluteUrl(url: string | undefined | null): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  try {
    return new URL(url, SITE_URL).toString();
  } catch {
    return undefined;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const drama = await getMovie(id);
  const t = await getTranslations('drama');

  if (!drama) {
    return {
      title: t('metadataNotFoundTitle'),
      description: t('metadataNotFoundDesc'),
    };
  }

  const title = drama.titleKh ? `${drama.title} (${drama.titleKh})` : drama.title;
  const description =
    drama.description?.trim() || t('metadataDefaultDesc', { title: drama.title });
  const url = absoluteUrl(`/drama/${id}`) ?? `/drama/${id}`;
  const image = absoluteUrl(drama.posterUrl || drama.bannerUrl);

  return {
    title: `${drama.title} - ReelTime Media`,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'video.movie',
      url,
      title,
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
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function DramaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const drama = await getMovie(id);
  const t = await getTranslations('drama');

  if (!drama) {
    notFound();
  }

  const trailerEmbedUrl = drama.trailerUrl ? getYoutubeEmbedUrl(drama.trailerUrl) : null;
  const isFreeMovie = drama.contentType === 'movie' && (drama.price == null || drama.price === 0);
  const isPaidMovie = drama.contentType === 'movie' && drama.price != null && drama.price > 0;

  const hasPurchasedMovie = isPaidMovie
    ? await hasPurchasedContent(id, 'movie')
    : false;

  const heroImage = drama.bannerUrl || drama.posterUrl;

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      {/* Hero: backdrop + overlay + content */}
      <section className="relative w-full min-h-[280px] md:min-h-[320px] lg:min-h-[380px]">
        <div className="absolute inset-0">
          <Image
            src={heroImage}
            alt=""
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-linear-to-t from-gray-900 via-gray-900/80 to-gray-900/40" />
        </div>
        <div className="container relative mx-auto px-4 md:px-8 pt-8 pb-10 flex flex-col md:flex-row md:items-end gap-6 md:gap-8">
          {/* Poster (visible in hero on larger screens) */}
          <div className="hidden md:block relative w-[140px] lg:w-[180px] shrink-0 rounded-xl overflow-hidden border-2 border-white/20 shadow-2xl aspect-2/3">
            <Image src={drama.posterUrl} alt={drama.title} fill className="object-cover" sizes="180px" />
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {isFreeMovie && (
                <span className="bg-[#FFB800] text-gray-900 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide">
                  {t('free')}
                </span>
              )}
              {drama.genres.map((genre) => (
                <span
                  key={genre}
                  className="bg-[#E31837]/90 text-white px-2.5 py-1 rounded-md text-xs font-medium"
                >
                  {genre}
                </span>
              ))}
            </div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-1 drop-shadow-sm">
              {drama.title}
            </h1>
            {drama.titleKh && (
              <p className="text-base md:text-lg text-gray-300 mb-4" lang="km">{drama.titleKh}</p>
            )}
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-300">
              {drama.rating != null && (
                <span className="flex items-center gap-1.5">
                  <FaStar className="text-[#FFB800]" /> {drama.rating.toFixed(1)}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <FiCalendar className="text-gray-400" /> {drama.releaseYear}
              </span>
              <span className="flex items-center gap-1.5">
                <FiFilm className="text-gray-400" />{' '}
                {drama.contentType === 'movie'
                  ? t('movie')
                  : t('episodesCount', { count: drama.totalEpisodes })}
              </span>
              <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                drama.status === 'completed'
                  ? 'bg-green-500/20 text-green-300 border border-green-500/40'
                  : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
              }`}>
                {drama.status === 'completed' ? t('completed') : t('ongoing')}
              </span>
            </div>
            {/* Action buttons in hero (desktop/tablet only) */}
            <div className="mt-5 hidden md:flex flex-wrap gap-3">
              <DramaActionButtons
                id={id}
                drama={drama}
                isFreeMovie={isFreeMovie}
                hasPurchasedMovie={hasPurchasedMovie}
                variant="hero"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Main content: poster (mobile) + trailer, overview, episodes, cast */}
      <div className="container mx-auto px-4 md:px-8 py-8 md:py-10">
        {/* Poster + primary CTA on mobile (desktop hero already has CTAs) */}
        <div className="md:hidden mb-8 -mt-24 relative z-10 mx-auto w-[200px] rounded-xl overflow-hidden shadow-xl">
          <div className="relative aspect-2/3 border-2 border-white">
            <Image src={drama.posterUrl} alt={drama.title} fill className="object-cover" sizes="200px" />
          </div>
          <div className="mt-4 space-y-2">
            <DramaActionButtons
              id={id}
              drama={drama}
              isFreeMovie={isFreeMovie}
              hasPurchasedMovie={hasPurchasedMovie}
            />
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left: sticky poster + Watch Now (desktop) */}
          <div className="hidden lg:block lg:col-span-1 order-first">
            <div className="sticky top-24">
              <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-white">
                <div className="relative aspect-2/3 w-full">
                  <Image src={drama.posterUrl} alt={drama.title} fill className="object-cover" sizes="320px" />
                </div>
                <div className="p-4 space-y-3">
                  <DramaActionButtons
                    id={id}
                    drama={drama}
                    isFreeMovie={isFreeMovie}
                    hasPurchasedMovie={hasPurchasedMovie}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right: Trailer, Overview, Episodes, Cast */}
          <div className="lg:col-span-2 space-y-8">
            {/* Trailer */}
            {trailerEmbedUrl && (
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-1 h-8 bg-[#E31837] rounded-full" />
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <FiPlay className="text-[#E31837]" /> {t('trailer')}
                  </h2>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="relative w-full aspect-video bg-black">
                    <iframe
                      src={`${trailerEmbedUrl}?rel=0`}
                      title={`${drama.title} trailer`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      className="absolute inset-0 w-full h-full"
                    />
                  </div>
                </div>
              </section>
            )}

            {/* Overview */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-8 bg-[#E31837] rounded-full" />
                <h2 className="text-xl font-bold text-gray-900">{t('overview')}</h2>
              </div>
              <div className="bg-white rounded-xl p-5 md:p-6 border border-gray-200 shadow-sm">
                <p className="text-gray-600 text-sm md:text-base leading-relaxed">{drama.description}</p>
              </div>
            </section>

            {/* Episodes */}
            {drama.contentType === 'series' && (
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-1 h-8 bg-[#E31837] rounded-full" />
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <FiFilm className="text-[#E31837]" /> {t('episodes')}
                  </h2>
                </div>
                <div className="bg-white rounded-xl p-5 md:p-6 border border-gray-200 shadow-sm">
                  <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2">
                    {Array.from({ length: drama.totalEpisodes }, (_, i) => (
                      <Link
                        key={i + 1}
                        href={`/drama/${id}/watch?ep=${i + 1}`}
                        className="aspect-square flex items-center justify-center rounded-lg bg-gray-100 border border-gray-200 text-gray-900 font-semibold text-sm hover:bg-[#E31837] hover:text-white hover:border-[#E31837] transition-all"
                      >
                        {i + 1}
                      </Link>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Cast */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-8 bg-[#E31837] rounded-full" />
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <FiUsers className="text-[#E31837]" /> {t('cast')}
                </h2>
              </div>
              <div className="bg-white rounded-xl p-5 md:p-6 border border-gray-200 shadow-sm">
                {drama.cast.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {drama.cast.map((member) => (
                      <div key={member.id} className="text-center group">
                        <div className="relative w-16 h-16 mx-auto mb-2 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200 group-hover:border-[#E31837] transition-colors flex items-center justify-center">
                          {member.imageUrl ? (
                            <Image
                              src={member.imageUrl}
                              alt={member.name}
                              fill
                              className="object-cover"
                              sizes="64px"
                            />
                          ) : (
                            <span className="text-lg font-bold text-gray-400">
                              {member.name.slice(0, 1).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <p className="font-semibold text-gray-900 text-sm truncate" title={member.name}>{member.name}</p>
                        {member.role && <p className="text-xs text-gray-500 truncate" title={member.role}>{member.role}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">{t('noCastInfo')}</p>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
