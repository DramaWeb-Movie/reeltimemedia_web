import { NextRequest, NextResponse } from 'next/server';
import { khqrClient } from '@/lib/khqr/client';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: { code: 'unauthorized', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { paymentId, qrId, reference } = body;

    if (!paymentId && !qrId && !reference) {
      return NextResponse.json(
        { success: false, error: { code: 'invalid_request', message: 'Payment ID, QR ID, or reference is required' } },
        { status: 400 }
      );
    }

    // Get payment record from database
    let query = supabase
      .from('payments')
      .select('*')
      .eq('user_id', user.id);

    if (paymentId) {
      query = query.eq('id', paymentId);
    } else if (qrId) {
      query = query.eq('qr_id', qrId);
    } else if (reference) {
      query = query.eq('reference', reference);
    }

    const { data: payment, error: dbError } = await query.single();

    if (dbError || !payment) {
      return NextResponse.json(
        { success: false, error: { code: 'payment_not_found', message: 'Payment record not found' } },
        { status: 404 }
      );
    }

    // If already completed, return success
    if (payment.status === 'completed') {
      return NextResponse.json({
        success: true,
        data: {
          status: 'completed',
          payment,
        },
      });
    }

    // Check transaction status via KHQR API if transaction_id exists
    if (payment.transaction_id) {
      const txResult = await khqrClient.getTransaction(payment.transaction_id);
      
      if (txResult.success && txResult.data) {
        // Update payment status in database
        if (txResult.data.status === 'completed' && payment.status !== 'completed') {
          const { error: updateError } = await supabase
            .from('payments')
            .update({
              status: 'completed',
              completed_at: txResult.data.completed_at || new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', payment.id);

          if (!updateError) {
            // Grant access to content
            await grantContentAccess(supabase, user.id, payment.content_type, payment.content_id);
          }

          return NextResponse.json({
            success: true,
            data: {
              status: 'completed',
              payment: {
                ...payment,
                status: 'completed',
                completed_at: txResult.data.completed_at,
              },
            },
          });
        }

        return NextResponse.json({
          success: true,
          data: {
            status: txResult.data.status,
            payment,
          },
        });
      }
    }

    // Return current status
    return NextResponse.json({
      success: true,
      data: {
        status: payment.status,
        payment,
      },
    });

  } catch (error: any) {
    console.error('Verify payment error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: 'internal_error', 
          message: error.message || 'An internal error occurred' 
        } 
      },
      { status: 500 }
    );
  }
}

/**
 * Grant user access to purchased content
 */
async function grantContentAccess(
  supabase: any,
  userId: string,
  contentType: string,
  contentId?: string
) {
  try {
    if (contentType === 'subscription') {
      // Grant subscription access (30 days)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      await supabase
        .from('subscriptions')
        .upsert({
          user_id: userId,
          type: 'series',
          status: 'active',
          expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        });
    } else if (contentType === 'movie' && contentId) {
      // Grant movie access (permanent)
      await supabase
        .from('purchases')
        .insert({
          user_id: userId,
          content_type: 'movie',
          content_id: contentId,
          purchased_at: new Date().toISOString(),
        })
        .onConflict('user_id,content_id')
        .ignore();
    }
  } catch (error) {
    console.error('Grant access error:', error);
    // Don't throw - payment is still valid even if access grant fails
  }
}
