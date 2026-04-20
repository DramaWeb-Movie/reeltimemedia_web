import type { MovieCard } from '@/lib/movies';
import type { ContentType } from '@/types';

export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}

/**
 * Determine the display content type for a MovieCard.
 * The DB stores type='single' for movies; this maps it back to the app's
 * ContentType union and also handles cases where contentType may be missing
 * by falling back to the episodes count.
 */
export function resolveContentKind(item: Pick<MovieCard, 'contentType' | 'episodes'>): ContentType {
  if (item.contentType === 'series' || item.episodes > 1) return 'series';
  return 'movie';
}
