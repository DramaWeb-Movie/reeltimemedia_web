'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FiLock, FiPlay, FiRefreshCw } from 'react-icons/fi';
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

  const { hasAccess, loading } = usePaymentAccess(
    contentType,
    contentType === 'movie' ? contentId : undefined,
    isFreeEpisode,
    isFreeMovie
  );

  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionError, setSessionError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const resumeTimeRef = useRef(0);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const fetchPlaybackSession = useCallback(
    async (opts?: { afterError?: boolean }) => {
      setSessionLoading(true);
      if (!opts?.afterError) {
        setSessionError(false);
      }
      try {
        const res = await fetch('/api/watch/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ contentId, ep: currentEp }),
        });
        const data = (await res.json().catch(() => null)) as {
          playbackUrl?: string;
          expiresInSeconds?: number;
          error?: string;
        } | null;

        if (!res.ok || !data?.playbackUrl) {
          setPlaybackUrl(null);
          setSessionError(true);
          return { ok: false as const, expiresInSeconds: 0 };
        }

        const v = videoRef.current;
        if (v && v.paused && !v.ended && v.currentTime > 0.5) {
          resumeTimeRef.current = v.currentTime;
        }

        setPlaybackUrl(data.playbackUrl);
        setSessionError(false);
        const expiresInSeconds =
          typeof data.expiresInSeconds === 'number' && data.expiresInSeconds > 0
            ? data.expiresInSeconds
            : 900;
        return { ok: true as const, expiresInSeconds };
      } catch {
        setPlaybackUrl(null);
        setSessionError(true);
        return { ok: false as const, expiresInSeconds: 0 };
      } finally {
        setSessionLoading(false);
      }
    },
    [contentId, currentEp]
  );

  const scheduleProactiveRefresh = useCallback(
    (expiresInSeconds: number) => {
      clearRefreshTimer();
      const delay = Math.max(15_000, expiresInSeconds * 1000 * 0.72);
      refreshTimerRef.current = setTimeout(async () => {
        const v = videoRef.current;
        if (v && !v.paused && !v.ended) {
          scheduleProactiveRefresh(Math.min(120, expiresInSeconds * 0.25));
          return;
        }
        const result = await fetchPlaybackSession();
        if (result.ok) {
          scheduleProactiveRefresh(result.expiresInSeconds);
        }
      }, delay);
    },
    [clearRefreshTimer, fetchPlaybackSession]
  );

  useEffect(() => {
    if (!hasAccess) {
      setPlaybackUrl(null);
      setSessionError(false);
      clearRefreshTimer();
      return;
    }
    let cancelled = false;
    (async () => {
      const result = await fetchPlaybackSession();
      if (cancelled) return;
      if (result.ok) {
        scheduleProactiveRefresh(result.expiresInSeconds);
      }
    })();
    return () => {
      cancelled = true;
      clearRefreshTimer();
    };
  }, [hasAccess, contentId, currentEp, fetchPlaybackSession, scheduleProactiveRefresh, clearRefreshTimer]);

  useEffect(() => {
    if (!playbackUrl || !videoRef.current) return;
    const v = videoRef.current;
    const tRestore = resumeTimeRef.current;
    const onMeta = () => {
      if (tRestore > 0.5) {
        v.currentTime = tRestore;
      }
      resumeTimeRef.current = 0;
    };
    v.addEventListener('loadedmetadata', onMeta, { once: true });
    return () => v.removeEventListener('loadedmetadata', onMeta);
  }, [playbackUrl]);

  const handleVideoError = useCallback(() => {
    resumeTimeRef.current = videoRef.current?.currentTime ?? 0;
    void (async () => {
      const result = await fetchPlaybackSession({ afterError: true });
      if (result.ok) {
        scheduleProactiveRefresh(result.expiresInSeconds);
      }
    })();
  }, [fetchPlaybackSession, scheduleProactiveRefresh]);

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

  if (sessionError && !playbackUrl && !sessionLoading) {
    return (
      <div className="rounded-2xl overflow-hidden bg-white border border-gray-200 shadow-sm flex flex-col items-center justify-center aspect-video px-6 text-center">
        <p className="text-gray-600 text-sm mb-4 max-w-md">{t('sessionFailed')}</p>
        <Button
          type="button"
          className="flex items-center gap-2"
          size="md"
          onClick={() => void fetchPlaybackSession()}
        >
          <FiRefreshCw className="text-lg" /> {t('resumePlayback')}
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden bg-gray-900 border border-gray-700 shadow-xl relative">
      {sessionLoading && !playbackUrl && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40">
          <div className="animate-pulse w-10 h-10 border-2 border-white border-t-transparent rounded-full" />
        </div>
      )}
      <video
        ref={videoRef}
        className="w-full aspect-video"
        controls
        autoPlay
        playsInline
        preload="metadata"
        src={playbackUrl ?? undefined}
        onError={handleVideoError}
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
