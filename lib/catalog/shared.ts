import type { ContentType } from '@/types';

export const CATALOG_PLACEHOLDER_IMAGE =
  'https://placehold.co/400x600/1a1a1a/808080?text=No+Image';

type CatalogImageSource = {
  cover_url?: string | null;
  thumbnail_url?: string | null;
  thumnail_url?: string | null;
};

type CatalogContentSource = {
  type?: string | null;
  total_episodes?: number | null;
};

type CatalogReleaseSource = {
  release_date?: string | null;
};

type CatalogGenresSource = {
  genre?: string | null;
};

export function normalizeCatalogQuery(input: string): string {
  return input
    .normalize('NFKC')
    .replace(/[,%_*()[\]{}<>"'`;$\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function escapeForILike(value: string): string {
  return value.replace(/[%_]/g, (match) => `\\${match}`);
}

export function resolveCatalogImage(source: CatalogImageSource): string {
  return (
    source.cover_url?.trim()
    || source.thumbnail_url?.trim()
    || source.thumnail_url?.trim()
    || CATALOG_PLACEHOLDER_IMAGE
  );
}

export function resolveCatalogContentType(source: CatalogContentSource): ContentType {
  return source.type === 'series' ? 'series' : 'movie';
}

export function resolveCatalogEpisodes(source: CatalogContentSource): number {
  const contentType = resolveCatalogContentType(source);
  return contentType === 'series' ? Math.max(1, source.total_episodes ?? 1) : 1;
}

export function splitCatalogGenres(source: CatalogGenresSource): string[] | undefined {
  if (!source.genre?.trim()) return undefined;
  return source.genre.split(',').map((genre) => genre.trim()).filter(Boolean);
}

export function getCatalogReleaseYear(source: CatalogReleaseSource): string | undefined {
  return source.release_date
    ? new Date(source.release_date).getFullYear().toString()
    : undefined;
}
