'use client';

import { useEffect, useMemo, useState } from 'react';

type PurchasedMoviesResponse = {
  ids?: unknown;
};

function normalizePurchasedIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((id): id is string => typeof id === 'string')
    .map((id) => id.trim())
    .filter(Boolean);
}

export function usePurchasedMovieIds(): { purchasedSet: Set<string>; loading: boolean } {
  const [ids, setIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    async function loadPurchasedMovieIds() {
      try {
        const response = await fetch('/api/profile/purchased-movies', {
          credentials: 'include',
          cache: 'no-store',
          signal: controller.signal,
        });

        if (!response.ok) {
          setIds([]);
          return;
        }

        const json = (await response.json()) as PurchasedMoviesResponse;
        setIds(normalizePurchasedIds(json.ids));
      } catch (error) {
        if ((error as Error).name === 'AbortError') return;
        console.error('Failed to load purchased movie IDs:', error);
        setIds([]);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadPurchasedMovieIds();

    return () => {
      controller.abort();
    };
  }, []);

  const purchasedSet = useMemo(() => new Set(ids), [ids]);
  return { purchasedSet, loading };
}
