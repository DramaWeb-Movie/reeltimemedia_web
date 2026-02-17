'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface AccessStatus {
  hasAccess: boolean;
  loading: boolean;
  subscriptionActive: boolean;
  subscriptionExpiresAt?: string;
}

/**
 * usePaymentAccess Hook
 * 
 * Checks if the current user has access to specific content
 * based on purchases or active subscriptions.
 * 
 * @example
 * // Check movie access
 * const { hasAccess, loading } = usePaymentAccess('movie', 'movie-123');
 * if (loading) return <Loading />;
 * if (!hasAccess) return <PaymentButton ... />;
 * 
 * @example
 * // Check series subscription
 * const { subscriptionActive, subscriptionExpiresAt } = usePaymentAccess('series');
 */
export function usePaymentAccess(
  contentType: 'movie' | 'series',
  contentId?: string
): AccessStatus {
  const [status, setStatus] = useState<AccessStatus>({
    hasAccess: false,
    loading: true,
    subscriptionActive: false,
  });

  useEffect(() => {
    checkAccess();
  }, [contentType, contentId]);

  const checkAccess = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setStatus({
          hasAccess: false,
          loading: false,
          subscriptionActive: false,
        });
        return;
      }

      // Check subscription for series content
      if (contentType === 'series') {
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .gt('expires_at', new Date().toISOString())
          .single();

        setStatus({
          hasAccess: !!subscription,
          loading: false,
          subscriptionActive: !!subscription,
          subscriptionExpiresAt: subscription?.expires_at,
        });
        return;
      }

      // Check purchase for movie content
      if (contentType === 'movie' && contentId) {
        const { data: purchase } = await supabase
          .from('purchases')
          .select('*')
          .eq('user_id', user.id)
          .eq('content_id', contentId)
          .single();

        // Also check if user has active subscription (gives access to all content)
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .gt('expires_at', new Date().toISOString())
          .single();

        setStatus({
          hasAccess: !!purchase || !!subscription,
          loading: false,
          subscriptionActive: !!subscription,
          subscriptionExpiresAt: subscription?.expires_at,
        });
        return;
      }

      setStatus({
        hasAccess: false,
        loading: false,
        subscriptionActive: false,
      });
    } catch (error) {
      console.error('Access check error:', error);
      setStatus({
        hasAccess: false,
        loading: false,
        subscriptionActive: false,
      });
    }
  };

  return status;
}
