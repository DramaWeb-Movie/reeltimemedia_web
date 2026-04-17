import { unstable_cache } from 'next/cache';
import { fetchWithBudget } from '@/lib/utils/fetchWithBudget';

const HLS_ACCEPT_HEADER = 'application/vnd.apple.mpegurl,application/x-mpegURL,text/plain,*/*';

function isMasterManifestContent(content: string): boolean {
  const text = content.toUpperCase();
  return text.includes('#EXTM3U') && text.includes('#EXT-X-STREAM-INF');
}

async function fetchManifestText(url: string): Promise<string | null> {
  try {
    const res = await fetchWithBudget(
      url,
      {
        headers: {
          Accept: HLS_ACCEPT_HEADER,
          'Cache-Control': 'no-cache',
        },
      },
      {
        timeoutMs: 4500,
        retries: 0,
      }
    );
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type')?.toLowerCase() ?? '';
    if (
      contentType &&
      !contentType.includes('mpegurl') &&
      !contentType.includes('application/octet-stream') &&
      !contentType.includes('text/plain')
    ) {
      return null;
    }
    const text = await res.text();
    return text.slice(0, 200_000);
  } catch {
    return null;
  }
}

function deriveMasterCandidates(rawUrl: string): string[] {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return [];
  }

  const base = parsed.pathname;
  const candidates = new Set<string>();
  const addPath = (pathname: string) => {
    const u = new URL(parsed.toString());
    u.pathname = pathname;
    candidates.add(u.toString());
  };
  const stripFile = (pathname: string) => pathname.replace(/\/[^/]*$/, '/');
  const normalizeDir = (pathname: string) => pathname.replace(/\/+$/, '') || '/';
  const addFromDirectory = (dir: string) => {
    const d = normalizeDir(dir);
    addPath(`${d}/master.m3u8`);
    addPath(`${d}/playlist.m3u8`);
    addPath(`${d}/index.m3u8`);
  };

  // Common adaptive manifests.
  addPath(base.replace(/\/(?:index|playlist|master)\.m3u8$/i, '/master.m3u8'));
  addPath(base.replace(/\/(?:index|playlist|master)\.m3u8$/i, '/playlist.m3u8'));
  addPath(base.replace(/\/(?:chunklist|media|stream|rendition)[^/]*\.m3u8$/i, '/master.m3u8'));
  addPath(base.replace(/\/(?:chunklist|media|stream|rendition)[^/]*\.m3u8$/i, '/playlist.m3u8'));
  addPath(base.replace(/\/(?:\d{3,4}p|[a-z0-9_-]*\d{3,4}[a-z0-9_-]*)\.m3u8$/i, '/master.m3u8'));
  addPath(base.replace(/\/(?:\d{3,4}p|[a-z0-9_-]*\d{3,4}[a-z0-9_-]*)\.m3u8$/i, '/playlist.m3u8'));

  // If URL points to rendition folders like /360p/index.m3u8 or /720p/playlist.m3u8
  addPath(
    base.replace(
      /\/(?:\d{3,4}p|[a-z0-9_-]*\d{3,4}[a-z0-9_-]*)\/(?:index|playlist|master)\.m3u8$/i,
      '/master.m3u8'
    )
  );
  addPath(
    base.replace(
      /\/(?:\d{3,4}p|[a-z0-9_-]*\d{3,4}[a-z0-9_-]*)\/(?:index|playlist|master)\.m3u8$/i,
      '/playlist.m3u8'
    )
  );
  addPath(
    base.replace(
      /\/(?:\d{3,4}p|[a-z0-9_-]*\d{3,4}[a-z0-9_-]*)\/(?:chunklist|media|stream|rendition)[^/]*\.m3u8$/i,
      '/master.m3u8'
    )
  );
  addPath(
    base.replace(
      /\/(?:\d{3,4}p|[a-z0-9_-]*\d{3,4}[a-z0-9_-]*)\/(?:chunklist|media|stream|rendition)[^/]*\.m3u8$/i,
      '/playlist.m3u8'
    )
  );

  // Walk up parent directories and test common master filenames.
  const dir0 = stripFile(base);
  addFromDirectory(dir0);
  const dir1 = stripFile(normalizeDir(dir0));
  addFromDirectory(dir1);
  const dir2 = stripFile(normalizeDir(dir1));
  addFromDirectory(dir2);

  candidates.delete(rawUrl);
  return Array.from(candidates).filter(Boolean);
}

/**
 * Returns an HLS URL that is likely adaptive (master playlist).
 * If the stored URL is already a master, returns it as-is.
 * If the stored URL is a rendition playlist, tries nearby master URL candidates.
 */
async function resolveAdaptiveManifestUrlUncached(original: string): Promise<string> {
  const originalText = await fetchManifestText(original);
  if (originalText && isMasterManifestContent(originalText)) {
    return original;
  }

  const candidates = deriveMasterCandidates(original);
  try {
    const winner = await Promise.any(
      candidates.map(async (candidate) => {
        const text = await fetchManifestText(candidate);
        if (text && isMasterManifestContent(text)) return candidate;
        throw new Error('not master');
      })
    );
    return winner;
  } catch {
    // all candidates failed — fall through to original
  }

  // Fall back to original value so playback still works even without adaptive variants.
  return original;
}

const resolveAdaptiveManifestUrlCached = unstable_cache(
  async (original: string) => resolveAdaptiveManifestUrlUncached(original),
  ['watch-hls-master-manifest'],
  { revalidate: 300 }
);

export async function resolveAdaptiveManifestUrl(
  storedManifestUrl: string | null | undefined
): Promise<string | null> {
  const original = storedManifestUrl?.trim();
  if (!original) return null;
  return resolveAdaptiveManifestUrlCached(original);
}
