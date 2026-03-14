'use client';

import { useState, useEffect, useMemo } from 'react';
import Loading from '@/components/shared/Loading';
import DramaCardCompact from '@/components/drama/DramaCardCompact';
import Pagination from '@/components/shared/Pagination';
import { FiPlay, FiSearch, FiX } from 'react-icons/fi';
import { useTranslations } from 'next-intl';

const PAGE_SIZE = 12;

export default function SeriesPage() {
  const t = useTranslations('series');
  const tb = useTranslations('browse');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [items, setItems] = useState<{ id: string; title: string; titleKh?: string; episodes: number; image: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const ac = new AbortController();
    const run = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/movies?type=series', { signal: ac.signal });
        const data = await res.json();
        setItems(Array.isArray(data) ? data : []);
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    run();
    return () => ac.abort();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter((d) => d.title.toLowerCase().includes(q));
  }, [items, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginatedItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-24">
      <div className="container mx-auto px-4 md:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 flex items-center gap-3 mb-1">
            <span className="w-10 h-10 rounded-xl bg-[#E31837]/10 flex items-center justify-center">
              <FiPlay className="text-[#E31837] text-xl" />
            </span>
            {t('title')}
          </h1>
          <p className="text-gray-400 mt-1">{t('subtitle')}</p>
        </div>

        {/* Search Bar */}
        <div className="relative mb-8">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={tb('searchPlaceholder')}
            className="w-full bg-white border border-gray-200 focus:border-[#E31837]/50 rounded-xl pl-11 pr-10 py-3 text-gray-900 placeholder-gray-400 outline-none transition-colors text-sm shadow-sm"
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

        {/* Result count */}
        {searchQuery && !loading && (
          <p className="text-gray-400 text-sm mb-6">
            {filtered.length === 0
              ? tb('noResultsFound')
              : filtered.length === 1
                ? tb('results', { count: filtered.length, query: searchQuery })
                : tb('resultsPlural', { count: filtered.length, query: searchQuery })}
          </p>
        )}

        {loading ? (
          <Loading />
        ) : paginatedItems.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
            {paginatedItems.map((item) => (
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

        {!loading && filtered.length > 0 && totalPages > 1 && (
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
