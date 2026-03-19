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

/** Format a duration given in seconds to a human-readable string (e.g. "1h 23m"). */
export function formatDuration(seconds: number): string {
  const totalMinutes = Math.floor(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '…';
}
