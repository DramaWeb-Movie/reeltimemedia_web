import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import {
  createPaymentIntent,
  generateOrderId,
  buildSuccessUrl,
  buildFailUrl,
  BarayPaymentPayload,
} from '@/lib/baray';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, currency = 'USD', contentType, contentId, contentTitle } = body;

    // Validate required fields
    if (!amount || !contentTitle) {
      return NextResponse.json(
        { success: false, error: { message: 'Missing required fields: amount, contentTitle' } },
        { status: 400 }
      );
    }

    // Validate amount
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid amount' } },
        { status: 400 }
      );
    }

    // Validate minimum amounts
    if (currency === 'USD' && numericAmount < 0.03) {
      return NextResponse.json(
        { success: false, error: { message: 'USD amount must be >= $0.03' } },
        { status: 400 }
      );
    }
    if (currency === 'KHR' && numericAmount < 100) {
      return NextResponse.json(
        { success: false, error: { message: 'KHR amount must be >= 100 KHR' } },
        { status: 400 }
      );
    }

    // Get authenticated user (required for purchases)
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: { message: 'You must be signed in to create a payment.' } },
        { status: 401 }
      );
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
        return NextResponse.json(
          { success: false, error: { message: 'Content not found.' } },
          { status: 404 }
        );
      }

      const expectedPrice = parseFloat(movie.price ?? '0');
      if (Math.abs(numericAmount - expectedPrice) > 0.01) {
        return NextResponse.json(
          { success: false, error: { message: 'Payment amount does not match the listed price.' } },
          { status: 400 }
        );
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
          return NextResponse.json(
            { success: false, error: { message: 'Payment amount does not match the listed price.' } },
            { status: 400 }
          );
        }
      }
    }

    // Generate unique order ID  
    const orderId = generateOrderId('RTM'); // ReelTime Media prefix

    // Build success URL: prefer env (if not localhost), else request origin so deployment never redirects to localhost
    const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
    const origin = request.headers.get('origin');
    const proto = request.headers.get('x-forwarded-proto');
    const host = request.headers.get('x-forwarded-host');
    const fromRequest = origin || (proto && host ? `${proto}://${host}` : null);
    const baseUrl =
      (envUrl && !envUrl.includes('localhost') ? envUrl : null) ||
      fromRequest ||
      envUrl ||
      'http://localhost:3000';
    const successUrl = buildSuccessUrl(baseUrl, orderId, contentId);
    const failUrl = buildFailUrl(baseUrl, orderId, contentId);

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
      return NextResponse.json(
        { success: false, error: { message: result.error } },
        { status: 400 }
      );
    }

    // Store payment record in database (optional if service role key is not set)
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const adminClient = createAdminClient();
        const { error: dbError } = await adminClient.from('payments').insert({
          user_id: user?.id || null,
          qr_id: result.intent_id,
          content_type: contentType || 'movie',
          content_id: contentId || null,
          content_title: contentTitle,
          amount: numericAmount,
          currency: currency,
          status: 'pending',
          reference: orderId,
          payment_method: 'baray',
        });
        if (dbError) console.error('Failed to store payment record:', dbError);
      } catch (e) {
        console.error('Payment record insert failed:', e);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        intent_id: result.intent_id,
        payment_url: result.payment_url,
        order_id: orderId,
      },
    });
  } catch (error) {
    console.error('Baray payment API error:', error);
    return NextResponse.json(
      { success: false, error: { message: 'Failed to create payment' } },
      { status: 500 }
    );
  }
}
