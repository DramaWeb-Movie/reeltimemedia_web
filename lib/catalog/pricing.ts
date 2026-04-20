import type { ContentType } from '@/types';

/**
 * Movie is not sold at a positive price: missing `price` from API/DB, or explicit $0.
 * (Series use `freeEpisodesCount` / subscription — not this helper.)
 */
export function isMoviePriceFree(price: number | null | undefined): boolean {
  return price == null || price === 0;
}

/** True when this row is a movie and {@link isMoviePriceFree} applies. */
export function isFreeMovie(contentType: ContentType, price: number | null | undefined): boolean {
  return contentType === 'movie' && isMoviePriceFree(price);
}
