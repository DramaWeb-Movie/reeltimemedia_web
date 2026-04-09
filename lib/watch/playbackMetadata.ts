export type PlaybackMetadata = {
  contentId: string;
  ep: number;
  videoUrl: string | null;
  hlsManifestUrl: string | null;
  expiresAt: number;
};

const playbackMetadataStore = new Map<string, PlaybackMetadata>();

let lastCleanupAt = 0;

function maybeCleanupExpiredEntries(now: number) {
  if (now - lastCleanupAt < 60_000) return;
  lastCleanupAt = now;

  for (const [key, value] of playbackMetadataStore.entries()) {
    if (value.expiresAt <= now) {
      playbackMetadataStore.delete(key);
    }
  }
}

export function createPlaybackKey(): string {
  return crypto.randomUUID();
}

export async function setPlaybackMetadata(
  playbackKey: string,
  metadata: Omit<PlaybackMetadata, 'expiresAt'>,
  ttlSeconds: number
): Promise<void> {
  const now = Date.now();
  maybeCleanupExpiredEntries(now);

  playbackMetadataStore.set(playbackKey, {
    ...metadata,
    expiresAt: now + Math.max(60, Math.floor(ttlSeconds)) * 1000,
  });
}

export async function getPlaybackMetadata(playbackKey: string): Promise<PlaybackMetadata | null> {
  const now = Date.now();
  maybeCleanupExpiredEntries(now);

  const cached = playbackMetadataStore.get(playbackKey);
  if (!cached) return null;

  if (cached.expiresAt <= now) {
    playbackMetadataStore.delete(playbackKey);
    return null;
  }

  return cached;
}
