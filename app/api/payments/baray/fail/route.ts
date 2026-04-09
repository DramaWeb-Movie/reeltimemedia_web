import { NextRequest, NextResponse } from 'next/server';
import { enforceRateLimit } from '@/lib/api/rateLimit';
import { verifyPaymentFailToken } from '@/lib/payments/failToken';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

/**
 * Marks a payment record as failed when the user cancels or the payment fails.
 * Called by the /payment/failed page via the order_id query param.
 */
export async function POST(request: NextRequest) {
  const blocked = await enforceRateLimit(
    request,
    {
      namespace: 'api:payments:baray:fail',
      max: 20,
      windowMs: 60 * 1000,
      blockMs: 10 * 60 * 1000,
    },
    { type: 'json', body: { error: 'Too many requests' } }
  );
  if (blocked) return blocked;

  try {
    const body = await request.json();
    const orderId =
      typeof body?.order_id === 'string' ? body.order_id.trim() : '';
    const cancelToken =
      typeof body?.cancel_token === 'string' ? body.cancel_token.trim() : '';

    if (!orderId || !cancelToken) {
      return NextResponse.json(
        { error: 'Missing order_id or cancel_token' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let isValidToken = false;
    try {
      isValidToken = verifyPaymentFailToken({
        orderId,
        userId: user.id,
        token: cancelToken,
      });
    } catch (error) {
      console.error('Payment fail token verification error:', error);
      return NextResponse.json({ error: 'Payment cancellation misconfigured' }, { status: 500 });
    }

    if (!isValidToken) {
      return NextResponse.json({ error: 'Invalid cancellation token' }, { status: 401 });
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ status: 'skipped' });
    }

    const { data: payment, error: findError } = await supabase
      .from('payments')
      .select('id, status')
      .eq('reference', orderId)
      .maybeSingle();

    if (findError || !payment) {
      return NextResponse.json({ status: 'not_found' });
    }

    // Only update if still pending — don't overwrite a completed payment
    if (payment.status !== 'pending') {
      return NextResponse.json({ status: 'already_resolved', current: payment.status });
    }

    const adminClient = createAdminClient();

    const { error: updateError } = await adminClient
      .from('payments')
      .update({ status: 'failed' })
      .eq('id', payment.id)
      .eq('user_id', user.id)
      .eq('status', 'pending');

    if (updateError) {
      console.error('Failed to mark payment as failed:', updateError);
      return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }

    return NextResponse.json({ status: 'marked_failed', order_id: orderId });
  } catch (error) {
    console.error('Payment fail handler error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
