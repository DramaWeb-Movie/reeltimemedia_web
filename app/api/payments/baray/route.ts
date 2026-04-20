import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedServerUser } from '@/lib/supabase/serverUser';
import {
  createPaymentIntent,
  generateOrderId,
  buildSuccessUrl,
  buildFailUrl,
  BarayPaymentPayload,
} from '@/lib/baray';
import { enforceRateLimit } from '@/lib/api/rateLimit';
import {
  barayErrorResponse,
  baraySuccessResponse,
  parseBarayCreatePaymentBody,
  resolveBarayBaseUrl,
  storePendingBarayPayment,
} from '@/lib/baray/server';

export async function POST(request: NextRequest) {
  const blocked = await enforceRateLimit(
    request,
    {
    namespace: 'api:payments:baray:create',
    max: 12,
    windowMs: 60 * 1000,
    blockMs: 10 * 60 * 1000,
    },
    { type: 'json', body: { success: false, error: { message: 'Too many requests' } } }
  );
  if (blocked) return blocked;

  try {
    const parsed = parseBarayCreatePaymentBody(await request.json());
    if (!parsed.ok) return parsed.response;

    const {
      amount: numericAmount,
      currency,
      contentType,
      contentId,
      contentTitle,
    } = parsed.data;

    // Get authenticated user (required for purchases)
    const { supabase, user } = await getAuthenticatedServerUser();

    if (!user) {
      return barayErrorResponse('You must be signed in to create a payment.', 401);
    }

    // Validate amount against the real price stored in the database to prevent price manipulation
    if (contentId && contentType === 'movie') {
      const { data: movie, error: movieError } = await supabase
        .from('movies')
        .select('price')
        .eq('id', contentId)
        .eq('status', 'published')
        .maybeSingle();

      if (movieError || !movie) {
        return barayErrorResponse('Content not found.', 404);
      }

      const expectedPrice = parseFloat(movie.price ?? '0');
      if (Math.abs(numericAmount - expectedPrice) > 0.01) {
        return barayErrorResponse('Payment amount does not match the listed price.', 400);
      }
    }

    if (contentId && contentType === 'subscription') {
      const { data: plan, error: planError } = await supabase
        .from('subscription_plans')
        .select('monthly_price')
        .eq('movie_id', contentId)
        .maybeSingle();

      if (!planError && plan) {
        const expectedPrice = parseFloat(plan.monthly_price ?? '0');
        if (Math.abs(numericAmount - expectedPrice) > 0.01) {
          return barayErrorResponse('Payment amount does not match the listed price.', 400);
        }
      }
    }

    // Generate unique order ID  
    const orderId = generateOrderId('RTM'); // ReelTime Media prefix

    // Build success URL: prefer env (if not localhost), else request origin so deployment never redirects to localhost
    const baseUrl = resolveBarayBaseUrl(request);
    const successUrl = buildSuccessUrl(baseUrl, orderId, contentId);
    const failUrl = buildFailUrl(baseUrl, orderId, user.id, contentId);

    // Create Baray payment payload (only include defined values; Baray may reject undefined)
    const tracking: Record<string, string> = { product: contentTitle };
    tracking.customer_id = user.id;
    if (contentType) tracking.content_type = contentType;
    if (contentId) tracking.content_id = contentId;

    const payload: BarayPaymentPayload = {
      amount: numericAmount.toFixed(2),
      currency: currency as 'USD' | 'KHR',
      order_id: orderId,
      tracking,
      order_details: {
        items: [{ name: contentTitle, price: numericAmount }],
      },
      custom_success_url: successUrl,
      custom_cancel_url: failUrl,
    };

    // Create payment intent with Baray
    const result = await createPaymentIntent(payload);

    if (!result.success) {
      return barayErrorResponse(result.error ?? 'Failed to create payment', 400);
    }

    // Store payment record in database (optional if service role key is not set)
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const adminClient = createAdminClient();
        const dbError = await storePendingBarayPayment(adminClient, {
          userId: user.id,
          intentId: result.intent_id!,
          contentType,
          contentId,
          contentTitle,
          amount: numericAmount,
          currency,
          orderId,
        });
        if (dbError) console.error('Failed to store payment record:', dbError);
      } catch (e) {
        console.error('Payment record insert failed:', e);
      }
    }

    return baraySuccessResponse({
      intent_id: result.intent_id,
      payment_url: result.payment_url,
      order_id: orderId,
    });
  } catch (error) {
    console.error('Baray payment API error:', error);
    return barayErrorResponse('Failed to create payment', 500);
  }
}
