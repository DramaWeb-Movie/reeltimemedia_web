// Baray Payment API Types

export interface BarayCredentials {
  apiKey: string;
  secretKey: string; // Base64 encoded, 32 bytes
  iv: string; // Base64 encoded, 16 bytes
}

export interface BarayPaymentPayload {
  amount: string;
  currency: 'USD' | 'KHR';
  order_id: string;
  tracking?: {
    customer_id?: string;
    product?: string;
    content_type?: string;
    content_id?: string;
    [key: string]: string | undefined;
  };
  order_details?: {
    items: Array<{
      name: string;
      price: number;
    }>;
  };
  custom_success_url?: string;
  custom_cancel_url?: string;
}

export interface BarayIntentResponse {
  _id: string; // Intent ID (itn-xxx)
  org_id: string;
  order_id: string;
  amount: string;
  currency: string;
  target: 'DEVELOPMENT' | 'PRODUCTION' | 'UAT';
  tracking?: Record<string, string>;
  created_at: string;
}

export interface BarayWebhookPayload {
  encrypted_order_id: string;
  bank: 'aba' | 'acleda' | 'spn' | 'wing';
}

export interface BarayPaymentResult {
  success: boolean;
  intent_id?: string;
  payment_url?: string;
  error?: string;
}
