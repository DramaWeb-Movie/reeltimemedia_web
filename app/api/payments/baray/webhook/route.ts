import { NextRequest } from 'next/server';
import { jsonNoStore } from '@/lib/api/json';
import { createAdminClient } from '@/lib/supabase/admin';
import { processWebhook } from '@/lib/baray';
import { enforceRateLimit } from '@/lib/api/rateLimit';
import {
  grantBarayEntitlement,
  logBarayEvent,
  markBarayPaymentCompleted,
  parseBarayWebhookBody,
  type BarayPaymentRecord,
} from '@/lib/baray/server';
import { timingSafeEqualText } from '@/lib/security/timingSafeEqual';

function getConfiguredWebhookSecret(): string | null {
  const secret = process.env.BARAY_WEBHOOK_SECRET?.trim() ?? '';
  if (secret) return secret;

  if (process.env.NODE_ENV === 'production') {
    throw new Error('BARAY_WEBHOOK_SECRET is required in production');
  }

  return null;
}

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
  const blocked = await enforceRateLimit(
    request,
    {
    namespace: 'api:payments:baray:webhook',
    max: 90,
    windowMs: 60 * 1000,
    blockMs: 5 * 60 * 1000,
    },
    { type: 'json', body: { error: 'Too many requests' } }
  );
  if (blocked) return blocked;

  try {
    // Verify webhook secret header if BARAY_WEBHOOK_SECRET is configured.
    // In production this secret is required so fulfillment is never left unauthenticated.
    const webhookSecret = getConfiguredWebhookSecret();
    if (webhookSecret) {
      const incomingSecret = request.headers.get('x-webhook-secret')?.trim() ?? '';
      if (!incomingSecret || !timingSafeEqualText(incomingSecret, webhookSecret)) {
        console.warn('Webhook rejected: invalid or missing x-webhook-secret header');
        return jsonNoStore({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const parsed = parseBarayWebhookBody(await request.json());
    if (!parsed.ok) {
      console.error('Invalid webhook payload: missing required fields');
      return parsed.response;
    }
    const { encryptedOrderId, bank } = parsed.data;

    // Decrypt the order ID
    let orderId: string;
    let bankCode: string;
    
    try {
      const result = processWebhook(
        encryptedOrderId,
        bank
      );
      orderId = result.order_id;
      bankCode = result.bank;
    } catch (decryptError) {
      console.error('Failed to decrypt order_id:', decryptError);
      return jsonNoStore(
        { error: 'Failed to decrypt payload' },
        { status: 401 }
      );
    }

    logBarayEvent('payment_webhook_received', { bank: bankCode });

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
      return jsonNoStore({ status: 'acknowledged', found: false });
    }

    // Check if already processed (idempotency)
    if (payment.status === 'completed') {
      logBarayEvent('payment_webhook_already_processed', { paymentId: payment.id });
      return jsonNoStore({ status: 'already_processed' });
    }

    // Transaction-like ordering: grant entitlement first, then mark payment as completed.
    // This avoids a partial state where payment is "completed" but access was not granted.
    const nowIso = new Date().toISOString();
    const paymentRecord = payment as BarayPaymentRecord;
    const entitlementError = await grantBarayEntitlement(adminClient, paymentRecord, nowIso);

    if (entitlementError) {
      console.error('Failed to grant entitlement from webhook:', entitlementError);
      return jsonNoStore(
        { error: 'Failed to grant entitlement' },
        { status: 500 }
      );
    }

    // Mark as completed only after entitlement succeeds. Status guard keeps this idempotent.
    const updateError = await markBarayPaymentCompleted(
      adminClient,
      paymentRecord.id,
      bankCode,
      nowIso
    );

    if (updateError) {
      console.error('Failed to update payment status:', updateError);
      return jsonNoStore(
        { error: 'Failed to update payment' },
        { status: 500 }
      );
    }

    logBarayEvent('payment_webhook_processed', { paymentId: paymentRecord.id });

    // Respond with 200 OK as required by Baray
    return jsonNoStore({ status: 'success', order_id: orderId });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return jsonNoStore(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Allow GET for webhook verification (some services ping the URL)
export async function GET() {
  return jsonNoStore({ status: 'ok', service: 'baray-webhook' });
}
