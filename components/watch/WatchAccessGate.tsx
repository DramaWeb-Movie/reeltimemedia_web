'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FiLock, FiPlay, FiRefreshCw } from 'react-icons/fi';
import Button from '@/components/ui/Button';
import { useTranslations } from 'next-intl';
import HlsPlayer from '@/components/watch/HlsPlayer';

interface WatchAccessGateProps {
  contentId: string;
  contentType: 'movie' | 'series';
  title: string;
  episodeNum?: number;
  isSinglePart: boolean;
  totalEpisodes?: number;
  poster?: string;
  freeEpisodesCount?: number;
  /** When true, movie is free and anyone (including guests) can watch */
  isFreeMovie?: boolean;
}

type SessionData = { playbackUrl: string; hlsManifestUrl?: string; expiresInSeconds: number };

export default function WatchAccessGate({
  contentId,
  contentType,
  title,
  episodeNum,
  isSinglePart,
  totalEpisodes,
  poster,
  freeEpisodesCount = 0,
  isFreeMovie = false,
}: WatchAccessGateProps) {
  const t = useTranslations('watch');
  const currentEp = episodeNum ?? 1;
  const isFreeEpisode =
    contentType === 'series' && freeEpisodesCount > 0 && currentEp <= freeEpisodesCount;

  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [hlsManifestUrl, setHlsManifestUrl] = useState<string | null>(null);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionError, setSessionError] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [deniedByAuth, setDeniedByAuth] = useState(false);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastErrorRetryAtRef = useRef(0);
  const errorRetryInFlightRef = useRef(false);
  // Prefetched sessions keyed by episode number — populated while current ep plays
  const prefetchCacheRef = useRef<Map<number, SessionData>>(new Map());

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const fetchSessionForEp = useCallback(
    async (ep: number): Promise<SessionData | null> => {
      try {
        const res = await fetch('/api/watch/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ contentId, ep }),
        });
        const data = (await res.json().catch(() => null)) as {
          playbackUrl?: string;
          hlsManifestUrl?: string;
          expiresInSeconds?: number;
        } | null;
        if (!res.ok || !data?.playbackUrl) return null;
        return {
          playbackUrl: data.playbackUrl,
          hlsManifestUrl: data.hlsManifestUrl,
          expiresInSeconds: typeof data.expiresInSeconds === 'number' && data.expiresInSeconds > 0
            ? data.expiresInSeconds : 900,
        };
      } catch {
        return null;
      }
    },
    [contentId]
  );

  const prefetchNextEpisode = useCallback(
    (currentEpNum: number) => {
      if (isSinglePart) return;
      const nextEp = currentEpNum + 1;
      if (totalEpisodes && nextEp > totalEpisodes) return;
      if (prefetchCacheRef.current.has(nextEp)) return;
      // Fire-and-forget: cache the session and warm the HLS manifest cache
      void fetchSessionForEp(nextEp).then((data) => {
        if (!data) return;
        prefetchCacheRef.current.set(nextEp, data);
        // Fetching the manifest URL populates resolveAdaptiveManifestUrl's unstable_cache
        // so the next episode's manifest is served instantly when the user navigates.
        if (data.hlsManifestUrl) {
          void fetch(data.hlsManifestUrl, { credentials: 'include' }).catch(() => null);
        }
      });
    },
    [isSinglePart, totalEpisodes, fetchSessionForEp]
  );

  const fetchPlaybackSession = useCallback(
    async (opts?: { afterError?: boolean }) => {
      // Use prefetched session if available (skips network round-trip)
      const cached = !opts?.afterError ? prefetchCacheRef.current.get(currentEp) : undefined;
      if (cached) {
        prefetchCacheRef.current.delete(currentEp);
        setPlaybackUrl(cached.playbackUrl);
        setHlsManifestUrl(cached.hlsManifestUrl ?? null);
        setSessionError(false);
        setAccessDenied(false);
        setDeniedByAuth(false);
        return { ok: true as const, expiresInSeconds: cached.expiresInSeconds, denied: false as const };
      }

      setSessionLoading(true);
      if (!opts?.afterError) setSessionError(false);
      try {
        const data = await fetchSessionForEp(currentEp);
        if (!data) {
          // Re-fetch to get the proper status code for error classification
          const res = await fetch('/api/watch/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ contentId, ep: currentEp }),
          });
          setPlaybackUrl(null);
          setHlsManifestUrl(null);
          const denied = res.status === 401 || res.status === 403;
          setAccessDenied(denied);
          setDeniedByAuth(res.status === 401);
          setSessionError(!denied);
          return { ok: false as const, expiresInSeconds: 0, denied };
        }
        setPlaybackUrl(data.playbackUrl);
        setHlsManifestUrl(data.hlsManifestUrl ?? null);
        setSessionError(false);
        setAccessDenied(false);
        setDeniedByAuth(false);
        return { ok: true as const, expiresInSeconds: data.expiresInSeconds, denied: false as const };
      } catch {
        setPlaybackUrl(null);
        setHlsManifestUrl(null);
        setSessionError(true);
        return { ok: false as const, expiresInSeconds: 0, denied: false as const };
      } finally {
        setSessionLoading(false);
      }
    },
    [contentId, currentEp, fetchSessionForEp]
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
    let cancelled = false;
    (async () => {
      const result = await fetchPlaybackSession();
      if (cancelled) return;
      if (result.ok) {
        scheduleProactiveRefresh(result.expiresInSeconds);
        prefetchNextEpisode(currentEp);
      }
    })();
    return () => {
      cancelled = true;
      clearRefreshTimer();
    };
  }, [
    contentId,
    currentEp,
    fetchPlaybackSession,
    scheduleProactiveRefresh,
    clearRefreshTimer,
    prefetchNextEpisode,
    contentType,
    isFreeEpisode,
    isFreeMovie,
  ]);

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

  if (accessDenied) {
    const isMovie = contentType === 'movie';

    return (
      <div className="overflow-hidden bg-white border border-gray-200 shadow-sm flex flex-col items-center justify-center aspect-video px-6 text-center">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-brand-red/10 mb-4">
          <FiLock className="text-brand-red text-2xl" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          {isMovie ? t('unlockMovie') : t('subscribeToWatch')}
        </h2>
        <p className="text-gray-500 text-sm max-w-md mb-4">
          {deniedByAuth
            ? (isMovie ? t('moviePayDesc') : t('subscribeDesc'))
            : isMovie
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
      <div className="overflow-hidden bg-white border border-gray-200 shadow-sm flex flex-col items-center justify-center aspect-video px-6 text-center">
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
    <div className="overflow-hidden bg-black relative">
      <HlsPlayer
        key={`${hlsManifestUrl ?? 'manifest:none'}|${playbackUrl ?? 'fallback:none'}`}
        manifestUrl={hlsManifestUrl}
        fallbackUrl={playbackUrl}
        poster={poster}
        title={videoTitle}
        autoPlay
        isLoading={sessionLoading && !playbackUrl && !hlsManifestUrl}
        onError={handleVideoError}
      />
    </div>
  );
}
