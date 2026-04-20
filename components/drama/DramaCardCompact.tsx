'use client';

import { isMoviePriceFree } from '@/lib/catalog/pricing';
import { memo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FiPlay } from 'react-icons/fi';
import { useTranslations } from 'next-intl';

interface DramaCardCompactProps {
  id: string;
  title: string;
  titleKh?: string;
  episodes: number;
  image: string;
  /** Prefer true for the first above-the-fold poster to improve LCP */
  priority?: boolean;
  showWatchButton?: boolean;
  /** For movie cards: show Watch if purchased, else show price / pay */
  showMovieButton?: boolean;
  hasPurchased?: boolean;
  /** Price (USD) for movie — shown on button when not purchased */
  price?: number;
}

const DramaCardCompact = memo(function DramaCardCompact({ id, title, titleKh, episodes, image, priority, showWatchButton, showMovieButton, hasPurchased, price }: DramaCardCompactProps) {
  const t = useTranslations('watch');
  const tMovies = useTranslations('movies');
  const watchHref = episodes > 1 ? `/drama/${id}/watch?ep=1` : `/drama/${id}/watch`;

  const isFreeMovie = showMovieButton && isMoviePriceFree(price);
  const showButton = showWatchButton || showMovieButton;
  const isWatch = showWatchButton || (showMovieButton && (hasPurchased || isFreeMovie));
  const buttonHref = isWatch ? watchHref : `/drama/${id}`;
  const buttonLabel = isWatch
    ? t('watchNow')
    : (price != null && price > 0 ? tMovies('priceFormat', { value: price.toFixed(2) }) : tMovies('payPerMovie'));

  return (
    <div className="group block h-full">
      <div className="bg-white rounded-xl overflow-hidden card-hover border border-gray-200 shadow-sm flex flex-col h-full">
        <Link href={`/drama/${id}`} className="flex-1 flex flex-col min-h-0">
          <div className="relative aspect-[2/3] shrink-0">
            <Image
              src={image}
              alt={title}
              fill
              priority={priority}
              className="object-cover"
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
            />
            {/* Gradient Overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            {/* Free badge (movies only) */}
            {isFreeMovie && (
              <div className="absolute top-3 right-3 bg-accent-gold text-gray-900 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide shadow-sm">
                {tMovies('free')}
              </div>
            )}

            {/* Episode Badge */}
            <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm text-white px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5">
              <FiPlay className="text-[10px]" />{' '}
              {episodes === 1 ? tMovies('singleMovie') : tMovies('episodesShort', { count: episodes })}
            </div>

            {/* Play affordance — always visible on touch devices, hover reveal on pointer/mouse */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 touch-show transition-all duration-300">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-brand-red/90 backdrop-blur-sm flex items-center justify-center transform scale-90 group-hover:scale-100 transition-transform duration-300 shadow-lg">
                <FiPlay className="text-white text-lg ml-0.5" />
              </div>
            </div>
          </div>
          <div className="p-3 min-h-[4.5rem] flex flex-col shrink-0">
            <h3 className="font-semibold text-sm line-clamp-2 text-gray-900 group-hover:text-brand-red transition-colors">
              {title}
            </h3>
            <p className={`text-xs text-gray-500 mt-0.5 line-clamp-2 ${!titleKh ? 'invisible' : ''}`} lang="km" aria-hidden={!titleKh}>
              {titleKh || '\u00A0'}
            </p>
          </div>
        </Link>
        {showButton && (
          <div className="px-3 pb-3 shrink-0">
            <Link
              href={buttonHref}
              className="mt-2 inline-flex items-center justify-center gap-1.5 w-full py-2 rounded-lg bg-brand-red text-white text-xs font-semibold hover:bg-brand-red-dark transition-colors"
            >
              <FiPlay className="text-[10px]" /> {buttonLabel}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
});

export default DramaCardCompact;
