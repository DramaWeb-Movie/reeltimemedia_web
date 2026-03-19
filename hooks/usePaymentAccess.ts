'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface AccessStatus {
  hasAccess: boolean;
  loading: boolean;
  isAuthenticated: boolean;
  subscriptionActive: boolean;
  subscriptionExpiresAt?: string;
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
  const [status, setStatus] = useState<AccessStatus>({
    hasAccess: false,
    loading: true,
    isAuthenticated: false,
    subscriptionActive: false,
  });

  const checkAccess = useCallback(async () => {
    try {
      // Free movie — no login required, anyone can watch
      if (contentType === 'movie' && isFreeMovie) {
        setStatus({
          hasAccess: true,
          loading: false,
          isAuthenticated: false,
          subscriptionActive: false,
        });
        return;
      }

      // Free episode — no login required, anyone can watch
      if (contentType === 'series' && isFreeEpisode) {
        setStatus({
          hasAccess: true,
          loading: false,
          isAuthenticated: false,
          subscriptionActive: false,
        });
        return;
      }

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setStatus({
          hasAccess: false,
          loading: false,
          isAuthenticated: false,
          subscriptionActive: false,
        });
        return;
      }

      // Paid series episode — requires active subscription
      if (contentType === 'series') {
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('expires_at')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .gt('expires_at', new Date().toISOString())
          .maybeSingle();

        setStatus({
          hasAccess: !!subscription,
          loading: false,
          isAuthenticated: true,
          subscriptionActive: !!subscription,
          subscriptionExpiresAt: subscription?.expires_at,
        });
        return;
      }

      // Single movie — requires individual purchase
      if (contentType === 'movie' && contentId) {
        const { data: purchase } = await supabase
          .from('purchases')
          .select('id')
          .eq('user_id', user.id)
          .eq('content_id', contentId)
          .maybeSingle();

        setStatus({
          hasAccess: !!purchase,
          loading: false,
          isAuthenticated: true,
          subscriptionActive: false,
        });
        return;
      }

      setStatus({
        hasAccess: false,
        loading: false,
        isAuthenticated: true,
        subscriptionActive: false,
      });
    } catch (error) {
      console.error('Access check error:', error);
      setStatus({
        hasAccess: false,
        loading: false,
        isAuthenticated: false,
        subscriptionActive: false,
      });
    }
  }, [contentType, contentId, isFreeEpisode, isFreeMovie]);

  useEffect(() => {
    checkAccess();
  }, [checkAccess]);

  return status;
}
