'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FiLock, FiPlay, FiRefreshCw } from 'react-icons/fi';
import { usePaymentAccess } from '@/hooks/usePaymentAccess';
import Button from '@/components/ui/Button';
import { useTranslations } from 'next-intl';
import HlsPlayer from '@/components/watch/HlsPlayer';

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
  const [hlsManifestUrl, setHlsManifestUrl] = useState<string | null>(null);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionError, setSessionError] = useState(false);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastErrorRetryAtRef = useRef(0);
  const errorRetryInFlightRef = useRef(false);

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
          hlsManifestUrl?: string;
          expiresInSeconds?: number;
          error?: string;
        } | null;

        if (!res.ok || !data?.playbackUrl) {
          setPlaybackUrl(null);
          setHlsManifestUrl(null);
          setSessionError(true);
          return { ok: false as const, expiresInSeconds: 0 };
        }

        setPlaybackUrl(data.playbackUrl);
        setHlsManifestUrl(data.hlsManifestUrl ?? null);
        setSessionError(false);
        const expiresInSeconds =
          typeof data.expiresInSeconds === 'number' && data.expiresInSeconds > 0
            ? data.expiresInSeconds
            : 900;
        return { ok: true as const, expiresInSeconds };
      } catch {
        setPlaybackUrl(null);
        setHlsManifestUrl(null);
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
      // Refresh at 72% of the token lifetime, minimum 15s
      const delay = Math.max(15_000, expiresInSeconds * 1000 * 0.72);
      refreshTimerRef.current = setTimeout(async () => {
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
      setHlsManifestUrl(null);
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

  const handleVideoError = useCallback(() => {
    if (sessionLoading) return;
    if (errorRetryInFlightRef.current) return;
    const now = Date.now();
    // Avoid request storms when the browser emits repeated media errors.
    if (now - lastErrorRetryAtRef.current < 4000) return;
    lastErrorRetryAtRef.current = now;
    errorRetryInFlightRef.current = true;
    void (async () => {
      try {
        const result = await fetchPlaybackSession({ afterError: true });
        if (result.ok) {
          scheduleProactiveRefresh(result.expiresInSeconds);
        }
      } finally {
        errorRetryInFlightRef.current = false;
      }
    })();
  }, [fetchPlaybackSession, scheduleProactiveRefresh, sessionLoading]);

  if (loading) {
    return (
      <div className="rounded-2xl overflow-hidden bg-gray-100 border border-gray-200 shadow-sm flex items-center justify-center aspect-video">
        <div className="animate-pulse w-10 h-10 border-2 border-brand-red border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!hasAccess) {
    const isMovie = contentType === 'movie';

    return (
      <div className="rounded-2xl overflow-hidden bg-white border border-gray-200 shadow-sm flex flex-col items-center justify-center aspect-video px-6 text-center">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-brand-red/10 mb-4">
          <FiLock className="text-brand-red text-2xl" />
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

  if (sessionError && !playbackUrl && !hlsManifestUrl && !sessionLoading) {
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

  const videoTitle = isSinglePart || !episodeNum
    ? title
    : `${title} - ${t('episode')} ${episodeNum.toString()}`;

  return (
    <div className="rounded-2xl overflow-hidden bg-gray-900 border border-gray-700 shadow-xl relative">
      {sessionLoading && !playbackUrl && !hlsManifestUrl && (
        <div className="flex items-center justify-center aspect-video bg-black/40">
          <div className="animate-pulse w-10 h-10 border-2 border-white border-t-transparent rounded-full" />
        </div>
      )}
      {(playbackUrl || hlsManifestUrl) && (
        <HlsPlayer
          manifestUrl={hlsManifestUrl}
          fallbackUrl={playbackUrl}
          title={videoTitle}
          autoPlay
          onError={handleVideoError}
        />
      )}
    </div>
  );
}
