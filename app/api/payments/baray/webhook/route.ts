import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { processWebhook, BarayWebhookPayload } from '@/lib/baray';

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

    console.log(`Payment confirmed for order ${orderId} via ${bankCode}`);

    // Get admin client to bypass RLS
    const adminClient = createAdminClient();

    // Find the payment record by order_id (stored in reference field)
    const { data: payment, error: findError } = await adminClient
      .from('payments')
      .select('*')
      .eq('reference', orderId)
      .single();

    if (findError || !payment) {
      console.error('Payment not found for order:', orderId, findError);
      // Return 200 anyway to prevent Baray from retrying
      return NextResponse.json({ status: 'acknowledged', found: false });
    }

    // Check if already processed (idempotency)
    if (payment.status === 'completed') {
      console.log('Payment already processed:', orderId);
      return NextResponse.json({ status: 'already_processed' });
    }

    // Update payment status to completed
    const { error: updateError } = await adminClient
      .from('payments')
      .update({
        status: 'completed',
        transaction_id: `${bankCode}-${Date.now()}`,
        completed_at: new Date().toISOString(),
      })
      .eq('id', payment.id);

    if (updateError) {
      console.error('Failed to update payment status:', updateError);
      return NextResponse.json(
        { error: 'Failed to update payment' },
        { status: 500 }
      );
    }

    // Handle content access based on payment type
    if (payment.content_type === 'movie' && payment.content_id && payment.user_id) {
      // Grant access to purchased movie
      const { error: purchaseError } = await adminClient
        .from('purchases')
        .upsert({
          user_id: payment.user_id,
          content_id: payment.content_id,
          content_type: 'movie',
          purchased_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,content_id',
        });

      if (purchaseError) {
        console.error('Failed to create purchase record:', purchaseError);
      }
    } else if (payment.content_type === 'subscription' && payment.user_id) {
      // Create or extend subscription
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

      if (subError) {
        console.error('Failed to create subscription:', subError);
      }
    }

    console.log(`Successfully processed payment for order ${orderId}`);

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
