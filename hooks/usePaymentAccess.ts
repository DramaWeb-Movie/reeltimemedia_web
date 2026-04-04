'use client';

import { useCallback, useRef, useSyncExternalStore } from 'react';
import { createClient } from '@/lib/supabase/client';

interface AccessStatus {
  hasAccess: boolean;
  loading: boolean;
  isAuthenticated: boolean;
  subscriptionActive: boolean;
  subscriptionExpiresAt?: string;
}

type AccessParams = {
  contentType: 'movie' | 'series';
  contentId?: string;
  isFreeEpisode?: boolean;
  isFreeMovie?: boolean;
};

const DEFAULT_SNAPSHOT: AccessStatus = {
  hasAccess: false,
  loading: true,
  isAuthenticated: false,
  subscriptionActive: false,
};

type StoreEntry = {
  snapshot: AccessStatus;
  listeners: Set<() => void>;
  inFlight: boolean;
  params: AccessParams;
};

const accessStore = new Map<string, StoreEntry>();

function makeKey(params: AccessParams): string {
  return [
    params.contentType,
    params.contentId ?? '',
    params.isFreeEpisode ? '1' : '0',
    params.isFreeMovie ? '1' : '0',
  ].join('|');
}

function getOrCreateEntry(params: AccessParams): StoreEntry {
  const key = makeKey(params);
  const existing = accessStore.get(key);
  if (existing) {
    existing.params = params;
    return existing;
  }
  const entry: StoreEntry = {
    snapshot: DEFAULT_SNAPSHOT,
    listeners: new Set(),
    inFlight: false,
    params,
  };
  accessStore.set(key, entry);
  return entry;
}

function notify(entry: StoreEntry) {
  entry.listeners.forEach((l) => l());
}

async function computeAccess(params: AccessParams): Promise<AccessStatus> {
  // Free movie — no login required, anyone can watch
  if (params.contentType === 'movie' && params.isFreeMovie) {
    return {
      hasAccess: true,
      loading: false,
      isAuthenticated: false,
      subscriptionActive: false,
    };
  }

  // Free episode — no login required, anyone can watch
  if (params.contentType === 'series' && params.isFreeEpisode) {
    return {
      hasAccess: true,
      loading: false,
      isAuthenticated: false,
      subscriptionActive: false,
    };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      hasAccess: false,
      loading: false,
      isAuthenticated: false,
      subscriptionActive: false,
    };
  }

  // Paid series episode — requires active subscription
  if (params.contentType === 'series') {
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('expires_at')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    return {
      hasAccess: !!subscription,
      loading: false,
      isAuthenticated: true,
      subscriptionActive: !!subscription,
      subscriptionExpiresAt: subscription?.expires_at,
    };
  }

  // Single movie — requires individual purchase
  if (params.contentType === 'movie' && params.contentId) {
    const { data: purchase } = await supabase
      .from('purchases')
      .select('id')
      .eq('user_id', user.id)
      .eq('content_id', params.contentId)
      .maybeSingle();

    return {
      hasAccess: !!purchase,
      loading: false,
      isAuthenticated: true,
      subscriptionActive: false,
    };
  }

  return {
    hasAccess: false,
    loading: false,
    isAuthenticated: true,
    subscriptionActive: false,
  };
}

function startCompute(entry: StoreEntry) {
  if (entry.inFlight) return;
  entry.inFlight = true;
  entry.snapshot = { ...entry.snapshot, loading: true };
  notify(entry);

  computeAccess(entry.params)
    .then((snapshot) => {
      entry.snapshot = snapshot;
    })
    .catch((error) => {
      console.error('Access check error:', error);
      entry.snapshot = {
        hasAccess: false,
        loading: false,
        isAuthenticated: false,
        subscriptionActive: false,
      };
    })
    .finally(() => {
      entry.inFlight = false;
      notify(entry);
    });
}

function attachAccessStoreListener(params: AccessParams, callback: () => void) {
  const entry = getOrCreateEntry(params);
  entry.listeners.add(callback);
  startCompute(entry);
  return () => {
    entry.listeners.delete(callback);
  };
}

function getSnapshot(params: AccessParams): AccessStatus {
  return getOrCreateEntry(params).snapshot;
}

function getServerSnapshot(): AccessStatus {
  return DEFAULT_SNAPSHOT;
}

/**
 * usePaymentAccess Hook
 *
 * Checks if the current user has access to specific content.
 *
 * - movie (free): no login required, everyone can watch
 * - movie (paid): requires individual purchase
 * - series (free episode): no login required, everyone can watch
 * - series (paid episode): requires active subscription
 */
export function usePaymentAccess(
  contentType: 'movie' | 'series',
  contentId?: string,
  isFreeEpisode?: boolean,
  isFreeMovie?: boolean
): AccessStatus {
  const params: AccessParams = {
    contentType,
    contentId,
    isFreeEpisode,
    isFreeMovie,
  };

  const storeKey = makeKey(params);
  const paramsRef = useRef(params);
  paramsRef.current = params;

  // useSyncExternalStore requires a stable subscribe identity between renders when the logical
  // store key is unchanged. A new inline subscribe each render causes React to resubscribe every
  // time, which runs startCompute → notify synchronously and can freeze the tab.
  const subscribe = useCallback((onStoreChange: () => void) => {
    return attachAccessStoreListener(paramsRef.current, onStoreChange);
  }, [storeKey]);

  const getSnapshotForStore = useCallback(() => {
    return getSnapshot(paramsRef.current);
  }, [storeKey]);

  return useSyncExternalStore(subscribe, getSnapshotForStore, getServerSnapshot);
}
