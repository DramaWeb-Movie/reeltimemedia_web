'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import SearchBar from '@/components/shared/SearchBar';
import Loading from '@/components/shared/Loading';
import { useDebounce } from '@/hooks/useDebounce';
import { FiSearch } from 'react-icons/fi';
import { useTranslations } from 'next-intl';
import DramaCardCompact from '@/components/drama/DramaCardCompact';
import { resolveContentKind } from '@/lib/utils';
import type { MovieCard } from '@/lib/movies';

function SearchContent() {
  const t = useTranslations('search');
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<MovieCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debouncedQuery = useDebounce(query, 400);

  useEffect(() => {
    if (!debouncedQuery.trim() || debouncedQuery.trim().length < 2) {
      setResults([]);
      setError(null);
      return;
    }

    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(debouncedQuery.trim())}&limit=20`
        );
        if (!res.ok) throw new Error('Search request failed');
        const json = await res.json();
        if (!cancelled) setResults(json.results ?? []);
      } catch {
        if (!cancelled) setError('Search failed. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => { cancelled = true; };
  }, [debouncedQuery]);

  return (
    <>
      <div className="max-w-3xl mx-auto mb-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-8 text-center">
          <span className="gradient-text">{t('title')}</span> {t('contentLabel')}
        </h1>
        <SearchBar placeholder={t('placeholder')} onSearch={setQuery} />
      </div>

      {/* Status line */}
      {query.trim().length >= 2 && (
        <div className="mb-6">
          <p className="text-lg text-gray-500">
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin w-4 h-4 border-2 border-[#E31837] border-t-transparent rounded-full" />
                {t('searching')}
              </span>
            ) : error ? (
              <span className="text-red-500">{error}</span>
            ) : results.length > 0 ? (
              t('foundResults', { count: results.length, query: debouncedQuery })
            ) : (
              t('noResultsFor', { query: debouncedQuery })
            )}
          </p>
        </div>
      )}

      {/* Results grid */}
      {loading ? (
        <Loading />
      ) : results.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
          {results.map((item) => {
            const kind = resolveContentKind(item);
            return (
              <DramaCardCompact
                key={item.id}
                id={item.id}
                title={item.title}
                titleKh={item.titleKh}
                episodes={item.episodes}
                image={item.image}
                showWatchButton={kind === 'series'}
                showMovieButton={kind === 'movie'}
                price={kind === 'movie' ? item.price : undefined}
              />
            );
          })}
        </div>
      ) : (
        /* Empty / idle state */
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <FiSearch className="text-3xl text-gray-400" />
          </div>
          <p className="text-xl text-gray-400">
            {query.trim().length < 2 ? t('startTyping') : t('noContentFound', { query })}
          </p>
        </div>
      )}
    </>
  );
}

export default function SearchPage() {
  return (
    <div className="min-h-screen bg-gray-50 pt-24">
      <div className="container mx-auto px-4 py-8">
        <Suspense fallback={<Loading />}>
          <SearchContent />
        </Suspense>
      </div>
    </div>
  );
}
