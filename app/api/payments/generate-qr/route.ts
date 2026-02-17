import { NextRequest, NextResponse } from 'next/server';
import { khqrClient } from '@/lib/khqr/client';
import { createClient } from '@/lib/supabase/server';

/**
 * Generate KHQR payload locally (for development/testing)
 */
function generateLocalKHQR(amount: number, currency: string, description: string, reference: string) {
  // Calculate CRC16-CCITT checksum
  function calculateCRC16(data: string): string {
    let crc = 0xFFFF;
    
    for (let i = 0; i < data.length; i++) {
      crc ^= data.charCodeAt(i) << 8;
      
      for (let j = 0; j < 8; j++) {
        if (crc & 0x8000) {
          crc = (crc << 1) ^ 0x1021;
        } else {
          crc = crc << 1;
        }
      }
    }
    
    crc = crc & 0xFFFF;
    return crc.toString(16).toUpperCase().padStart(4, '0');
  }

  // Format TLV (Tag-Length-Value)
  function formatTLV(tag: string, value: string): string {
    const length = value.length.toString().padStart(2, '0');
    return `${tag}${length}${value}`;
  }

  // Build KHQR payload
  let payload = '';
  
  // Payload Format Indicator
  payload += formatTLV('00', '01');
  
  // Point of Initiation Method (Dynamic)
  payload += formatTLV('01', '12');
  
  // Merchant Account Information (Bakong)
  let merchantInfo = '';
  merchantInfo += formatTLV('00', 'kh.gov.nbc.bakong');
  merchantInfo += formatTLV('01', process.env.KHQR_MERCHANT_ID || '000123456789');
  payload += formatTLV('29', merchantInfo);
  
  // Transaction Currency
  const currencyCode = currency === 'USD' ? '840' : '116';
  payload += formatTLV('53', currencyCode);
  
  // Transaction Amount
  const amountStr = amount.toFixed(2);
  payload += formatTLV('54', amountStr);
  
  // Country Code
  payload += formatTLV('58', 'KH');
  
  // Merchant Name
  const merchantName = process.env.KHQR_MERCHANT_NAME || 'ReelTime Media';
  payload += formatTLV('59', merchantName.substring(0, 25));
  
  // Merchant City
  const merchantCity = process.env.KHQR_MERCHANT_CITY || 'Phnom Penh';
  payload += formatTLV('60', merchantCity.substring(0, 15));
  
  // Additional Data
  let additionalData = '';
  additionalData += formatTLV('01', reference.substring(0, 25));
  additionalData += formatTLV('08', description.substring(0, 25));
  payload += formatTLV('62', additionalData);
  
  // CRC
  payload += '6304';
  const crc = calculateCRC16(payload);
  payload = payload.slice(0, -4) + formatTLV('63', crc);

  const qrId = `QR-LOCAL-${Date.now()}`;

  return {
    success: true,
    data: {
      qr_id: qrId,
      qr_data: payload,
      image_url: '', // No styled image in local mode
      amount,
      currency,
      reference,
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    },
  };
}

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
    const { 
      amount, 
      currency = 'USD', 
      contentType, 
      contentId, 
      contentTitle 
    } = body;

    // Validate required fields
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: { code: 'invalid_amount', message: 'Valid amount is required' } },
        { status: 400 }
      );
    }

    if (!contentType || !['movie', 'subscription'].includes(contentType)) {
      return NextResponse.json(
        { success: false, error: { code: 'invalid_content_type', message: 'Valid content type is required' } },
        { status: 400 }
      );
    }

    if (!contentTitle) {
      return NextResponse.json(
        { success: false, error: { code: 'invalid_content_title', message: 'Content title is required' } },
        { status: 400 }
      );
    }

    // Generate unique reference
    const timestamp = Date.now();
    const reference = `RTL-${contentType.toUpperCase()}-${contentId || 'SUB'}-${timestamp}`;

    // Check if KHQR API key is configured
    const hasApiKey = process.env.KHQR_API_KEY && process.env.KHQR_API_KEY !== 'sk_test_your_khqr_api_key_here';

    let qrResult;

    if (hasApiKey) {
      // Try to use real KHQR API
      try {
        qrResult = await khqrClient.generateQR({
          amount,
          currency: currency.toUpperCase(),
          description: `ReelTime - ${contentTitle}`,
          reference,
        });

        if (!qrResult.success || !qrResult.data) {
          throw new Error('KHQR API failed');
        }
      } catch (apiError) {
        console.error('KHQR API error, falling back to local generation:', apiError);
        qrResult = generateLocalKHQR(amount, currency, contentTitle, reference);
      }
    } else {
      // Development mode: Generate QR locally
      console.log('KHQR API key not configured, using local generation');
      qrResult = generateLocalKHQR(amount, currency, contentTitle, reference);
    }

    if (!qrResult.success || !qrResult.data) {
      return NextResponse.json(
        { 
          success: false, 
          error: qrResult.error || { code: 'generation_failed', message: 'Failed to generate QR code' }
        },
        { status: 500 }
      );
    }

    // Store payment record in database
    const { data: paymentRecord, error: dbError } = await supabase
      .from('payments')
      .insert({
        user_id: user.id,
        qr_id: qrResult.data.qr_id,
        content_type: contentType,
        content_id: contentId,
        content_title: contentTitle,
        amount,
        currency: currency.toUpperCase(),
        status: 'pending',
        reference,
        payment_method: 'khqr',
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      // Continue even if DB insert fails - QR is still valid
    }

    return NextResponse.json({
      success: true,
      data: {
        ...qrResult.data,
        payment_id: paymentRecord?.id,
      },
    });

  } catch (error: any) {
    console.error('Generate QR error:', error);
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
