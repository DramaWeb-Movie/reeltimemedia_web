import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { processWebhook, BarayWebhookPayload } from '@/lib/baray';
import { checkRateLimit } from '@/lib/logging/requestLog';

/**
 * Baray Webhook Handler
 * Receives payment confirmation from Baray when a customer completes payment
 * 
 * Webhook payload format:
 * {
 *   "encrypted_order_id": "<aes_encrypted_order_id>",
 *   "bank": "aba" | "acleda" | "spn" | "wing"
 * }
 */
export async function POST(request: NextRequest) {
  const rate = await checkRateLimit(request, {
    namespace: 'api:payments:baray:webhook',
    max: 90,
    windowMs: 60 * 1000,
    blockMs: 5 * 60 * 1000,
  });
  if (!rate.allowed) {
    const headers = new Headers();
    if (rate.retryAfterSeconds) headers.set('Retry-After', String(rate.retryAfterSeconds));
    return new NextResponse(JSON.stringify({ error: 'Too many requests' }), {
      status: rate.status,
      headers,
    });
  }

  try {
    // Verify webhook secret header if BARAY_WEBHOOK_SECRET is configured.
    // Set this to a shared secret agreed upon with Baray (or any reverse-proxy layer)
    // so that only legitimate calls from Baray can trigger payment fulfilment.
    const webhookSecret = process.env.BARAY_WEBHOOK_SECRET;
    if (webhookSecret) {
      const incomingSecret = request.headers.get('x-webhook-secret');
      if (incomingSecret !== webhookSecret) {
        console.warn('Webhook rejected: invalid or missing x-webhook-secret header');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const body: BarayWebhookPayload = await request.json();
    const { encrypted_order_id, bank } = body;

    // Validate webhook payload
    if (!encrypted_order_id || !bank) {
      console.error('Invalid webhook payload: missing required fields');
      return NextResponse.json(
        { error: 'Invalid webhook payload' },
        { status: 400 }
      );
    }

    // Decrypt the order ID
    let orderId: string;
    let bankCode: string;
    
    try {
      const result = processWebhook(encrypted_order_id, bank);
      orderId = result.order_id;
      bankCode = result.bank;
    } catch (decryptError) {
      console.error('Failed to decrypt order_id:', decryptError);
      return NextResponse.json(
        { error: 'Failed to decrypt payload' },
        { status: 401 }
      );
    }

    console.log(JSON.stringify({
      event: 'payment_webhook_received',
      bank: bankCode,
      at: new Date().toISOString(),
    }));

    // Get admin client to bypass RLS
    const adminClient = createAdminClient();

    // Find the payment record by order_id (stored in reference field)
    const { data: payment, error: findError } = await adminClient
      .from('payments')
      .select('*')
      .eq('reference', orderId)
      .single();

    if (findError || !payment) {
      console.error('Payment not found for webhook payload', findError);
      // Return 200 anyway to prevent Baray from retrying
      return NextResponse.json({ status: 'acknowledged', found: false });
    }

    // Check if already processed (idempotency)
    if (payment.status === 'completed') {
      console.log(JSON.stringify({
        event: 'payment_webhook_already_processed',
        paymentId: payment.id,
        at: new Date().toISOString(),
      }));
      return NextResponse.json({ status: 'already_processed' });
    }

    // Transaction-like ordering: grant entitlement first, then mark payment as completed.
    // This avoids a partial state where payment is "completed" but access was not granted.
    let entitlementError: unknown = null;
    const nowIso = new Date().toISOString();

    if (payment.content_type === 'movie' && payment.content_id && payment.user_id) {
      const { error: purchaseError } = await adminClient
        .from('purchases')
        .upsert({
          user_id: payment.user_id,
          content_id: payment.content_id,
          content_type: 'movie',
          purchased_at: nowIso,
        }, {
          onConflict: 'user_id,content_id',
        });
      entitlementError = purchaseError;
    } else if (payment.content_type === 'subscription' && payment.user_id) {
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1); // 1 month subscription
      const { error: subError } = await adminClient
        .from('subscriptions')
        .upsert({
          user_id: payment.user_id,
          type: 'series',
          status: 'active',
          expires_at: expiresAt.toISOString(),
        }, {
          onConflict: 'user_id',
        });
      entitlementError = subError;
    }

    if (entitlementError) {
      console.error('Failed to grant entitlement from webhook:', entitlementError);
      return NextResponse.json(
        { error: 'Failed to grant entitlement' },
        { status: 500 }
      );
    }

    // Mark as completed only after entitlement succeeds. Status guard keeps this idempotent.
    const { error: updateError } = await adminClient
      .from('payments')
      .update({
        status: 'completed',
        transaction_id: `${bankCode}-${Date.now()}`,
        completed_at: nowIso,
      })
      .eq('id', payment.id)
      .neq('status', 'completed');

    if (updateError) {
      console.error('Failed to update payment status:', updateError);
      return NextResponse.json(
        { error: 'Failed to update payment' },
        { status: 500 }
      );
    }

    console.log(JSON.stringify({
      event: 'payment_webhook_processed',
      paymentId: payment.id,
      at: new Date().toISOString(),
    }));

    // Respond with 200 OK as required by Baray
    return NextResponse.json({ status: 'success', order_id: orderId });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Allow GET for webhook verification (some services ping the URL)
export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'baray-webhook' });
}
