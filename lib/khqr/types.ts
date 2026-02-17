/**
 * KHQR Payment Integration Types
 */

export interface KHQRGenerateRequest {
  amount: number;
  currency: 'KHR' | 'USD';
  description?: string;
  reference?: string;
}

export interface KHQRGenerateResponse {
  success: boolean;
  data?: {
    qr_id: string;
    qr_data: string;
    image_url: string;
    amount: number;
    currency: string;
    reference: string;
    expires_at: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface KHQRTransaction {
  id: string;
  qr_id: string;
  status: 'pending' | 'completed' | 'failed' | 'expired';
  amount: number;
  currency: string;
  description?: string;
  reference?: string;
  payer_name?: string;
  payer_phone?: string;
  completed_at?: string;
  created_at: string;
}

export interface KHQRTransactionResponse {
  success: boolean;
  data?: KHQRTransaction;
  error?: {
    code: string;
    message: string;
  };
}

export interface KHQRWebhookPayload {
  event: 'payment.completed' | 'payment.failed' | 'payment.expired';
  transaction_id: string;
  qr_id: string;
  amount: number;
  currency: string;
  reference: string;
  status: string;
  payer_name?: string;
  payer_phone?: string;
  timestamp: string;
}

export interface PaymentRecord {
  id: string;
  user_id: string;
  qr_id: string;
  transaction_id?: string;
  content_type: 'movie' | 'subscription';
  content_id?: string;
  content_title: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'expired';
  reference: string;
  payment_method: 'khqr';
  created_at: string;
  updated_at: string;
  completed_at?: string;
}
