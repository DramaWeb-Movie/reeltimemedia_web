'use client';

import { useState, useMemo } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import DramaCardCompact from '@/components/drama/DramaCardCompact';
import Pagination from '@/components/shared/Pagination';
import { DRAMA_CARD_GRID } from '@/lib/drama-grid';
import { FiSearch, FiX } from 'react-icons/fi';
import { useTranslations } from 'next-intl';
import type { MovieCard } from '@/lib/movies';

const PAGE_SIZE = 12;

type BrowseContentProps = {
  initialDramas: MovieCard[];
  purchasedMovieIds: string[];
};

export default function BrowseContent({ initialDramas, purchasedMovieIds }: BrowseContentProps) {
  const t = useTranslations('browse');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebounce(searchQuery, 300);
  const [freeFilter, setFreeFilter] = useState<'all' | 'free' | 'paid'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'movie' | 'series'>('all');
  const [genreFilter, setGenreFilter] = useState<'all' | string>('all');
  const [currentPage, setCurrentPage] = useState(1);

  const purchasedSet = useMemo(() => new Set(purchasedMovieIds), [purchasedMovieIds]);

  const allGenres = useMemo(() => {
    const set = new Set<string>();
    for (const d of initialDramas) {
      d.genres?.forEach((g) => {
        const trimmed = g.trim();
        if (trimmed) set.add(trimmed);
      });
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [initialDramas]);

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();

    return initialDramas.filter((d) => {
      // Text search (Khmer + English)
      if (q) {
        const titleEn = d.title?.toLowerCase() ?? '';
        const titleKh = d.titleKh?.toLowerCase() ?? '';
        if (!titleEn.includes(q) && !titleKh.includes(q)) {
          return false;
        }
      }

      // Free / paid filter
      if (freeFilter === 'free') {
        const isFreeMovie = d.contentType === 'movie' && (!d.price || d.price === 0);
        const isFreeSeries = d.contentType === 'series' && (d.freeEpisodesCount ?? 0) > 0;
        if (!isFreeMovie && !isFreeSeries) return false;
      } else if (freeFilter === 'paid') {
        const isPaidMovie = d.contentType === 'movie' && !!d.price && d.price > 0;
        const isPaidSeries = d.contentType === 'series' && !(d.freeEpisodesCount && d.freeEpisodesCount > 0);
        if (!isPaidMovie && !isPaidSeries) return false;
      }

      // Content type filter
      if (typeFilter !== 'all' && d.contentType !== typeFilter) {
        return false;
      }

      // Genre filter
      if (genreFilter !== 'all') {
        const genres = d.genres ?? [];
        if (!genres.some((g) => g.trim().toLowerCase() === genreFilter.toLowerCase())) {
          return false;
        }
      }

      return true;
    });
  }, [initialDramas, debouncedQuery, freeFilter, typeFilter, genreFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginatedDramas = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
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
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder={t('searchPlaceholder')}
            className="w-full bg-white border border-gray-200 focus:border-brand-red/50 rounded-xl pl-11 pr-10 py-3 text-gray-900 placeholder-gray-400 outline-none transition-colors text-sm shadow-sm"
          />
          {searchQuery && (
            <button
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
              value={freeFilter}
              onChange={(e) => {
                setFreeFilter(e.target.value as 'all' | 'free' | 'paid');
                setCurrentPage(1);
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
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value as 'all' | 'movie' | 'series');
                setCurrentPage(1);
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
                value={genreFilter}
                onChange={(e) => {
                  setGenreFilter(e.target.value as 'all' | string);
                  setCurrentPage(1);
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

        {debouncedQuery && (
          <p className="text-gray-400 text-sm mb-6">
            {filtered.length === 0
              ? t('noResultsFound')
              : filtered.length === 1
                ? t('results', { count: filtered.length, query: debouncedQuery })
                : t('resultsPlural', { count: filtered.length, query: debouncedQuery })}
          </p>
        )}

        {paginatedDramas.length > 0 ? (
          <div className={DRAMA_CARD_GRID}>
            {paginatedDramas.map((drama) => {
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

        {filtered.length > 0 && totalPages > 1 && (
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
