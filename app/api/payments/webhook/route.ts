import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { KHQRWebhookPayload } from '@/lib/khqr/types';

/**
 * KHQR Webhook Handler
 * Receives payment notifications from KHQR system
 * 
 * Configure this webhook URL in your KHQR merchant dashboard:
 * https://yourdomain.com/api/payments/webhook
 */
export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature (implement based on KHQR documentation)
    // const signature = request.headers.get('x-khqr-signature');
    // if (!verifyWebhookSignature(signature, body)) {
    //   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    // }

    const payload: KHQRWebhookPayload = await request.json();

    console.log('KHQR webhook received:', payload);

    // Create Supabase client with service role for webhook
    const supabase = await createClient();

    // Find payment by QR ID or reference
    const { data: payment, error: findError } = await supabase
      .from('payments')
      .select('*')
      .eq('qr_id', payload.qr_id)
      .single();

    if (findError || !payment) {
      console.error('Payment not found for webhook:', payload.qr_id);
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // Handle different webhook events
    switch (payload.event) {
      case 'payment.completed':
        await handlePaymentCompleted(supabase, payment, payload);
        break;
      
      case 'payment.failed':
        await handlePaymentFailed(supabase, payment, payload);
        break;
      
      case 'payment.expired':
        await handlePaymentExpired(supabase, payment, payload);
        break;
      
      default:
        console.warn('Unknown webhook event:', payload.event);
    }

    return NextResponse.json({ success: true, received: true });

  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handlePaymentCompleted(supabase: any, payment: any, payload: KHQRWebhookPayload) {
  try {
    // Update payment status
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        transaction_id: payload.transaction_id,
        status: 'completed',
        completed_at: payload.timestamp,
        updated_at: new Date().toISOString(),
      })
      .eq('id', payment.id);

    if (updateError) {
      console.error('Failed to update payment:', updateError);
      return;
    }

    // Grant content access
    if (payment.content_type === 'subscription') {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      await supabase
        .from('subscriptions')
        .upsert({
          user_id: payment.user_id,
          type: 'series',
          status: 'active',
          expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        });
    } else if (payment.content_type === 'movie' && payment.content_id) {
      await supabase
        .from('purchases')
        .insert({
          user_id: payment.user_id,
          content_type: 'movie',
          content_id: payment.content_id,
          purchased_at: new Date().toISOString(),
        });
    }

    console.log('Payment completed and access granted:', payment.id);
  } catch (error) {
    console.error('Error handling payment completion:', error);
  }
}

async function handlePaymentFailed(supabase: any, payment: any, payload: KHQRWebhookPayload) {
  try {
    await supabase
      .from('payments')
      .update({
        transaction_id: payload.transaction_id,
        status: 'failed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', payment.id);

    console.log('Payment failed:', payment.id);
  } catch (error) {
    console.error('Error handling payment failure:', error);
  }
}

async function handlePaymentExpired(supabase: any, payment: any, payload: KHQRWebhookPayload) {
  try {
    await supabase
      .from('payments')
      .update({
        status: 'expired',
        updated_at: new Date().toISOString(),
      })
      .eq('id', payment.id);

    console.log('Payment expired:', payment.id);
  } catch (error) {
    console.error('Error handling payment expiration:', error);
  }
}
