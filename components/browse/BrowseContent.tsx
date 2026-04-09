'use client';

import { startTransition, useCallback, useEffect, useState } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { usePurchasedMovieIds } from '@/hooks/usePurchasedMovieIds';
import DramaCardCompact from '@/components/drama/DramaCardCompact';
import Pagination from '@/components/shared/Pagination';
import { DRAMA_CARD_GRID } from '@/lib/drama-grid';
import { FiSearch, FiX } from 'react-icons/fi';
import { useTranslations } from 'next-intl';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { BrowseAccessFilter, BrowseTypeFilter, MovieCard } from '@/lib/movies';

type BrowseContentProps = {
  initialItems: MovieCard[];
  allGenres: string[];
  currentPage: number;
  totalPages: number;
  totalResults: number;
  filters: {
    q: string;
    access: BrowseAccessFilter;
    type: BrowseTypeFilter;
    genre: string;
  };
};

export default function BrowseContent({
  initialItems,
  allGenres,
  currentPage,
  totalPages,
  totalResults,
  filters,
}: BrowseContentProps) {
  const t = useTranslations('browse');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(filters.q);
  const debouncedQuery = useDebounce(searchQuery, 300);
  const { purchasedSet } = usePurchasedMovieIds();

  const updateBrowseUrl = useCallback((next: {
    q?: string;
    access?: BrowseAccessFilter;
    type?: BrowseTypeFilter;
    genre?: string;
    page?: number;
  }) => {
    const params = new URLSearchParams(searchParams?.toString());
    const q = (next.q ?? filters.q).trim();
    const access = next.access ?? filters.access;
    const type = next.type ?? filters.type;
    const genre = (next.genre ?? filters.genre).trim();
    const page = next.page ?? currentPage;

    if (q) params.set('q', q);
    else params.delete('q');

    if (access !== 'all') params.set('access', access);
    else params.delete('access');

    if (type !== 'all') params.set('type', type);
    else params.delete('type');

    if (genre) params.set('genre', genre);
    else params.delete('genre');

    if (page > 1) params.set('page', String(page));
    else params.delete('page');

    const query = params.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname);
    });
  }, [currentPage, filters.access, filters.genre, filters.q, filters.type, pathname, router, searchParams]);

  useEffect(() => {
    const normalized = debouncedQuery.trim();
    if (normalized === filters.q) return;
    updateBrowseUrl({ q: normalized, page: 1 });
  }, [debouncedQuery, filters.q, updateBrowseUrl]);

  const handlePageChange = (page: number) => {
    updateBrowseUrl({ page });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-24">
      <div className="container mx-auto px-4 md:px-8 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">{t('title')}</h1>
            <p className="text-gray-400 mt-2">{t('subtitle')}</p>
          </div>
        </div>

        <div className="relative mb-4">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full bg-white border border-gray-200 focus:border-brand-red/50 rounded-xl pl-11 pr-10 py-3 text-gray-900 placeholder-gray-400 outline-none transition-colors text-sm shadow-sm"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
            >
              <FiX className="text-lg" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-4 mb-8">
          {/* Free / Paid dropdown */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">
              {t('labelAccess')}
            </label>
            <select
              value={filters.access}
              onChange={(e) => {
                updateBrowseUrl({
                  access: e.target.value as BrowseAccessFilter,
                  page: 1,
                });
              }}
              className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-red/60 focus:border-brand-red/60 min-w-[160px]"
            >
              <option value="all">{t('filterAllAccess')}</option>
              <option value="free">{t('filterFree')}</option>
              <option value="paid">{t('filterPaid')}</option>
            </select>
          </div>

          {/* Movie / Series dropdown */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">
              {t('labelType')}
            </label>
            <select
              value={filters.type}
              onChange={(e) => {
                updateBrowseUrl({
                  type: e.target.value as BrowseTypeFilter,
                  page: 1,
                });
              }}
              className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-red/60 focus:border-brand-red/60 min-w-[160px]"
            >
              <option value="all">{t('filterAllTypes')}</option>
              <option value="movie">{t('filterMovies')}</option>
              <option value="series">{t('filterSeries')}</option>
            </select>
          </div>

          {/* Genre dropdown */}
          {allGenres.length > 0 && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">
                {t('labelGenre')}
              </label>
              <select
                value={filters.genre || 'all'}
                onChange={(e) => {
                  updateBrowseUrl({
                    genre: e.target.value === 'all' ? '' : e.target.value,
                    page: 1,
                  });
                }}
                className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-red/60 focus:border-brand-red/60 min-w-[180px]"
              >
                <option value="all">{t('filterAllGenres')}</option>
                {allGenres.map((genre) => (
                  <option key={genre} value={genre}>
                    {genre}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {filters.q && (
          <p className="text-gray-400 text-sm mb-6">
            {totalResults === 0
              ? t('noResultsFound')
              : totalResults === 1
                ? t('results', { count: totalResults, query: filters.q })
                : t('resultsPlural', { count: totalResults, query: filters.q })}
          </p>
        )}

        {initialItems.length > 0 ? (
          <div className={DRAMA_CARD_GRID}>
            {initialItems.map((drama) => {
              const isSeries = drama.contentType === 'series' || drama.episodes > 1;
              const isMovie = drama.contentType === 'movie' || (!isSeries && drama.episodes <= 1);
              return (
                <DramaCardCompact
                  key={drama.id}
                  id={drama.id}
                  title={drama.title}
                  titleKh={drama.titleKh}
                  episodes={drama.episodes}
                  image={drama.image}
                  showWatchButton={isSeries}
                  showMovieButton={isMovie}
                  hasPurchased={isMovie ? purchasedSet.has(drama.id) : undefined}
                  price={isMovie ? drama.price : undefined}
                />
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <FiSearch className="text-5xl text-gray-300 mb-4" />
            <p className="text-gray-900 font-semibold text-lg mb-1">{t('noResultsFound')}</p>
            <p className="text-gray-400 text-sm">{t('tryDifferent')}</p>
          </div>
        )}

        {initialItems.length > 0 && totalPages > 1 && (
          <div className="mt-12">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>
    </div>
  );
}
