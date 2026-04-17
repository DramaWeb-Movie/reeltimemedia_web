'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { useTranslations } from 'next-intl';

interface HlsPlayerProps {
  /** HLS master manifest URL — used when transcoding is complete */
  manifestUrl?: string | null;
  /** Plain video URL — used as fallback when no HLS manifest is available */
  fallbackUrl?: string | null;
  poster?: string;
  title?: string;
  autoPlay?: boolean;
  onError?: () => void;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function levelLabel(level: { height?: number; width?: number; bitrate?: number }, index: number): string {
  if (level.height && level.height > 0) return `${level.height}p`;
  if (level.width && level.width > 0) return `${level.width}w`;
  const kbps = Math.round((level.bitrate ?? 0) / 1000);
  if (kbps > 0) return `${kbps} kbps`;
  return `Level ${index + 1}`;
}

type QualityMode = 'idle' | 'hls-multi' | 'hls-single' | 'native' | 'progressive';

export default function HlsPlayer({
  manifestUrl,
  fallbackUrl,
  poster,
  title,
  autoPlay = true,
  onError,
}: HlsPlayerProps) {
  const t = useTranslations('watch');
  const playerRef = useRef<HTMLDivElement | null>(null);
  const qualityWrapRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seekBarRef = useRef<HTMLDivElement | null>(null);
  const isSeekingRef = useRef(false);
  const lastTimeRef = useRef(0);

  const [qualityMode, setQualityMode] = useState<QualityMode>('idle');
  const [qualityLevels, setQualityLevels] = useState<{ index: number; label: string }[]>([]);
  const [selectedQuality, setSelectedQuality] = useState<string>('auto');
  const [autoStreamLabel, setAutoStreamLabel] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isBuffering, setIsBuffering] = useState(() => Boolean(manifestUrl || fallbackUrl));
  const [bufferedPct, setBufferedPct] = useState(0);
  const [showBufferingSpinner, setShowBufferingSpinner] = useState(false);

  // Debounce mid-play buffering spinner — prevents flicker on fast seeks/mobile stall events
  useEffect(() => {
    const shouldShow = isPlayerReady && isBuffering;
    if (!shouldShow) { setShowBufferingSpinner(false); return; }
    const id = setTimeout(() => setShowBufferingSpinner(true), 400);
    return () => clearTimeout(id);
  }, [isPlayerReady, isBuffering]);

  const scheduleQualityModeReset = useCallback((mode: QualityMode) => {
    queueMicrotask(() => {
      setQualityLevels([]);
      setSelectedQuality('auto');
      setAutoStreamLabel(null);
      setQualityMode(mode);
    });
  }, []);


  const keepControlsVisible = useCallback(() => {
    setShowControls(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (isPlaying) {
      hideTimerRef.current = setTimeout(() => {
        setShowControls(false);
        setShowQualityMenu(false);
      }, 2500);
    }
  }, [isPlaying]);

  useEffect(() => {
    if (!showQualityMenu) return;
    const onPointerDown = (e: PointerEvent) => {
      const el = qualityWrapRef.current;
      if (el && e.target instanceof Node && el.contains(e.target)) return;
      setShowQualityMenu(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [showQualityMenu]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    hlsRef.current?.destroy();
    hlsRef.current = null;
    video.removeAttribute('src');
    video.load();

    if (manifestUrl && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        // Start at lowest quality so slow connections begin playing immediately
        startLevel: -1,
        abrEwmaDefaultEstimate: 500_000, // assume 500 kbps until measured
        // Buffer aggressively so brief connection drops don't stall playback
        maxBufferLength: 60,
        maxMaxBufferLength: 120,
        // Give more time for slow connections to fetch fragments and manifests
        fragLoadingTimeOut: 30_000,
        manifestLoadingTimeOut: 20_000,
        levelLoadingTimeOut: 20_000,
        fragLoadingMaxRetry: 4,
        fragLoadingRetryDelay: 1_000,
      });
      hlsRef.current = hls;
      hls.attachMedia(video);

      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        setQualityLevels([]);
        setSelectedQuality('auto');
        setAutoStreamLabel(null);
        setQualityMode('idle');
        hls.loadSource(manifestUrl);
      });

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        const levels = hls.levels;
        const withIndex = levels.map((level, index) => ({
          index,
          level,
          label: levelLabel(level, index),
        }));
        withIndex.sort(
          (a, b) =>
            (b.level.height ?? 0) - (a.level.height ?? 0) ||
            (b.level.bitrate ?? 0) - (a.level.bitrate ?? 0)
        );
        const sorted = withIndex.map(({ index, label }) => ({ index, label }));
        setQualityLevels(sorted);
        setQualityMode(levels.length > 1 ? 'hls-multi' : 'hls-single');
        if (autoPlay) void video.play().catch(() => null);
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_evt, data) => {
        const lvl = hls.levels[data.level];
        if (lvl) setAutoStreamLabel(levelLabel(lvl, data.level));
      });

      hls.on(Hls.Events.ERROR, (_evt, data) => {
        if (!data.fatal) return;
        hls.destroy();
        hlsRef.current = null;
        if (fallbackUrl) {
          setIsPlayerReady(false);
          setIsBuffering(true);
          video.src = fallbackUrl;
          setQualityMode('progressive');
          return;
        }
        onError?.();
      });

      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    }

    if (manifestUrl && video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = manifestUrl;
      scheduleQualityModeReset('native');
      if (autoPlay) void video.play().catch(() => null);
      return;
    }

    if (fallbackUrl) {
      video.src = fallbackUrl;
      scheduleQualityModeReset('progressive');
      if (autoPlay) void video.play().catch(() => null);
    }
  }, [manifestUrl, fallbackUrl, autoPlay, onError, scheduleQualityModeReset]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => {
      const t = video.currentTime || 0;
      setCurrentTime(t);
      // If time is advancing the video is actually playing — clear buffering state
      if (!video.paused && t > lastTimeRef.current) {
        lastTimeRef.current = t;
        setIsBuffering(false);
      }
    };
    const onLoadedMetadata = () => setDuration(video.duration || 0);
    const onProgress = () => {
      const d = video.duration;
      if (!d || !video.buffered.length) return;
      setBufferedPct((video.buffered.end(video.buffered.length - 1) / d) * 100);
    };
    const onLoadedData = () => {
      setIsPlayerReady(true);
      setIsBuffering(false);
    };
    const onCanPlay = () => {
      setIsPlayerReady(true);
      setIsBuffering(false);
    };
    const onPlay = () => {
      setIsPlaying(true);
      setIsPlayerReady(true);
      setIsBuffering(false);
      keepControlsVisible();
    };
    const onPause = () => {
      setIsPlaying(false);
      setShowControls(true);
      if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA || video.ended) {
        setIsBuffering(false);
      }
    };
    const onVolumeChange = () => {
      setVolume(video.volume);
      setIsMuted(video.muted || video.volume === 0);
    };
    const onWaiting = () => {
      if (!video.ended) setIsBuffering(true);
    };
    const onSeeking = () => {
      if (!video.paused) setIsBuffering(true);
    };
    const onSeeked = () => {
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        setIsBuffering(false);
      }
    };
    const onStalled = () => {
      if (!video.ended) setIsBuffering(true);
    };
    const onEnded = () => {
      setIsBuffering(false);
    };
    const onVideoError = () => {
      const mediaError = video.error;
      // Ignore benign aborts when source changes during startup/refresh.
      if (mediaError?.code === MediaError.MEDIA_ERR_ABORTED) return;
      onError?.();
    };

    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('progress', onProgress);
    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('loadeddata', onLoadedData);
    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('volumechange', onVolumeChange);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('seeking', onSeeking);
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('stalled', onStalled);
    video.addEventListener('ended', onEnded);
    video.addEventListener('error', onVideoError);

    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('progress', onProgress);
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('loadeddata', onLoadedData);
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('volumechange', onVolumeChange);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('seeking', onSeeking);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('stalled', onStalled);
      video.removeEventListener('ended', onEnded);
      video.removeEventListener('error', onVideoError);
    };
  }, [manifestUrl, fallbackUrl, onError, keepControlsVisible]);

  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(Boolean(playerRef.current && document.fullscreenElement === playerRef.current));
    }
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); rewind10(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); forward10(); }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [duration]);

  const onQualityChange = useCallback((value: string) => {
    setSelectedQuality(value);
    const hls = hlsRef.current;
    if (!hls) return;
    if (value === 'auto') {
      hls.currentLevel = -1;
      return;
    }
    const idx = Number.parseInt(value, 10);
    if (Number.isFinite(idx) && idx >= 0 && idx < hls.levels.length) {
      hls.currentLevel = idx;
    }
  }, []);

  async function togglePlayPause() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      try {
        await video.play();
      } catch (error) {
        if (error instanceof DOMException && (error.name === 'AbortError' || error.name === 'NotSupportedError')) {
          return;
        }
        throw error;
      }
      return;
    }
    video.pause();
  }

  async function toggleFullscreen() {
    const el = playerRef.current;
    if (!el) return;
    if (document.fullscreenElement === el) await document.exitFullscreen();
    else await el.requestFullscreen();
  }

  function onSeek(val: number) {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = val;
    setCurrentTime(val);
  }

  function seekFromEvent(e: MouseEvent | TouchEvent) {
    const bar = seekBarRef.current;
    if (!bar || !duration) return;
    const rect = bar.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    onSeek(pct * duration);
  }

  function handleSeekPointerDown(e: React.MouseEvent | React.TouchEvent) {
    isSeekingRef.current = true;
    keepControlsVisible();
    seekFromEvent(e.nativeEvent);

    function onMove(ev: MouseEvent | TouchEvent) {
      if (!isSeekingRef.current) return;
      seekFromEvent(ev);
    }
    function onUp() {
      isSeekingRef.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onUp);
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchmove', onMove, { passive: true });
    document.addEventListener('touchend', onUp);
  }

  function onVolumeInput(val: number) {
    const video = videoRef.current;
    if (!video) return;
    video.volume = val;
    video.muted = val === 0;
  }

  function toggleMute() {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
  }

  function rewind10() {
    const video = videoRef.current;
    if (!video) return;
    onSeek(Math.max(0, video.currentTime - 10));
  }

  function forward10() {
    const video = videoRef.current;
    if (!video) return;
    onSeek(Math.min(duration || 0, video.currentTime + 10));
  }

  const showQualityEntry =
    qualityMode !== 'idle' && (Boolean(manifestUrl) || Boolean(fallbackUrl));

  const autoButtonLabel =
    selectedQuality === 'auto' && autoStreamLabel
      ? t('qualityAutoWithStream', { label: autoStreamLabel })
      : t('qualityAuto');

  return (
    <div
      ref={playerRef}
      className="w-full bg-black relative select-none"
      onMouseMove={keepControlsVisible}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      >
      <video
        ref={videoRef}
        className="w-full aspect-video object-contain"
        controls={false}
        playsInline
        preload="metadata"
        poster={poster}
        title={title}
        onClick={() => void togglePlayPause()}
      />

      {/* Full overlay — initial load only, never shown while video is playing */}
      {!isPlayerReady && Boolean(manifestUrl || fallbackUrl) && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-black/55 px-6 py-5 text-center shadow-2xl">
            <div className="relative h-14 w-14">
              <div className="absolute inset-0 rounded-full border border-white/15" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-white border-r-brand-red animate-spin" />
              <div className="absolute inset-2 rounded-full bg-white/5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-white">{t('loadingVideo')}</p>
              <p className="text-xs text-white/70">{t('watchingOn')}</p>
            </div>
          </div>
        </div>
      )}

      {/* Small corner spinner — mid-play buffering only, never blocks the video */}
      {showBufferingSpinner && (
        <div className="pointer-events-none absolute bottom-16 right-4 z-20">
          <div className="flex items-center gap-2 rounded-full bg-black/70 px-3 py-2 backdrop-blur-sm">
            <div className="h-4 w-4 rounded-full border-2 border-transparent border-t-white animate-spin shrink-0" />
            <span className="text-xs text-white font-medium">{t('bufferingVideo')}</span>
          </div>
        </div>
      )}

      <div
        className={`absolute inset-x-0 bottom-0 z-10 bg-linear-to-t from-black/90 via-black/50 to-transparent px-4 pb-3 pt-12 transition-opacity duration-200 ${
          showControls ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        {/* Custom seek bar with playhead handle */}
        <div
          ref={seekBarRef}
          className="relative w-full h-4 flex items-center cursor-pointer mb-2 group"
          aria-label="Seek"
          role="slider"
          aria-valuemin={0}
          aria-valuemax={Math.max(duration, 0)}
          aria-valuenow={Math.min(currentTime, duration || 0)}
          onMouseDown={handleSeekPointerDown}
          onTouchStart={handleSeekPointerDown}
        >
          {/* Track */}
          <div className="absolute w-full h-1 bg-white/20 rounded-full" />
          {/* Buffered fill */}
          <div
            className="absolute h-1 bg-white/40 rounded-full pointer-events-none"
            style={{ width: `${bufferedPct}%` }}
          />
          {/* Played fill */}
          <div
            className="absolute h-1 bg-brand-red rounded-full pointer-events-none"
            style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
          />
          {/* Playhead handle */}
          <div
            className="absolute w-3 h-3 bg-white rounded-full shadow-lg pointer-events-none
                       scale-0 group-hover:scale-100 transition-transform duration-150"
            style={{ left: `${duration ? (currentTime / duration) * 100 : 0}%`, transform: `translateX(-50%) scale(var(--tw-scale-x))` }}
          />
        </div>

        <div className="flex items-center justify-between gap-3 text-white">
          <div className="flex items-center gap-1 sm:gap-2 min-w-0">
            <button
              type="button"
              onClick={() => void togglePlayPause()}
              className="p-2 rounded-full hover:bg-white/15 transition-colors shrink-0"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" aria-hidden>
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" aria-hidden>
                  <polygon points="5,3 19,12 5,21" />
                </svg>
              )}
            </button>

            <button
              type="button"
              onClick={rewind10}
              className="p-2 rounded-full hover:bg-white/15 transition-colors hidden sm:flex shrink-0"
              aria-label="Rewind 10 seconds"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M1 4v6h6" />
                <path d="M3.51 15a9 9 0 1 0 .49-3.61" />
                <text x="8" y="14" fontSize="6" fill="currentColor" stroke="none" fontWeight="bold">10</text>
              </svg>
            </button>

            <button
              type="button"
              onClick={forward10}
              className="p-2 rounded-full hover:bg-white/15 transition-colors hidden sm:flex shrink-0"
              aria-label="Forward 10 seconds"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M23 4v6h-6" />
                <path d="M20.49 15a9 9 0 1 1-.49-3.61" />
                <text x="8" y="14" fontSize="6" fill="currentColor" stroke="none" fontWeight="bold">10</text>
              </svg>
            </button>

            <button
              type="button"
              onClick={toggleMute}
              className="p-2 rounded-full hover:bg-white/15 transition-colors shrink-0"
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? (
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                </svg>
              )}
            </button>

            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : volume}
              onChange={(e) => onVolumeInput(Number(e.target.value))}
              className="w-16 sm:w-20 h-1 accent-brand-red cursor-pointer hidden sm:block shrink-0"
              aria-label="Volume"
            />

            <span className="text-xs font-medium text-white/90 tabular-nums whitespace-nowrap shrink-0">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="relative flex items-center gap-1 shrink-0">
            {showQualityEntry && (
              <div className="relative" ref={qualityWrapRef}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowQualityMenu((v) => !v);
                  }}
                  className="p-2 rounded-full hover:bg-white/15 transition-colors"
                  aria-label={t('ariaQuality')}
                  aria-expanded={showQualityMenu}
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 .6 1.65 1.65 0 0 0-.33 1V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-.33-1 1.65 1.65 0 0 0-1-.6 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-.6-1 1.65 1.65 0 0 0-1-.33H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1-.33 1.65 1.65 0 0 0 .6-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-.6 1.65 1.65 0 0 0 .33-1V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 .33 1 1.65 1.65 0 0 0 1 .6 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.16.32.24.67.24 1s-.08.68-.24 1z" />
                  </svg>
                </button>

                {showQualityMenu && (
                  <div className="absolute bottom-12 right-0 rounded-xl border border-white/20 bg-black/95 p-2.5 shadow-2xl backdrop-blur-sm z-20 w-[min(100vw-2rem,220px)] max-h-[min(50vh,280px)] overflow-y-auto">
                    <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                      {t('quality')}
                    </p>

                    {(qualityMode === 'hls-multi' || qualityMode === 'hls-single') && (
                      <div className="flex flex-col gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            onQualityChange('auto');
                            setShowQualityMenu(false);
                          }}
                          className={`rounded-lg border px-2.5 py-2 text-left text-xs font-medium transition-colors ${
                            selectedQuality === 'auto'
                              ? 'border-brand-red bg-brand-red text-white'
                              : 'border-white/30 text-white hover:bg-white/15'
                          }`}
                        >
                          {autoButtonLabel}
                        </button>
                        {qualityLevels.map(({ index, label }) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => {
                              onQualityChange(String(index));
                              setShowQualityMenu(false);
                            }}
                            className={`rounded-lg border px-2.5 py-2 text-left text-xs font-medium transition-colors ${
                              selectedQuality === String(index)
                                ? 'border-brand-red bg-brand-red text-white'
                                : 'border-white/30 text-white hover:bg-white/15'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    )}

                    {qualityMode === 'native' && (
                      <p className="px-1 text-xs text-white/90 leading-relaxed">{t('qualityNativeHint')}</p>
                    )}

                    {qualityMode === 'progressive' && (
                      <p className="px-1 text-xs text-white/90 leading-relaxed">{t('qualityProgressiveHint')}</p>
                    )}
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => void toggleFullscreen()}
              className="p-2 rounded-full hover:bg-white/15 transition-colors"
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? (
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M15 9h6M21 3v6m-7-7-7 7M9 15H3M3 21v-6m7 7 7-7" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
