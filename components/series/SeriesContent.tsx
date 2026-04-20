'use client';

import { useState, useMemo } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import DramaCardCompact from '@/components/drama/DramaCardCompact';
import Pagination from '@/components/shared/Pagination';
import { CATALOG_CARD_GRID } from '@/lib/catalog/grid';
import { FiPlay, FiSearch, FiX } from 'react-icons/fi';
import { useTranslations } from 'next-intl';
import type { MovieCard } from '@/lib/movies';

export type SeriesContentProps = {
  initialItems: MovieCard[];
  currentPage: number;
  totalPages: number;
};

export default function SeriesContent({ initialItems, currentPage, totalPages }: SeriesContentProps) {
  const t = useTranslations('series');
  const tb = useTranslations('browse');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebounce(searchQuery, 300);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return initialItems;

    return initialItems.filter((d) => {
      const titleEn = d.title?.toLowerCase() ?? '';
      const titleKh = d.titleKh?.toLowerCase() ?? '';
      return titleEn.includes(q) || titleKh.includes(q);
    });
  }, [initialItems, debouncedQuery]);

  const handlePageChange = (page: number) => {
    const sp = new URLSearchParams(searchParams?.toString());
    sp.set('page', String(page));
    router.push(`${pathname}?${sp.toString()}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-24">
      <div className="container mx-auto px-4 md:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 flex items-center gap-3 mb-1">
            <span className="w-10 h-10 rounded-xl bg-brand-red/10 flex items-center justify-center">
              <FiPlay className="text-brand-red text-xl" />
            </span>
            {t('title')}
          </h1>
          <p className="text-gray-400 mt-1">{t('subtitle')}</p>
        </div>

        <div className="relative mb-8">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
            }}
            placeholder={tb('searchPlaceholder')}
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

        {debouncedQuery && (
          <p className="text-gray-400 text-sm mb-6">
            {filtered.length === 0
              ? tb('noResultsFound')
              : filtered.length === 1
                ? tb('results', { count: filtered.length, query: debouncedQuery })
                : tb('resultsPlural', { count: filtered.length, query: debouncedQuery })}
          </p>
        )}

        {filtered.length > 0 ? (
          <div className={CATALOG_CARD_GRID}>
            {filtered.map((item) => (
              <DramaCardCompact
                key={item.id}
                id={item.id}
                title={item.title}
                titleKh={item.titleKh}
                episodes={item.episodes}
                image={item.image}
                showWatchButton
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <FiSearch className="text-5xl text-gray-300 mb-4" />
            <p className="text-gray-900 font-semibold text-lg mb-1">{tb('noResultsFound')}</p>
            <p className="text-gray-400 text-sm">{tb('tryDifferent')}</p>
          </div>
        )}

        {!debouncedQuery && filtered.length > 0 && totalPages > 1 && (
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
