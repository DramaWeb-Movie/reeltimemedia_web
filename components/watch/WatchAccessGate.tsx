'use client';

import Link from 'next/link';
import { FiLock, FiPlay } from 'react-icons/fi';
import { usePaymentAccess } from '@/hooks/usePaymentAccess';
import Button from '@/components/ui/Button';
import { useTranslations } from 'next-intl';

interface WatchAccessGateProps {
  contentId: string;
  contentType: 'movie' | 'series';
  title: string;
  episodeNum?: number;
  isSinglePart: boolean;
  freeEpisodesCount?: number;
  /** When true, movie is free and anyone (including guests) can watch */
  isFreeMovie?: boolean;
}

export default function WatchAccessGate({
  contentId,
  contentType,
  title,
  episodeNum,
  isSinglePart,
  freeEpisodesCount = 0,
  isFreeMovie = false,
}: WatchAccessGateProps) {
  const t = useTranslations('watch');
  const currentEp = episodeNum ?? 1;
  const isFreeEpisode =
    contentType === 'series' && freeEpisodesCount > 0 && currentEp <= freeEpisodesCount;

  const { hasAccess, loading, isAuthenticated } = usePaymentAccess(
    contentType,
    contentType === 'movie' ? contentId : undefined,
    isFreeEpisode,
    isFreeMovie
  );

  if (loading) {
    return (
      <div className="rounded-2xl overflow-hidden bg-gray-100 border border-gray-200 shadow-sm flex items-center justify-center aspect-video">
        <div className="animate-pulse w-10 h-10 border-2 border-[#E31837] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!hasAccess) {
    const isMovie = contentType === 'movie';

    return (
      <div className="rounded-2xl overflow-hidden bg-white border border-gray-200 shadow-sm flex flex-col items-center justify-center aspect-video px-6 text-center">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-[#E31837]/10 mb-4">
          <FiLock className="text-[#E31837] text-2xl" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          {isMovie ? t('unlockMovie') : t('subscribeToWatch')}
        </h2>
        <p className="text-gray-500 text-sm max-w-md mb-4">
          {isMovie
            ? t('moviePayDesc')
            : freeEpisodesCount > 0
            ? t('episodeFreeRange', { count: freeEpisodesCount, ep: currentEp })
            : t('subscribeDesc')}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
          <Link href={isMovie ? `/drama/${contentId}` : '/pricing'}>
            <Button className="flex items-center gap-2" size="md">
              <FiPlay className="text-lg" /> {isMovie ? t('goToDetails') : t('viewPlans')}
            </Button>
          </Link>
          <p className="text-xs text-gray-400">
            {t('paidAccessNote', { item: isMovie ? t('thisMovie') : t('thisSeries') })}
          </p>
        </div>
      </div>
    );
  }

  // Stream URL: server verifies access and proxies video so the real URL is never exposed
  const streamUrl = `/api/watch/stream?contentId=${encodeURIComponent(contentId)}&ep=${currentEp}`;

  return (
    <div className="rounded-2xl overflow-hidden bg-gray-900 border border-gray-700 shadow-xl">
      <video
        className="w-full aspect-video"
        controls
        autoPlay
        playsInline
        preload="metadata"
        src={streamUrl}
        title={
          isSinglePart || !episodeNum
            ? title
            : `${title} - ${t('episode')} ${episodeNum.toString()}`
        }
      >
        {t('noVideoSupport')}
      </video>
    </div>
  );
}
