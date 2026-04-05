/** Route helpers for /drama/[id]/watch — id shape, episode query parsing, canonical paths. */

const DRAMA_ID_UUID =
  /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;

export function isValidDramaId(id: string): boolean {
  return DRAMA_ID_UUID.test(id);
}

export function parseWatchEpisodeParam(
  raw: string | undefined,
  options: { isSinglePart: boolean; totalEpisodes: number }
): number {
  const { isSinglePart, totalEpisodes } = options;
  if (isSinglePart) return 1;
  const max = Math.max(1, totalEpisodes);
  if (raw == null || raw.trim() === '') return 1;
  const n = Number.parseInt(raw.trim(), 10);
  if (!Number.isFinite(n)) return 1;
  return Math.min(Math.max(1, Math.trunc(n)), max);
}

/** True when the URL should be normalized (strip invalid ep on movies, clamp / canonicalize ep on series). */
export function shouldNormalizeWatchSearchParams(
  epRaw: string | undefined,
  episodeNum: number,
  isSinglePart: boolean
): boolean {
  if (isSinglePart) {
    return epRaw != null && epRaw.trim() !== '';
  }
  if (epRaw == null || epRaw.trim() === '') return false;
  return String(episodeNum) !== epRaw.trim();
}

export function watchPagePath(
  id: string,
  episodeNum: number,
  isSinglePart: boolean
): string {
  const base = `/drama/${id}/watch`;
  if (isSinglePart) return base;
  return `${base}?${new URLSearchParams({ ep: String(episodeNum) })}`;
}
